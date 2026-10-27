
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Brand, Review, ReviewStatus

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    reviews = db.query(Review).all()

    status_counts = {
        status.value: 0
        for status in ReviewStatus
    }

    total_findings = 0
    high_severity = 0
    scores = []

    for review in reviews:
        status_counts[review.status.value] += 1

        findings = review.findings or []
        total_findings += len(findings)

        high_severity += sum(
            1
            for finding in findings
            if finding.get("severity") == "high"
        )

        if review.overall_score is not None:
            scores.append(review.overall_score)

    average_score = (
        round(sum(scores) / len(scores))
        if scores
        else None
    )

    return {
        "total_brands": db.query(Brand).count(),
        "total_reviews": len(reviews),
        "pending_reviews": status_counts[
            ReviewStatus.IN_REVIEW.value
        ],
        "approved_reviews": status_counts[
            ReviewStatus.APPROVED.value
        ],
        "changes_requested": status_counts[
            ReviewStatus.CHANGES_REQUESTED.value
        ],
        "total_findings": total_findings,
        "high_severity_findings": high_severity,
        "average_score": average_score,
        "status_counts": status_counts,
    }
