"""认证路由（邮箱密码 + OIDC SSO）"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_db_session
from app.core.logging import get_logger
from app.schemas.auth import (
    AdminLoginRequest,
    OIDCProviderAdminResponse,
    OIDCProviderCreate,
    OIDCProviderPublic,
    OIDCProviderUpdate,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services.auth_service import (
    AdminAuthService,
    AuthError,
    RefreshTokenService,
    UserAuthService,
    build_access_token_for_admin,
    build_access_token_for_user,
)
from app.services.oidc_service import OIDCService

logger = get_logger("router.auth")

router = APIRouter(prefix="/api/v1", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
ADMIN_REFRESH_COOKIE_NAME = "admin_refresh_token"
COOKIE_MAX_AGE = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400


def _set_refresh_cookie(response: Response, token: str, cookie_name: str) -> None:
    response.set_cookie(
        key=cookie_name,
        value=token,
        httponly=True,
        secure=False,  # 生产环境应为 True（HTTPS）
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _clear_refresh_cookie(response: Response, cookie_name: str) -> None:
    response.delete_cookie(key=cookie_name, path="/")


def _oidc_redirect_uri(request: Request, slug: str, role: str) -> str:
    """构建 OIDC 回调 URL（指向后端自身）"""
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/v1/auth/oidc/{slug}/callback?role={role}"


# ──────────────────────────────────────────────────────────
# 用户 - 邮箱密码
# ──────────────────────────────────────────────────────────


@router.post("/auth/register", response_model=TokenResponse)
async def user_register(
    body: UserRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """用户注册"""
    try:
        svc = UserAuthService(db)
        user = await svc.register(body.email, body.password, body.name)
        access_token = build_access_token_for_user(user)
        refresh_svc = RefreshTokenService(db)
        raw_refresh = await refresh_svc.create(user.id, "user")
        _set_refresh_cookie(response, raw_refresh, REFRESH_COOKIE_NAME)
        return TokenResponse(access_token=access_token, subject_type="user")
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/auth/login", response_model=TokenResponse)
async def user_login(
    body: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """用户登录"""
    try:
        svc = UserAuthService(db)
        user = await svc.login(body.email, body.password)
        access_token = build_access_token_for_user(user)
        refresh_svc = RefreshTokenService(db)
        raw_refresh = await refresh_svc.create(user.id, "user")
        _set_refresh_cookie(response, raw_refresh, REFRESH_COOKIE_NAME)
        return TokenResponse(access_token=access_token, subject_type="user")
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/auth/refresh", response_model=TokenResponse)
async def user_refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """用 Refresh Token Cookie 换新 Access Token"""
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(status_code=401, detail="未提供 Refresh Token")

    rt_svc = RefreshTokenService(db)
    result = await rt_svc.validate_and_rotate(raw_refresh)
    if not result:
        _clear_refresh_cookie(response, REFRESH_COOKIE_NAME)
        raise HTTPException(status_code=401, detail="Refresh Token 无效或已过期")

    subject_id, subject_type = result

    if subject_type == "user":
        user_svc = UserAuthService(db)
        user = await user_svc.get_by_id(subject_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="用户不存在或已禁用")
        access_token = build_access_token_for_user(user)
    else:
        raise HTTPException(status_code=401, detail="Token 类型错误，请使用管理员刷新接口")

    new_refresh = await rt_svc.create(subject_id, subject_type)
    _set_refresh_cookie(response, new_refresh, REFRESH_COOKIE_NAME)
    return TokenResponse(access_token=access_token, subject_type=subject_type)


@router.post("/auth/logout", status_code=204)
async def user_logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """注销（吊销 Refresh Token）"""
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh:
        rt_svc = RefreshTokenService(db)
        await rt_svc.revoke_by_raw(raw_refresh)
    _clear_refresh_cookie(response, REFRESH_COOKIE_NAME)


# ──────────────────────────────────────────────────────────
# 管理员 - 邮箱密码
# ──────────────────────────────────────────────────────────


@router.post("/admin/auth/login", response_model=TokenResponse)
async def admin_login(
    body: AdminLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """管理员登录"""
    try:
        svc = AdminAuthService(db)
        admin = await svc.login(body.email, body.password)
        access_token = build_access_token_for_admin(admin)
        refresh_svc = RefreshTokenService(db)
        raw_refresh = await refresh_svc.create(admin.id, "admin")
        _set_refresh_cookie(response, raw_refresh, ADMIN_REFRESH_COOKIE_NAME)
        return TokenResponse(access_token=access_token, subject_type="admin")
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/admin/auth/refresh", response_model=TokenResponse)
async def admin_refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """管理员刷新 Access Token"""
    raw_refresh = request.cookies.get(ADMIN_REFRESH_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(status_code=401, detail="未提供 Refresh Token")

    rt_svc = RefreshTokenService(db)
    result = await rt_svc.validate_and_rotate(raw_refresh)
    if not result:
        _clear_refresh_cookie(response, ADMIN_REFRESH_COOKIE_NAME)
        raise HTTPException(status_code=401, detail="Refresh Token 无效或已过期")

    subject_id, subject_type = result
    if subject_type != "admin":
        raise HTTPException(status_code=401, detail="Token 类型错误")

    admin_svc = AdminAuthService(db)
    admin = await admin_svc.get_by_id(subject_id)
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="管理员不存在或已禁用")

    access_token = build_access_token_for_admin(admin)
    new_refresh = await rt_svc.create(subject_id, subject_type)
    _set_refresh_cookie(response, new_refresh, ADMIN_REFRESH_COOKIE_NAME)
    return TokenResponse(access_token=access_token, subject_type="admin")


@router.post("/admin/auth/logout", status_code=204)
async def admin_logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    """管理员注销"""
    raw_refresh = request.cookies.get(ADMIN_REFRESH_COOKIE_NAME)
    if raw_refresh:
        rt_svc = RefreshTokenService(db)
        await rt_svc.revoke_by_raw(raw_refresh)
    _clear_refresh_cookie(response, ADMIN_REFRESH_COOKIE_NAME)


# ──────────────────────────────────────────────────────────
# OIDC SSO - 公共端点
# ──────────────────────────────────────────────────────────


@router.get("/auth/oidc/providers", response_model=list[OIDCProviderPublic])
async def list_oidc_providers(
    db: AsyncSession = Depends(get_db_session),
):
    """获取所有启用的 OIDC Provider（公开接口）"""
    svc = OIDCService(db)
    providers = await svc.list_providers(enabled_only=True)
    return [
        OIDCProviderPublic(
            id=p.id,
            name=p.name,
            slug=p.slug,
            target_role=p.target_role,
            is_enabled=p.is_enabled,
        )
        for p in providers
    ]


@router.get("/auth/oidc/{slug}/authorize")
async def oidc_authorize(
    slug: str,
    request: Request,
    role: str = "user",
    db: AsyncSession = Depends(get_db_session),
):
    """发起 OIDC 授权（重定向到 Provider）"""
    redirect_uri = _oidc_redirect_uri(request, slug, role)
    svc = OIDCService(db)
    try:
        auth_url = await svc.build_authorization_url(slug, role, redirect_uri)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RedirectResponse(url=auth_url)


@router.get("/auth/oidc/{slug}/callback")
async def oidc_callback(
    slug: str,
    request: Request,
    response: Response,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    role: str = "user",
    db: AsyncSession = Depends(get_db_session),
):
    """OIDC 回调处理，颁发内部 JWT，重定向前端"""
    if error:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?error={error}"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?error=missing_params"
        )

    redirect_uri = _oidc_redirect_uri(request, slug, role)
    svc = OIDCService(db)
    try:
        entity, subject_type = await svc.handle_callback(slug, code, state, redirect_uri)
    except Exception as e:
        logger.error("OIDC 回调处理失败", error=str(e), slug=slug)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?error=oidc_failed"
        )

    from app.services.auth_service import (
        RefreshTokenService,
        build_access_token_for_admin,
        build_access_token_for_user,
    )
    from app.models.user import User as UserModel
    from app.models.admin import Admin as AdminModel

    rt_svc = RefreshTokenService(db)

    if subject_type == "admin" and isinstance(entity, AdminModel):
        access_token = build_access_token_for_admin(entity)
        raw_refresh = await rt_svc.create(entity.id, "admin")
        cookie_name = ADMIN_REFRESH_COOKIE_NAME
        frontend_path = "/admin"
    else:
        access_token = build_access_token_for_user(entity)
        raw_refresh = await rt_svc.create(entity.id, "user")
        cookie_name = REFRESH_COOKIE_NAME
        frontend_path = "/chat"

    redirect_response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback?token={access_token}&type={subject_type}&next={frontend_path}"
    )
    redirect_response.set_cookie(
        key=cookie_name,
        value=raw_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    return redirect_response


# ──────────────────────────────────────────────────────────
# OIDC Provider 管理（需要 super_admin，由 dependencies 守卫）
# ──────────────────────────────────────────────────────────


@router.get("/admin/oidc-providers", response_model=list[OIDCProviderAdminResponse])
async def admin_list_oidc_providers(
    db: AsyncSession = Depends(get_db_session),
):
    """列出所有 OIDC Provider（管理端）"""
    svc = OIDCService(db)
    providers = await svc.list_providers(enabled_only=False)
    return [
        OIDCProviderAdminResponse(
            id=p.id,
            name=p.name,
            slug=p.slug,
            client_id=p.client_id,
            issuer_url=p.issuer_url,
            authorization_endpoint=p.authorization_endpoint,
            token_endpoint=p.token_endpoint,
            userinfo_endpoint=p.userinfo_endpoint,
            scopes=p.scopes,
            target_role=p.target_role,
            is_enabled=p.is_enabled,
        )
        for p in providers
    ]


@router.post("/admin/oidc-providers", response_model=OIDCProviderAdminResponse, status_code=201)
async def admin_create_oidc_provider(
    body: OIDCProviderCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """新增 OIDC Provider"""
    svc = OIDCService(db)
    try:
        provider = await svc.create_provider(body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return OIDCProviderAdminResponse(
        id=provider.id,
        name=provider.name,
        slug=provider.slug,
        client_id=provider.client_id,
        issuer_url=provider.issuer_url,
        authorization_endpoint=provider.authorization_endpoint,
        token_endpoint=provider.token_endpoint,
        userinfo_endpoint=provider.userinfo_endpoint,
        scopes=provider.scopes,
        target_role=provider.target_role,
        is_enabled=provider.is_enabled,
    )


@router.put("/admin/oidc-providers/{provider_id}", response_model=OIDCProviderAdminResponse)
async def admin_update_oidc_provider(
    provider_id: str,
    body: OIDCProviderUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """更新 OIDC Provider"""
    svc = OIDCService(db)
    try:
        provider = await svc.update_provider(
            provider_id, body.model_dump(exclude_none=True)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return OIDCProviderAdminResponse(
        id=provider.id,
        name=provider.name,
        slug=provider.slug,
        client_id=provider.client_id,
        issuer_url=provider.issuer_url,
        authorization_endpoint=provider.authorization_endpoint,
        token_endpoint=provider.token_endpoint,
        userinfo_endpoint=provider.userinfo_endpoint,
        scopes=provider.scopes,
        target_role=provider.target_role,
        is_enabled=provider.is_enabled,
    )


@router.delete("/admin/oidc-providers/{provider_id}", status_code=204)
async def admin_delete_oidc_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """删除 OIDC Provider"""
    svc = OIDCService(db)
    deleted = await svc.delete_provider(provider_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Provider 不存在")
