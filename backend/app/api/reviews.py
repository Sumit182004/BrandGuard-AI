from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Brand, Review, ReviewRevision, ReviewStatus
from app.services.review_engine import run_content_review
from fastapi import File, UploadFile
from app.services.document_service import extract_text
router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    brand_id: str
    creator_name: str = "Demo Creator"


class ReviewDecision(BaseModel):
    decision: str
    reviewer_name: str = "Demo Reviewer"
    comment: str | None = None


class ReviewRevisionCreate(BaseModel):
    content: str = Field(min_length=1)
    editor_name: str = "Demo Creator"
    change_note: str | None = None


def review_response(review: Review) -> dict:
    return {
        "id": review.id,
        "title": review.title,
        "content": review.content,
        "brand_id": review.brand_id,
        "brand_name": review.brand.name if review.brand else None,
        "status": review.status.value,
        "overall_score": review.overall_score,
        "findings": review.findings or [],
        "suggested_content": review.suggested_content,
        "reviewer_comment": review.reviewer_comment,
        "creator_name": review.creator_name,
        "reviewer_name": review.reviewer_name,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


@router.post("")
async def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
):
    if not payload.content.strip() or not payload.title.strip():
        raise HTTPException(
            status_code=422,
            detail="Title and content cannot be blank.",
        )

    brand = (
        db.query(Brand)
        .options(joinedload(Brand.guidelines))
        .filter(Brand.id == payload.brand_id)
        .first()
    )

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    try:
        result = await run_content_review(payload.content, brand)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="AI review failed. Check the Groq configuration and retry.",
        ) from exc

    review = Review(
        title=payload.title.strip(),
        content=payload.content.strip(),
        brand_id=brand.id,
        creator_name=payload.creator_name.strip() or "Demo Creator",
        status=ReviewStatus.IN_REVIEW,
        overall_score=result["overall_score"],
        findings=result["findings"],
        suggested_content=result["suggested_content"],
    )

    db.add(review)
    db.flush()

    db.add(
        ReviewRevision(
            review_id=review.id,
            version=1,
            content=review.content,
            findings=review.findings,
            editor_name=review.creator_name,
            change_note="Initial submission",
        )
    )

    db.commit()
    db.refresh(review)

    return {
        **review_response(review),
        "summary": result["summary"],
    }


@router.get("")
def list_reviews(db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .options(joinedload(Review.brand))
        .order_by(Review.created_at.desc())
        .all()
    )
    return [review_response(review) for review in reviews]


@router.get("/{review_id}")
def get_review(review_id: str, db: Session = Depends(get_db)):
    review = (
        db.query(Review)
        .options(joinedload(Review.brand))
        .filter(Review.id == review_id)
        .first()
    )

    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    return review_response(review)


@router.post("/{review_id}/decision")
def decide_review(
    review_id: str,
    payload: ReviewDecision,
    db: Session = Depends(get_db),
):
    review = db.get(Review, review_id)

    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    decisions = {
        "approve": ReviewStatus.APPROVED,
        "request_changes": ReviewStatus.CHANGES_REQUESTED,
        "submit": ReviewStatus.IN_REVIEW,
    }

    if payload.decision not in decisions:
        raise HTTPException(
            status_code=422,
            detail="Decision must be approve, request_changes, or submit.",
        )

    if (
        payload.decision == "approve"
        and review.status == ReviewStatus.CHANGES_REQUESTED
    ):
        raise HTTPException(
            status_code=409,
            detail="Re-review the revised content before approving it.",
        )

    review.status = decisions[payload.decision]
    review.reviewer_name = payload.reviewer_name
    review.reviewer_comment = payload.comment

    db.commit()
    db.refresh(review)

    return review_response(review)


@router.post("/{review_id}/revisions")
async def create_revision(
    review_id: str,
    payload: ReviewRevisionCreate,
    db: Session = Depends(get_db),
):
    review = (
        db.query(Review)
        .options(joinedload(Review.brand).joinedload(Brand.guidelines))
        .filter(Review.id == review_id)
        .first()
    )

    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    if not payload.content.strip():
        raise HTTPException(
            status_code=422,
            detail="Revised content cannot be blank.",
        )

    try:
        result = await run_content_review(payload.content, review.brand)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="AI re-review failed. Please retry.",
        ) from exc

    next_version = len(review.revisions) + 1

    review.content = payload.content.strip()
    review.findings = result["findings"]
    review.overall_score = result["overall_score"]
    review.suggested_content = result["suggested_content"]
    review.status = ReviewStatus.IN_REVIEW
    review.reviewer_comment = None

    db.add(
        ReviewRevision(
            review_id=review.id,
            version=next_version,
            content=review.content,
            findings=review.findings,
            editor_name=payload.editor_name,
            change_note=payload.change_note,
        )
    )

    db.commit()
    db.refresh(review)

    return {
        **review_response(review),
        "summary": result["summary"],
        "revision_version": next_version,
    }


@router.get("/{review_id}/revisions")
def list_revisions(review_id: str, db: Session = Depends(get_db)):
    review = db.get(Review, review_id)

    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    return [
        {
            "id": revision.id,
            "version": revision.version,
            "content": revision.content,
            "findings": revision.findings,
            "editor_name": revision.editor_name,
            "change_note": revision.change_note,
            "created_at": revision.created_at,
        }
        for revision in review.revisions
    ]

@router.post("/upload")
async def upload_content_for_review(
    brand_id: str,
    title: str,
    creator_name: str = "Demo Creator",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    allowed_extensions = {".txt", ".pdf", ".docx"}
    filename = file.filename or ""

    extension = (
        "." + filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail="Upload a TXT, PDF, or DOCX file.",
        )

    try:
        file_bytes = await file.read()
        content = extract_text(filename, file_bytes)
    finally:
        await file.close()

    payload = ReviewCreate(
        title=title,
        content=content,
        brand_id=brand_id,
        creator_name=creator_name,
    )

    return await create_review(payload, db)