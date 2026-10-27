import json

from openai import AsyncOpenAI

from app.core.config import settings


client = (
    AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )
    if settings.GROQ_API_KEY
    else None
)


SYSTEM_PROMPT = """
You are BrandGuard AI, an AI-powered brand governance reviewer.

Review submitted content against the supplied brand information and
guidelines.

Check:
1. Tone and voice consistency.
2. Terminology and prohibited terms.
3. Unsupported or potentially misleading claims.
4. Conflicts with approved brand facts or claims.
5. Clarity and accessibility issues.
6. Opportunities to improve brand consistency.

Important:
- Never invent brand facts or guideline references.
- Distinguish a confirmed violation from a possible risk or missing evidence.
- Do not claim that a statement is false merely because evidence is missing.
- Preserve the creator's intended meaning when suggesting corrections.
- Give actionable explanations.
- Human reviewers make the final approval decision.

Return ONLY valid JSON using this structure:
{
  "overall_score": 0,
  "summary": "Short review summary",
  "findings": [
    {
      "title": "Issue title",
      "category": "tone",
      "severity": "high",
      "issue": "What was found",
      "evidence": "Relevant text from the submission",
      "guideline": "Relevant supplied guideline or null",
      "recommendation": "How to fix it"
    }
  ],
  "suggested_content": "Revised complete content"
}

Score content from 0 to 100, where 100 means strong alignment.
Severity must be high, medium, or low.
Category should identify the issue type.
If no issues are found, return an empty findings array.
"""


async def review_content(
    content: str,
    brand: dict,
    guidelines: list[dict],
) -> dict:
    if not settings.GROQ_API_KEY or client is None:
        raise RuntimeError(
            "GROQ_API_KEY is missing. Add it to backend/.env."
        )

    review_input = {
        "submitted_content": content,
        "brand": brand,
        "guidelines": guidelines,
    }

    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Review this content using only the supplied brand "
                    "information and guidelines. Return the requested "
                    "JSON object.\n\n"
                    + json.dumps(review_input, ensure_ascii=False)
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    result_text = response.choices[0].message.content

    if not result_text:
        raise RuntimeError("Groq returned an empty response.")

    try:
        result = json.loads(result_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Groq returned invalid JSON."
        ) from exc

    score = result.get("overall_score")
    findings = result.get("findings")
    suggested_content = result.get("suggested_content")

    if not isinstance(score, (int, float)) or isinstance(score, bool):
        raise RuntimeError("AI response contains an invalid score.")

    if not 0 <= score <= 100:
        raise RuntimeError("AI score must be between 0 and 100.")

    if not isinstance(findings, list):
        raise RuntimeError("AI response contains invalid findings.")

    if not isinstance(suggested_content, str):
        raise RuntimeError("AI response contains invalid suggested content.")

    result["overall_score"] = int(score)
    result["summary"] = str(result.get("summary", "Review completed."))
    result["findings"] = findings

    return result