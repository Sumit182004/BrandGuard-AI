
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBrands } from "../api/brands";
import { createReview, uploadReview } from "../api/reviews";
import type { Brand, Review } from "../types";

export default function NewReview() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBrands()
      .then((data) => {
        setBrands(data);
        if (data.length) setBrandId(data[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!brandId) {
      setError("Please create and select a brand first.");
      return;
    }

    if (!file && !content.trim()) {
      setError("Enter content or upload a TXT, PDF, or DOCX file.");
      return;
    }

    setSubmitting(true);

    try {
      let review: Review;

      if (file) {
        review = await uploadReview(brandId, title.trim(), file);
      } else {
        review = await createReview({
          title: title.trim(),
          content: content.trim(),
          brand_id: brandId,
          creator_name: "Demo Creator",
        });
      }

      navigate(`/reviews/${review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <h1>Submit Content for Review</h1>
      <p>Check your content against the selected brand's approved messaging and guidelines.</p>

      {error && <p role="alert">{error}</p>}

      {brands.length === 0 && (
        <p>Create a brand before submitting content for review.</p>
      )}

      <form className="brand-form dashboard-card" onSubmit={handleSubmit}>
        <label>
          Brand *
          <select
            required
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
          >
            <option value="">Select a brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Review Title *
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. New product announcement"
          />
        </label>

        <label>
          Paste Content
          <textarea
            rows={10}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste the content you want to review..."
            disabled={Boolean(file)}
          />
        </label>

        <p>Or upload a TXT, PDF, or DOCX file.</p>

        <label>
          Upload Document
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {file && (
          <button type="button" onClick={() => setFile(null)}>
            Remove File
          </button>
        )}

        <button type="submit" disabled={submitting || brands.length === 0}>
          {submitting ? "Analyzing Content..." : "Run AI Review"}
        </button>
      </form>
    </main>
  );
}
