from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Brand

router = APIRouter(prefix="/api/brands", tags=["Brands"])


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    tone_of_voice: str = "Professional"
    terminology: dict[str, str] = Field(default_factory=dict)
    approved_claims: list[str] = Field(default_factory=list)
    prohibited_terms: list[str] = Field(default_factory=list)


class BrandUpdate(BrandCreate):
    pass


def brand_response(brand: Brand) -> dict:
    return {
        "id": brand.id,
        "name": brand.name,
        "description": brand.description,
        "tone_of_voice": brand.tone_of_voice,
        "terminology": brand.terminology or {},
        "approved_claims": brand.approved_claims or [],
        "prohibited_terms": brand.prohibited_terms or [],
        "created_at": brand.created_at,
    }


@router.post("")
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Brand name is required.")

    brand = Brand(
        name=payload.name.strip(),
        description=payload.description,
        tone_of_voice=payload.tone_of_voice,
        terminology=payload.terminology,
        approved_claims=payload.approved_claims,
        prohibited_terms=payload.prohibited_terms,
    )

    db.add(brand)
    db.commit()
    db.refresh(brand)

    return brand_response(brand)


@router.get("")
def list_brands(db: Session = Depends(get_db)):
    brands = db.query(Brand).order_by(Brand.created_at.desc()).all()
    return [brand_response(brand) for brand in brands]


@router.get("/{brand_id}")
def get_brand(brand_id: str, db: Session = Depends(get_db)):
    brand = db.get(Brand, brand_id)

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    return brand_response(brand)


@router.put("/{brand_id}")
def update_brand(
    brand_id: str,
    payload: BrandUpdate,
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Brand name is required.")

    for field, value in payload.model_dump().items():
        setattr(brand, field, value)

    brand.name = brand.name.strip()

    db.commit()
    db.refresh(brand)

    return brand_response(brand)


@router.delete("/{brand_id}")
def delete_brand(brand_id: str, db: Session = Depends(get_db)):
    brand = db.get(Brand, brand_id)

    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    db.delete(brand)
    db.commit()

    return {"message": "Brand deleted successfully."}