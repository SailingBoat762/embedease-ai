"""JWT 工具 + 密码哈希"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import settings


# ──────────────────────────────────────────────────────────
# 密码工具
# ──────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希"""
    # bcrypt 要求 bytes 输入
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码是否匹配"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ──────────────────────────────────────────────────────────
# JWT 工具
# ──────────────────────────────────────────────────────────

TokenType = Literal["user", "admin"]


def create_access_token(
    subject: str,
    token_type: TokenType,
    role: str | None = None,
    expires_delta: timedelta | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    """生成 Access Token

    Payload 结构:
        sub   - user_id 或 admin_id
        type  - "user" | "admin"
        role  - 管理员角色（仅 admin 有）
        exp   - 过期时间
        iat   - 签发时间
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if role is not None:
        payload["role"] = role
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token() -> tuple[str, str]:
    """生成 Refresh Token（随机字节）

    Returns:
        (raw_token, token_hash)
        - raw_token: 返回给客户端，存 HttpOnly Cookie
        - token_hash: 存数据库
    """
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, token_hash


def hash_refresh_token(raw_token: str) -> str:
    """对 Refresh Token 明文进行 SHA-256 哈希"""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def decode_access_token(token: str) -> dict[str, Any]:
    """解码并验证 Access Token

    Raises:
        jwt.ExpiredSignatureError: Token 已过期
        jwt.InvalidTokenError: Token 无效
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


# ──────────────────────────────────────────────────────────
# client_secret 加密（AES-256-GCM，可选）
# ──────────────────────────────────────────────────────────


def encrypt_secret(plaintext: str) -> str:
    """加密 OIDC client_secret

    若未配置 SECRET_ENCRYPTION_KEY，直接返回明文（开发环境用）。
    生产环境应设置 SECRET_ENCRYPTION_KEY（base64编码的32字节随机值）。
    """
    if not settings.SECRET_ENCRYPTION_KEY:
        return plaintext

    try:
        import base64

        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        key = base64.b64decode(settings.SECRET_ENCRYPTION_KEY)
        nonce = secrets.token_bytes(12)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
        combined = nonce + ciphertext
        return "enc:" + base64.b64encode(combined).decode()
    except Exception:
        return plaintext


def decrypt_secret(stored: str) -> str:
    """解密 OIDC client_secret"""
    if not stored.startswith("enc:") or not settings.SECRET_ENCRYPTION_KEY:
        return stored

    try:
        import base64

        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        key = base64.b64decode(settings.SECRET_ENCRYPTION_KEY)
        combined = base64.b64decode(stored[4:])
        nonce = combined[:12]
        ciphertext = combined[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode()
    except Exception:
        return stored
