from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Brand, Guideline

router = APIRouter(prefix="/api", tags=["Guidelines"])


class GuidelineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: str = "general"
    severity: str = "medium"
    is_active: bool = True


def guideline_response(item: Guideline) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "severity": item.severity,
        "is_active": item.is_active,
        "brand_id": item.brand_id,
        "created_at": item.created_at,
    }


@router.post("/brands/{brand_id}/guidelines")
def create_guideline(
    brand_id: str,
    payload: GuidelineCreate,
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    if payload.severity not in {"high", "medium", "low"}:
        raise HTTPException(
            status_code=422,
            detail="Severity must be high, medium, or low.",
        )

    if not payload.title.strip() or not payload.description.strip():
        raise HTTPException(
            status_code=422,
            detail="Title and description cannot be blank.",
        )

    item = Guideline(
        brand_id=brand_id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category,
        severity=payload.severity,
        is_active=payload.is_active,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return guideline_response(item)


@router.get("/brands/{brand_id}/guidelines")
def list_guidelines(
    brand_id: str,
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    items = (
        db.query(Guideline)
        .filter(Guideline.brand_id == brand_id)
        .order_by(Guideline.created_at.desc())
        .all()
    )

    return [guideline_response(item) for item in items]


@router.put("/guidelines/{guideline_id}")
def update_guideline(
    guideline_id: str,
    payload: GuidelineCreate,
    db: Session = Depends(get_db),
):
    item = db.get(Guideline, guideline_id)

    if not item:
        raise HTTPException(status_code=404, detail="Guideline not found.")

    if payload.severity not in {"high", "medium", "low"}:
        raise HTTPException(
            status_code=422,
            detail="Severity must be high, medium, or low.",
        )

    if not payload.title.strip() or not payload.description.strip():
        raise HTTPException(
            status_code=422,
            detail="Title and description cannot be blank.",
        )

    for field, value in payload.model_dump().items():
        setattr(item, field, value)

    item.title = item.title.strip()
    item.description = item.description.strip()

    db.commit()
    db.refresh(item)

    return guideline_response(item)


@router.delete("/guidelines/{guideline_id}")
def delete_guideline(
    guideline_id: str,
    db: Session = Depends(get_db),
):
    item = db.get(Guideline, guideline_id)

    if not item:
        raise HTTPException(status_code=404, detail="Guideline not found.")

    db.delete(item)
    db.commit()

    return {"message": "Guideline deleted successfully."}