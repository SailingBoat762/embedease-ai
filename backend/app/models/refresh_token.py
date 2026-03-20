"""Refresh Token 模型"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RefreshToken(Base):
    """Refresh Token 表（支持吊销）"""

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    subject_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'user' | 'admin'
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    @property
    def is_expired(self) -> bool:
        from datetime import timezone
        return datetime.now(timezone.utc).replace(tzinfo=None) > self.expires_at

    @property
    def is_valid(self) -> bool:
        return self.revoked_at is None and not self.is_expired

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id!r} subject_id={self.subject_id!r}>"
