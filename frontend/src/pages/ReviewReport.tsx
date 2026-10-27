
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createRevision, getReview } from "../api/reviews";
import type { Review } from "../types";

export default function ReviewReport() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [changeNote, setChangeNote] = useState("");

  async function loadReview(id: string) {
    const data = await getReview(id);
    setReview(data);
    setContent(data.content);
  }

  useEffect(() => {
    if (!reviewId) {
      setError("Review ID is missing.");
      setLoading(false);
      return;
    }

    loadReview(reviewId)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reviewId]);

  async function handleRevisionSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reviewId || !content.trim()) {
      setError("Revised content cannot be empty.");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await createRevision(reviewId, {
        content: content.trim(),
        editor_name: "Demo Creator",
        change_note: changeNote.trim() || "Updated content after review feedback.",
      });

      await loadReview(reviewId);
      setChangeNote("");
      setSuccess("Revision submitted successfully. Review the updated findings before approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit revision.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="page">Loading review report...</main>;
  if (error && !review) {
    return <main className="page"><p role="alert">{error}</p></main>;
  }
  if (!review) return <main className="page">Review not found.</main>;

  const findings = review.findings ?? [];

  return (
    <main className="page">
      <Link to="/history">← Back to Review History</Link>

      <h1>{review.title}</h1>
      <p>Status: {review.status.replaceAll("_", " ")}</p>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p>Compliance Score</p>
          <h2>
            {review.overall_score ?? "—"}
            {review.overall_score != null ? "%" : ""}
          </h2>
        </article>

        <article className="dashboard-card">
          <p>Total Findings</p>
          <h2>{findings.length}</h2>
        </article>

        <article className="dashboard-card">
          <p>Brand</p>
          <h2>{review.brand_name ?? review.brand_id}</h2>
        </article>
      </section>

      <section className="dashboard-card">
        <h2>AI Review Findings</h2>

        {findings.length === 0 ? (
          <p>No findings were returned for this review.</p>
        ) : (
          findings.map((finding, index) => (
            <article className="finding-card" key={`${finding.title}-${index}`}>
              <h3>{finding.title}</h3>
              <p>Severity: {finding.severity}</p>
              <p>Category: {finding.category}</p>
              <p>{finding.issue}</p>

              {finding.evidence && (
                <p><strong>Evidence:</strong> {finding.evidence}</p>
              )}

              {finding.guideline && (
                <p><strong>Guideline:</strong> {finding.guideline}</p>
              )}

              {finding.recommendation && (
                <p><strong>Suggested correction:</strong> {finding.recommendation}</p>
              )}
            </article>
          ))
        )}
      </section>

      {review.suggested_content && (
        <section className="dashboard-card">
          <h2>Suggested Revised Content</h2>
          <pre className="review-content">{review.suggested_content}</pre>

          {review.status === "changes_requested" && (
            <button
              type="button"
              onClick={() => setContent(review.suggested_content ?? review.content)}
            >
              Use Suggested Content
            </button>
          )}
        </section>
      )}

      {review.status === "changes_requested" && (
        <section className="dashboard-card">
          <h2>Submit Revised Content</h2>
          <p>Update the content according to the reviewer's feedback.</p>

          <form onSubmit={handleRevisionSubmit}>
            <label htmlFor="revision-content">Revised Content</label>
            <textarea
              id="revision-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={8}
              required
            />

            <label htmlFor="revision-note">Change Note</label>
            <textarea
              id="revision-note"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              rows={3}
              placeholder="Explain what you changed"
            />

            <button type="submit" disabled={submitting || !content.trim()}>
              {submitting ? "Submitting Revision..." : "Submit Revision"}
            </button>
          </form>
        </section>
      )}

      <section className="dashboard-card">
        <h2>Submitted Content</h2>
        <pre className="review-content">{review.content}</pre>
      </section>

      <p>
        <Link to="/approvals">Go to Approval Queue</Link>
      </p>
    </main>
  );
}
