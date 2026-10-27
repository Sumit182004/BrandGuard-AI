import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def new_id():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class ReviewStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tone_of_voice: Mapped[str] = mapped_column(
        String(255), default="Professional"
    )
    terminology: Mapped[dict] = mapped_column(JSON, default=dict)
    approved_claims: Mapped[list] = mapped_column(JSON, default=list)
    prohibited_terms: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    guidelines: Mapped[list["Guideline"]] = relationship(
        back_populates="brand",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list["Review"]] = relationship(
        back_populates="brand",
        cascade="all, delete-orphan",
    )


class Guideline(Base):
    __tablename__ = "guidelines"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(80), default="general"
    )
    severity: Mapped[str] = mapped_column(
        String(30), default="medium"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    brand_id: Mapped[str] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    brand: Mapped["Brand"] = relationship(
        back_populates="guidelines"
    )


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(
        String(30), default="text"
    )
    status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus),
        default=ReviewStatus.DRAFT,
        nullable=False,
    )
    overall_score: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    findings: Mapped[list] = mapped_column(JSON, default=list)
    suggested_content: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    reviewer_comment: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    creator_name: Mapped[str] = mapped_column(
        String(120), default="Demo Creator"
    )
    reviewer_name: Mapped[str | None] = mapped_column(
        String(120), nullable=True
    )
    brand_id: Mapped[str] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    brand: Mapped["Brand"] = relationship(
        back_populates="reviews"
    )
    revisions: Mapped[list["ReviewRevision"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        order_by="ReviewRevision.version",
    )


class ReviewRevision(Base):
    __tablename__ = "review_revisions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[list] = mapped_column(JSON, default=list)
    change_note: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    editor_name: Mapped[str] = mapped_column(
        String(120), default="Demo Creator"
    )
    review_id: Mapped[str] = mapped_column(
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    review: Mapped["Review"] = relationship(
        back_populates="revisions"
    )