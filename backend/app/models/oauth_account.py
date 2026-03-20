"""OAuth Account 模型（关联外部身份）"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.oidc_provider import OIDCProvider


class OAuthAccount(Base):
    """OAuth 账号关联表"""

    __tablename__ = "oauth_accounts"
    __table_args__ = (UniqueConstraint("provider_id", "subject", name="uq_provider_subject"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)  # Provider 返回的 sub
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    admin_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    provider: Mapped[OIDCProvider] = relationship("OIDCProvider", back_populates="oauth_accounts")

    def __repr__(self) -> str:
        return f"<OAuthAccount provider_id={self.provider_id!r} subject={self.subject!r}>"
