
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReviews } from "../api/reviews";
import type { Review } from "../types";

export default function ReviewHistory() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getReviews()
      .then(setReviews)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page">
      <h1>Review History</h1>
      <p>Track submitted content and its review status.</p>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading review history...</p>
      ) : reviews.length === 0 ? (
        <p>No reviews have been submitted yet.</p>
      ) : (
        <div className="dashboard-card">
          <table>
            <thead>
              <tr>
                <th>Review</th>
                <th>Status</th>
                <th>Score</th>
                <th>Created</th>
                <th>Report</th>
              </tr>
            </thead>

            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.title}</td>
                  <td>{review.status.replaceAll("_", " ")}</td>
                  <td>
                    {review.overall_score == null
                      ? "—"
                      : `${review.overall_score}%`}
                  </td>
                  <td>
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <Link to={`/reviews/${review.id}`}>View Report</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p>
        <Link to="/reviews/new">Submit New Content</Link>
      </p>
    </main>
  );
}
