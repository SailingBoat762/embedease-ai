"""认证相关 Pydantic Schema"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


# ──────────────────────────────────────────────────────────
# 通用 Token
# ──────────────────────────────────────────────────────────


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    subject_type: str  # 'user' | 'admin'


# ──────────────────────────────────────────────────────────
# 用户认证
# ──────────────────────────────────────────────────────────


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, max_length=100)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserMeResponse(BaseModel):
    id: str
    email: str
    name: str | None
    subject_type: str = "user"


# ──────────────────────────────────────────────────────────
# 管理员认证
# ──────────────────────────────────────────────────────────


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminMeResponse(BaseModel):
    id: str
    email: str
    name: str | None
    role: str
    subject_type: str = "admin"


# ──────────────────────────────────────────────────────────
# OIDC Provider
# ──────────────────────────────────────────────────────────


class OIDCProviderPublic(BaseModel):
    """前端展示用（不含 secret）"""
    id: str
    name: str
    slug: str
    target_role: str
    is_enabled: bool


class OIDCProviderCreate(BaseModel):
    name: str = Field(max_length=100)
    slug: str = Field(max_length=50, pattern=r"^[a-z0-9-]+$")
    client_id: str = Field(max_length=255)
    client_secret: str
    issuer_url: str | None = None
    authorization_endpoint: str
    token_endpoint: str
    userinfo_endpoint: str | None = None
    scopes: str = "openid email profile"
    target_role: str = Field(default="user", pattern=r"^(user|admin|both)$")
    is_enabled: bool = True


class OIDCProviderUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    client_id: str | None = None
    client_secret: str | None = None
    issuer_url: str | None = None
    authorization_endpoint: str | None = None
    token_endpoint: str | None = None
    userinfo_endpoint: str | None = None
    scopes: str | None = None
    target_role: str | None = Field(default=None, pattern=r"^(user|admin|both)$")
    is_enabled: bool | None = None


class OIDCProviderDetail(OIDCProviderCreate):
    """管理端详情（含 client_id，不含 secret）"""
    id: str
    client_secret: str = Field(exclude=True, default="")  # 不返回
    client_id: str


class OIDCAuthorizeResponse(BaseModel):
    authorization_url: str


class OIDCProviderAdminResponse(BaseModel):
    """管理端 Provider 列表"""
    id: str
    name: str
    slug: str
    client_id: str
    issuer_url: str | None
    authorization_endpoint: str
    token_endpoint: str
    userinfo_endpoint: str | None
    scopes: str
    target_role: str
    is_enabled: bool
