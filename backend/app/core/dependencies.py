"""FastAPI 依赖注入

最佳实践：
1. 路由层使用 Depends(get_db_session) 获取会话
2. 服务层通过 ServiceContainer 统一管理
3. WebSocket handlers 使用 get_services() 上下文管理器
4. 后台任务使用 get_db_context()（无 request 上下文）
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import TYPE_CHECKING

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, get_db_context

if TYPE_CHECKING:
    from app.models.admin import Admin
    from app.models.user import User
    from app.repositories.conversation import ConversationRepository
    from app.repositories.message import MessageRepository
    from app.services.conversation import ConversationService
    from app.services.support.handoff import HandoffService

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话（用于 FastAPI 路由依赖注入）"""
    async for session in get_db():
        yield session


@dataclass
class ServiceContainer:
    """服务容器 - 统一管理常用服务实例
    
    用途：
    - 减少代码重复（避免每个 handler 都创建服务实例）
    - 统一服务实例的生命周期管理
    - 便于单元测试（可 mock 整个容器）
    
    使用方式：
    ```python
    # 在 WebSocket handler 中
    async with get_services() as services:
        await services.conversation.add_message(...)
        await services.handoff.start_handoff(...)
    
    # 在 FastAPI 路由中
    def my_route(services: ServiceContainer = Depends(get_service_container)):
        ...
    ```
    """
    
    db: AsyncSession
    
    # Lazy-loaded services
    _conversation: "ConversationService | None" = None
    _handoff: "HandoffService | None" = None
    _message_repo: "MessageRepository | None" = None
    _conversation_repo: "ConversationRepository | None" = None
    
    @property
    def conversation(self) -> "ConversationService":
        """会话服务"""
        if self._conversation is None:
            from app.services.conversation import ConversationService
            self._conversation = ConversationService(self.db)
        return self._conversation
    
    @property
    def handoff(self) -> "HandoffService":
        """人工介入服务"""
        if self._handoff is None:
            from app.services.support.handoff import HandoffService
            self._handoff = HandoffService(self.db)
        return self._handoff
    
    @property
    def message_repo(self) -> "MessageRepository":
        """消息仓库"""
        if self._message_repo is None:
            from app.repositories.message import MessageRepository
            self._message_repo = MessageRepository(self.db)
        return self._message_repo
    
    @property
    def conversation_repo(self) -> "ConversationRepository":
        """会话仓库"""
        if self._conversation_repo is None:
            from app.repositories.conversation import ConversationRepository
            self._conversation_repo = ConversationRepository(self.db)
        return self._conversation_repo


@asynccontextmanager
async def get_services() -> AsyncGenerator[ServiceContainer, None]:
    """获取服务容器（上下文管理器）
    
    用于 WebSocket handlers 和其他非路由代码。
    会话在退出时自动提交/回滚。
    
    示例：
    ```python
    async with get_services() as services:
        await services.conversation.add_message(...)
    ```
    """
    async with get_db_context() as session:
        yield ServiceContainer(db=session)


async def get_service_container(
    db: AsyncSession = Depends(get_db_session),
) -> ServiceContainer:
    """获取服务容器（用于 FastAPI 路由依赖注入）
    
    示例：
    ```python
    @router.post("/chat")
    async def chat(services: ServiceContainer = Depends(get_service_container)):
        await services.conversation.add_message(...)
    ```
    """
    return ServiceContainer(db=db)


# ──────────────────────────────────────────────────────────
# 鉴权依赖
# ──────────────────────────────────────────────────────────


def _extract_token(credentials: HTTPAuthorizationCredentials | None) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="未提供认证 Token")
    return credentials.credentials


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> "User":
    """验证 Access Token，返回当前用户（普通用户接口使用）"""
    from app.core.auth import decode_access_token
    from app.models.user import User

    token = _extract_token(credentials)
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token 无效")

    if payload.get("type") != "user":
        raise HTTPException(status_code=401, detail="Token 类型错误")

    from sqlalchemy import select
    user = await db.scalar(select(User).where(User.id == payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")
    return user


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> "Admin":
    """验证 Access Token，返回当前管理员（管理后台接口使用）"""
    from app.core.auth import decode_access_token
    from app.models.admin import Admin

    token = _extract_token(credentials)
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token 无效")

    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="需要管理员权限")

    from sqlalchemy import select
    admin = await db.scalar(select(Admin).where(Admin.id == payload["sub"]))
    if not admin:
        raise HTTPException(status_code=401, detail="管理员不存在")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")
    return admin


async def require_super_admin(
    admin: "Admin" = Depends(get_current_admin),
) -> "Admin":
    """要求超级管理员权限"""
    if admin.role != "super_admin":
        raise HTTPException(status_code=403, detail="需要超级管理员权限")
    return admin


async def get_current_user_ws(token: str, db: AsyncSession) -> "User":
    """WebSocket 鉴权（从 query param 获取 token）"""
    from app.core.auth import decode_access_token
    from app.models.user import User
    from sqlalchemy import select

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token 无效")

    if payload.get("type") != "user":
        raise HTTPException(status_code=401, detail="Token 类型错误")

    user = await db.scalar(select(User).where(User.id == payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已禁用")
    return user


async def get_current_admin_ws(token: str, db: AsyncSession) -> "Admin":
    """WebSocket 管理员鉴权"""
    from app.core.auth import decode_access_token
    from app.models.admin import Admin
    from sqlalchemy import select

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token 无效")

    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="需要管理员权限")

    admin = await db.scalar(select(Admin).where(Admin.id == payload["sub"]))
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="管理员不存在或已禁用")
    return admin
