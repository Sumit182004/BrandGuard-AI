
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { decideReview, getReviews } from "../api/reviews";
import type { Review } from "../types";

export default function ApprovalQueue() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  async function loadReviews() {
    try {
      const data = await getReviews();
      setReviews(
        data.filter((review) =>
          ["in_review", "changes_requested"].includes(review.status)
        )
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  async function handleDecision(
    review: Review,
    decision: "approve" | "request_changes"
  ) {
    setError("");

    if (decision === "approve" && review.status === "changes_requested") {
      setError(
        `Submit a new revision for "${review.title}" before approving it.`
      );
      return;
    }

    setBusyReviewId(review.id);

    try {
      await decideReview(review.id, {
        decision,
        reviewer_name: "Demo Reviewer",
        comment: comment[review.id] || "",
      });

      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusyReviewId(null);
    }
  }

  return (
    <main className="page">
      <h1>Approval Queue</h1>
      <p>Review submitted content and record approval decisions.</p>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading approvals...</p>
      ) : reviews.length === 0 ? (
        <p>No reviews are awaiting approval.</p>
      ) : (
        <div className="dashboard-grid">
          {reviews.map((review) => (
            <article className="dashboard-card" key={review.id}>
              <h2>{review.title}</h2>
              <p>Status: {review.status.replaceAll("_", " ")}</p>
              <p>Score: {review.overall_score ?? "Not available"}</p>

              <Link to={`/reviews/${review.id}`}>View Review Report</Link>

              {review.status === "changes_requested" && (
                <p>
                  Re-review the revised content before approving it.
                  <br />
                  <Link to={`/reviews/${review.id}`}>
                    Open report and submit revision
                  </Link>
                </p>
              )}

              <label>
                Reviewer Comment
                <textarea
                  value={comment[review.id] || ""}
                  onChange={(event) =>
                    setComment((previous) => ({
                      ...previous,
                      [review.id]: event.target.value,
                    }))
                  }
                  placeholder="Explain your decision or requested changes"
                />
              </label>

              <div className="button-group">
                <button
                  type="button"
                  disabled={
                    busyReviewId === review.id ||
                    review.status === "changes_requested"
                  }
                  onClick={() => void handleDecision(review, "approve")}
                >
                  {busyReviewId === review.id ? "Processing..." : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={busyReviewId === review.id}
                  onClick={() => void handleDecision(review, "request_changes")}
                >
                  Request Changes
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
