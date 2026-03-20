"""OIDC / OAuth2 流程业务逻辑"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import decrypt_secret, encrypt_secret
from app.core.config import settings
from app.core.logging import get_logger
from app.models.admin import Admin
from app.models.oauth_account import OAuthAccount
from app.models.oidc_provider import OIDCProvider
from app.models.user import User

logger = get_logger("oidc_service")

# 内存存储 OIDC state（生产可换 Redis）
# key: state, value: {"nonce": ..., "provider_slug": ..., "role": ..., "created_at": ...}
_state_store: dict[str, dict[str, Any]] = {}
_STATE_TTL_SECONDS = 600  # 10 分钟


def _cleanup_expired_states() -> None:
    import time
    now = time.time()
    expired = [k for k, v in _state_store.items() if now - v["created_at"] > _STATE_TTL_SECONDS]
    for k in expired:
        del _state_store[k]


class OIDCService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ──────────────────────────────────────────────────────
    # Provider 管理
    # ──────────────────────────────────────────────────────

    async def list_providers(self, enabled_only: bool = True) -> list[OIDCProvider]:
        stmt = select(OIDCProvider)
        if enabled_only:
            stmt = stmt.where(OIDCProvider.is_enabled == True)  # noqa: E712
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_provider(self, provider_id: str) -> OIDCProvider | None:
        return await self.db.scalar(
            select(OIDCProvider).where(OIDCProvider.id == provider_id)
        )

    async def get_provider_by_slug(self, slug: str) -> OIDCProvider | None:
        return await self.db.scalar(
            select(OIDCProvider).where(OIDCProvider.slug == slug)
        )

    async def create_provider(self, data: dict[str, Any]) -> OIDCProvider:
        slug = data["slug"]
        existing = await self.get_provider_by_slug(slug)
        if existing:
            raise ValueError(f"Provider slug '{slug}' 已存在")

        client_secret = encrypt_secret(data["client_secret"])
        provider = OIDCProvider(
            id=str(uuid.uuid4()),
            name=data["name"],
            slug=slug,
            client_id=data["client_id"],
            client_secret=client_secret,
            issuer_url=data.get("issuer_url"),
            authorization_endpoint=data["authorization_endpoint"],
            token_endpoint=data["token_endpoint"],
            userinfo_endpoint=data.get("userinfo_endpoint"),
            scopes=data.get("scopes", "openid email profile"),
            target_role=data.get("target_role", "user"),
            is_enabled=data.get("is_enabled", True),
        )
        self.db.add(provider)
        await self.db.flush()
        logger.info("创建 OIDC Provider", slug=slug, name=data["name"])
        return provider

    async def update_provider(self, provider_id: str, data: dict[str, Any]) -> OIDCProvider:
        provider = await self.get_provider(provider_id)
        if not provider:
            raise ValueError("Provider 不存在")

        for field in ("name", "client_id", "issuer_url", "authorization_endpoint",
                      "token_endpoint", "userinfo_endpoint", "scopes", "target_role", "is_enabled"):
            if field in data and data[field] is not None:
                setattr(provider, field, data[field])

        if data.get("client_secret"):
            provider.client_secret = encrypt_secret(data["client_secret"])

        await self.db.flush()
        return provider

    async def delete_provider(self, provider_id: str) -> bool:
        provider = await self.get_provider(provider_id)
        if not provider:
            return False
        await self.db.delete(provider)
        await self.db.flush()
        return True

    # ──────────────────────────────────────────────────────
    # 授权流程
    # ──────────────────────────────────────────────────────

    async def build_authorization_url(
        self, slug: str, role: str, redirect_uri: str
    ) -> str:
        """生成 OAuth2 授权 URL，并在内存中保存 state"""
        provider = await self.get_provider_by_slug(slug)
        if not provider or not provider.is_enabled:
            raise ValueError(f"Provider '{slug}' 不存在或已禁用")

        _cleanup_expired_states()

        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)

        import time
        _state_store[state] = {
            "nonce": nonce,
            "provider_slug": slug,
            "role": role,
            "redirect_uri": redirect_uri,
            "created_at": time.time(),
        }

        scopes = provider.scopes or "openid email profile"
        params = {
            "client_id": provider.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": state,
        }
        if "openid" in scopes:
            params["nonce"] = nonce

        return f"{provider.authorization_endpoint}?{urlencode(params)}"

    # ──────────────────────────────────────────────────────
    # 回调处理
    # ──────────────────────────────────────────────────────

    async def handle_callback(
        self, slug: str, code: str, state: str, redirect_uri: str
    ) -> tuple[User | Admin, str]:
        """处理 OAuth2 回调

        Returns:
            (user_or_admin, subject_type)
        """
        import time

        # 验证 state
        state_data = _state_store.pop(state, None)
        if not state_data:
            raise ValueError("无效或已过期的 state")
        if time.time() - state_data["created_at"] > _STATE_TTL_SECONDS:
            raise ValueError("state 已过期")
        if state_data["provider_slug"] != slug:
            raise ValueError("state 与 provider 不匹配")

        provider = await self.get_provider_by_slug(slug)
        if not provider:
            raise ValueError("Provider 不存在")

        role_target = state_data["role"]  # 'user' | 'admin'

        # 用 code 换 Token
        client_secret = decrypt_secret(provider.client_secret)
        token_data = await self._exchange_code(
            provider=provider,
            code=code,
            redirect_uri=redirect_uri,
            client_secret=client_secret,
        )

        # 获取用户信息
        userinfo = await self._fetch_userinfo(provider, token_data.get("access_token", ""))

        sub = userinfo.get("sub") or userinfo.get("id") or userinfo.get("login")
        if not sub:
            raise ValueError("无法获取用户唯一标识")

        email = userinfo.get("email")
        name = userinfo.get("name") or userinfo.get("login")
        sub = str(sub)

        if role_target == "admin":
            entity, subject_type = await self._find_or_create_admin(
                provider=provider,
                sub=sub,
                email=email,
                name=name,
                access_token=token_data.get("access_token"),
            )
        else:
            entity, subject_type = await self._find_or_create_user(
                provider=provider,
                sub=sub,
                email=email,
                name=name,
                access_token=token_data.get("access_token"),
            )

        return entity, subject_type

    async def _exchange_code(
        self,
        provider: OIDCProvider,
        code: str,
        redirect_uri: str,
        client_secret: str,
    ) -> dict[str, Any]:
        """用 code 换 Token"""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                provider.token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": provider.client_id,
                    "client_secret": client_secret,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()

    async def _fetch_userinfo(
        self, provider: OIDCProvider, access_token: str
    ) -> dict[str, Any]:
        """获取用户信息"""
        if not provider.userinfo_endpoint:
            return {}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                provider.userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def _find_or_create_user(
        self,
        provider: OIDCProvider,
        sub: str,
        email: str | None,
        name: str | None,
        access_token: str | None,
    ) -> tuple[User, str]:
        """查找或创建普通用户"""
        # 先查 oauth_accounts
        stmt = select(OAuthAccount).where(
            OAuthAccount.provider_id == provider.id,
            OAuthAccount.subject == sub,
        )
        oauth_account = await self.db.scalar(stmt)

        if oauth_account and oauth_account.user_id:
            user = await self.db.scalar(select(User).where(User.id == oauth_account.user_id))
            if user:
                if access_token:
                    oauth_account.access_token = access_token
                await self.db.flush()
                return user, "user"

        # 尝试通过 email 匹配已有用户
        user: User | None = None
        if email:
            user = await self.db.scalar(select(User).where(User.email == email))

        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=name,
                is_active=True,
            )
            self.db.add(user)
            await self.db.flush()
            logger.info("OIDC 创建新用户", user_id=user.id, email=email, provider=provider.slug)

        # 创建/更新 oauth_account
        if oauth_account:
            oauth_account.user_id = user.id
            oauth_account.access_token = access_token
        else:
            oauth_account = OAuthAccount(
                id=str(uuid.uuid4()),
                provider_id=provider.id,
                subject=sub,
                email=email,
                user_id=user.id,
                access_token=access_token,
            )
            self.db.add(oauth_account)
        await self.db.flush()
        return user, "user"

    async def _find_or_create_admin(
        self,
        provider: OIDCProvider,
        sub: str,
        email: str | None,
        name: str | None,
        access_token: str | None,
    ) -> tuple[Admin, str]:
        """查找或创建管理员"""
        stmt = select(OAuthAccount).where(
            OAuthAccount.provider_id == provider.id,
            OAuthAccount.subject == sub,
        )
        oauth_account = await self.db.scalar(stmt)

        if oauth_account and oauth_account.admin_id:
            admin = await self.db.scalar(select(Admin).where(Admin.id == oauth_account.admin_id))
            if admin:
                if access_token:
                    oauth_account.access_token = access_token
                await self.db.flush()
                return admin, "admin"

        # 通过 email 匹配管理员
        admin: Admin | None = None
        if email:
            admin = await self.db.scalar(select(Admin).where(Admin.email == email))

        if not admin:
            admin = Admin(
                id=str(uuid.uuid4()),
                email=email or f"oidc_{sub}@{provider.slug}",
                name=name,
                role="admin",
                is_active=True,
            )
            self.db.add(admin)
            await self.db.flush()
            logger.info("OIDC 创建新管理员", admin_id=admin.id, email=email, provider=provider.slug)

        if oauth_account:
            oauth_account.admin_id = admin.id
            oauth_account.access_token = access_token
        else:
            oauth_account = OAuthAccount(
                id=str(uuid.uuid4()),
                provider_id=provider.id,
                subject=sub,
                email=email,
                admin_id=admin.id,
                access_token=access_token,
            )
            self.db.add(oauth_account)
        await self.db.flush()
        return admin, "admin"
