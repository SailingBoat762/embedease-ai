"""邮箱密码认证业务逻辑"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.core.config import settings
from app.core.logging import get_logger
from app.models.admin import Admin
from app.models.refresh_token import RefreshToken
from app.models.user import User

logger = get_logger("auth_service")

# 管理员登录失败锁定配置
MAX_FAIL_COUNT = 5
LOCK_DURATION_MINUTES = 15


class AuthError(Exception):
    """认证错误基类"""

    def __init__(self, message: str, status_code: int = 401) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ──────────────────────────────────────────────────────────
# 用户认证
# ──────────────────────────────────────────────────────────


class UserAuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, email: str, password: str, name: str | None = None) -> User:
        """注册新用户"""
        stmt = select(User).where(User.email == email)
        existing = await self.db.scalar(stmt)
        if existing:
            raise AuthError("该邮箱已被注册", status_code=409)

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(password),
            name=name,
        )
        self.db.add(user)
        await self.db.flush()
        logger.info("用户注册成功", user_id=user.id, email=email)
        return user

    async def login(self, email: str, password: str) -> User:
        """邮箱密码登录"""
        stmt = select(User).where(User.email == email)
        user = await self.db.scalar(stmt)

        if not user or not user.password_hash:
            raise AuthError("邮箱或密码错误")

        if not verify_password(password, user.password_hash):
            raise AuthError("邮箱或密码错误")

        if not user.is_active:
            raise AuthError("账号已被禁用", status_code=403)

        user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.flush()
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        return await self.db.scalar(select(User).where(User.id == user_id))


# ──────────────────────────────────────────────────────────
# 管理员认证
# ──────────────────────────────────────────────────────────


class AdminAuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def login(self, email: str, password: str) -> Admin:
        """管理员邮箱密码登录"""
        stmt = select(Admin).where(Admin.email == email)
        admin = await self.db.scalar(stmt)

        if not admin or not admin.password_hash:
            raise AuthError("邮箱或密码错误")

        if not admin.is_active:
            raise AuthError("账号已被禁用", status_code=403)

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # 检查是否被锁定
        if admin.locked_until and admin.locked_until > now:
            remaining = int((admin.locked_until - now).total_seconds() / 60) + 1
            raise AuthError(f"账号已锁定，请 {remaining} 分钟后再试", status_code=429)

        if not verify_password(password, admin.password_hash):
            admin.login_fail_count += 1
            if admin.login_fail_count >= MAX_FAIL_COUNT:
                admin.locked_until = now + timedelta(minutes=LOCK_DURATION_MINUTES)
                await self.db.flush()
                raise AuthError(
                    f"密码错误次数过多，账号已锁定 {LOCK_DURATION_MINUTES} 分钟",
                    status_code=429,
                )
            await self.db.flush()
            raise AuthError("邮箱或密码错误")

        # 登录成功，重置失败计数
        admin.login_fail_count = 0
        admin.locked_until = None
        admin.last_login_at = now
        await self.db.flush()
        return admin

    async def get_by_id(self, admin_id: str) -> Admin | None:
        return await self.db.scalar(select(Admin).where(Admin.id == admin_id))

    async def create_admin(
        self,
        email: str,
        password: str,
        name: str | None = None,
        role: str = "admin",
    ) -> Admin:
        """创建管理员账号"""
        stmt = select(Admin).where(Admin.email == email)
        existing = await self.db.scalar(stmt)
        if existing:
            raise AuthError("该邮箱已被注册", status_code=409)

        admin = Admin(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(password),
            name=name,
            role=role,
        )
        self.db.add(admin)
        await self.db.flush()
        logger.info("管理员创建成功", admin_id=admin.id, email=email, role=role)
        return admin


# ──────────────────────────────────────────────────────────
# Refresh Token 管理
# ──────────────────────────────────────────────────────────


class RefreshTokenService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, subject_id: str, subject_type: str) -> str:
        """创建 Refresh Token，返回原始 token 字符串（存 Cookie）"""
        raw_token, token_hash = create_refresh_token()
        expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        rt = RefreshToken(
            id=str(uuid.uuid4()),
            subject_id=subject_id,
            token_hash=token_hash,
            subject_type=subject_type,
            expires_at=expires_at,
        )
        self.db.add(rt)
        await self.db.flush()
        return raw_token

    async def validate_and_rotate(
        self, raw_token: str
    ) -> tuple[str, str] | None:
        """验证 Refresh Token 并轮换（旧 token 吊销，返回新 token）

        Returns:
            (subject_id, subject_type) 或 None（无效）
        """
        token_hash = hash_refresh_token(raw_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        rt = await self.db.scalar(stmt)

        if not rt or not rt.is_valid:
            return None

        # 吊销旧 token
        rt.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.flush()
        return rt.subject_id, rt.subject_type

    async def revoke_by_raw(self, raw_token: str) -> bool:
        """吊销指定 Refresh Token"""
        token_hash = hash_refresh_token(raw_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        rt = await self.db.scalar(stmt)
        if not rt or rt.revoked_at is not None:
            return False
        rt.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.flush()
        return True

    async def revoke_all_for_subject(self, subject_id: str, subject_type: str) -> int:
        """吊销某用户/管理员的所有 Refresh Token（注销所有设备）"""
        from sqlalchemy import update

        stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.subject_id == subject_id,
                RefreshToken.subject_type == subject_type,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc).replace(tzinfo=None))
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount


# ──────────────────────────────────────────────────────────
# 颁发 Token 的统一入口
# ──────────────────────────────────────────────────────────


def build_access_token_for_user(user: User) -> str:
    return create_access_token(subject=user.id, token_type="user")


def build_access_token_for_admin(admin: Admin) -> str:
    return create_access_token(subject=admin.id, token_type="admin", role=admin.role)
