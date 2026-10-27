import { useEffect, useState } from "react";
import { getDashboardStats } from "../api/dashboard";
import type { DashboardStats } from "../types";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return (
      <div>
        <h2>Dashboard</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return <p>No dashboard data available.</p>;
  }

  const cards = [
    { label: "Total Brands", value: stats.total_brands },
    { label: "Total Reviews", value: stats.total_reviews },
    { label: "Pending Reviews", value: stats.pending_reviews },
    { label: "High-Severity Issues", value: stats.high_severity_findings },
    {label: "Average Score",value:stats.average_score == null? "—": `${stats.average_score}%`,},
  ];

  return (
    <main>
      <h1>BrandGuard AI</h1>
      <p>Brand compliance and content governance overview.</p>

      <section className="dashboard-grid">
        {cards.map((card) => (
          <article className="dashboard-card" key={card.label}>
            <p>{card.label}</p>
            <h2>{card.value}</h2>
          </article>
        ))}
      </section>

      <section className="dashboard-card">
        <h2>Review Status</h2>

        <p>Draft: {stats.status_counts.draft ?? 0}</p>
        <p>In Review: {stats.status_counts.in_review ?? 0}</p>
        <p>
          Changes Requested:{" "}
          {stats.status_counts.changes_requested ?? 0}
        </p>
        <p>Approved: {stats.status_counts.approved ?? 0}</p>

        <p>Total Findings: {stats.total_findings}</p>
      </section>
    </main>
  );
}