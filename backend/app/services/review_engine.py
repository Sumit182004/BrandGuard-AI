from app.db.models import Brand, Guideline
from app.services.ai_service import review_content
from app.services.rule_engine import run_deterministic_checks


def brand_to_dict(brand: Brand) -> dict:
    return {
        "name": brand.name,
        "description": brand.description,
        "tone_of_voice": brand.tone_of_voice,
        "terminology": brand.terminology or {},
        "approved_claims": brand.approved_claims or [],
        "prohibited_terms": brand.prohibited_terms or [],
    }


def guideline_to_dict(guideline: Guideline) -> dict:
    return {
        "title": guideline.title,
        "description": guideline.description,
        "category": guideline.category,
        "severity": guideline.severity,
    }


async def run_content_review(
    content: str,
    brand: Brand,
) -> dict:
    if not content or not content.strip():
        raise ValueError("Content cannot be empty.")

    active_guidelines = [
        item for item in brand.guidelines if item.is_active
    ]

    guidelines = [
        guideline_to_dict(item)
        for item in active_guidelines
    ]

    # Run explicit, deterministic brand checks.
    rule_findings = run_deterministic_checks(
        content=content,
        brand=brand,
        guidelines=active_guidelines,
    )

    # Run AI analysis for contextual issues.
    result = await review_content(
        content=content,
        brand=brand_to_dict(brand),
        guidelines=guidelines,
    )

    ai_findings = result.get("findings", [])

    if not isinstance(ai_findings, list):
        raise RuntimeError("AI returned invalid findings.")

    allowed_severities = {"high", "medium", "low"}

    for finding in ai_findings:
        if not isinstance(finding, dict):
            raise RuntimeError("AI returned an invalid finding.")

        if finding.get("severity") not in allowed_severities:
            finding["severity"] = "medium"

        finding.setdefault("title", "Content issue")
        finding.setdefault("category", "general")
        finding.setdefault("issue", "")
        finding.setdefault("evidence", "")
        finding.setdefault("guideline", None)
        finding.setdefault("recommendation", "")

    # Combine findings without duplicating identical rule results.
    combined_findings = list(rule_findings)
    seen = {
        (
            item["category"].casefold(),
            item["evidence"].casefold(),
            item["title"].casefold(),
        )
        for item in rule_findings
    }

    for finding in ai_findings:
        key = (
            str(finding.get("category", "general")).casefold(),
            str(finding.get("evidence", "")).casefold(),
            str(finding.get("title", "")).casefold(),
        )

        if key not in seen:
            seen.add(key)
            combined_findings.append(finding)

    result["findings"] = combined_findings

    # The AI score is retained as a starting point, then adjusted
    # for deterministic findings. This is a heuristic, not a
    # statistically validated compliance score.
    score = int(result.get("overall_score", 100))
    score -= sum(
        {"high": 15, "medium": 8, "low": 3}.get(
            finding.get("severity"), 3
        )
        for finding in rule_findings
    )

    result["overall_score"] = max(0, min(100, score))
    result.setdefault("summary", "Content review completed.")

    return result