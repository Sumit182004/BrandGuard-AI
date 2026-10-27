import re

from app.db.models import Brand, Guideline


def run_deterministic_checks(
    content: str,
    brand: Brand,
    guidelines: list[Guideline],
) -> list[dict]:
    findings = []
    text = content or ""
    normalized_text = text.casefold()

    # 1. Check explicitly prohibited terms.
    for term in brand.prohibited_terms or []:
        term = str(term).strip()

        if not term:
            continue

        pattern = (
            rf"(?<!\w){re.escape(term)}(?!\w)"
        )

        matches = list(re.finditer(pattern, text, re.IGNORECASE))

        for match in matches:
            findings.append({
                "title": f"Prohibited term: {term}",
                "category": "terminology",
                "severity": "high",
                "issue": (
                    f"The content contains '{term}', which is listed "
                    "as a prohibited brand term."
                ),
                "evidence": match.group(0),
                "guideline": "Brand prohibited terms list",
                "recommendation": (
                    "Remove this term or replace it with approved "
                    "brand terminology."
                ),
            })

    # 2. Check terminology mappings.
    # Expected format: {"incorrect term": "preferred term"}
    terminology = brand.terminology or {}

    for incorrect, preferred in terminology.items():
        incorrect = str(incorrect).strip()
        preferred = str(preferred).strip()

        if not incorrect or not preferred:
            continue

        pattern = rf"(?<!\w){re.escape(incorrect)}(?!\w)"

        for match in re.finditer(pattern, text, re.IGNORECASE):
            findings.append({
                "title": f"Terminology inconsistency: {incorrect}",
                "category": "terminology",
                "severity": "medium",
                "issue": (
                    f"'{match.group(0)}' differs from the preferred "
                    f"brand terminology '{preferred}'."
                ),
                "evidence": match.group(0),
                "guideline": "Brand terminology mapping",
                "recommendation": f"Use '{preferred}' instead.",
            })

    # 3. Check explicit active guidelines containing prohibited terms.
    # This is intentionally limited to clear prohibition wording.
    prohibition_markers = (
        "do not use",
        "never use",
        "prohibited",
        "must not use",
        "avoid the term",
    )

    for guideline in guidelines:
        if not guideline.is_active:
            continue

        description = guideline.description.strip()
        lowered_description = description.casefold()

        if not any(
            marker in lowered_description
            for marker in prohibition_markers
        ):
            continue

        # Extract quoted terms, e.g. Do not use "guaranteed".
        quoted_terms = re.findall(
            r"""["'“”‘’]([^"'“”‘’]+)["'“”‘’]""",
            description,
        )

        for term in quoted_terms:
            term = term.strip()

            if not term:
                continue

            pattern = rf"(?<!\w){re.escape(term)}(?!\w)"

            for match in re.finditer(pattern, text, re.IGNORECASE):
                findings.append({
                    "title": f"Guideline violation: {guideline.title}",
                    "category": guideline.category,
                    "severity": guideline.severity,
                    "issue": (
                        f"The content contains '{match.group(0)}', "
                        "which conflicts with an explicit prohibition "
                        "in this guideline."
                    ),
                    "evidence": match.group(0),
                    "guideline": guideline.title,
                    "recommendation": (
                        "Remove or replace the prohibited wording "
                        "according to the guideline."
                    ),
                })

    # Avoid duplicate findings for the same category, evidence and rule.
    unique_findings = []
    seen = set()

    for finding in findings:
        key = (
            finding["category"],
            finding["evidence"].casefold(),
            finding["title"].casefold(),
        )

        if key not in seen:
            seen.add(key)
            unique_findings.append(finding)

    return unique_findings