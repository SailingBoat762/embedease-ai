"""OIDC Provider 模型"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class OIDCProvider(Base):
    """OIDC Provider 配置表"""

    __tablename__ = "oidc_providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    client_id: Mapped[str] = mapped_column(String(255), nullable=False)
    client_secret: Mapped[str] = mapped_column(Text, nullable=False)  # 加密存储
    issuer_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    authorization_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    token_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    userinfo_endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True)
    scopes: Mapped[str] = mapped_column(
        String(255), default="openid email profile", nullable=False
    )
    target_role: Mapped[str] = mapped_column(
        String(10), default="user", nullable=False
    )  # 'user' | 'admin' | 'both'
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(
        "OAuthAccount", back_populates="provider", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<OIDCProvider slug={self.slug!r} name={self.name!r}>"
