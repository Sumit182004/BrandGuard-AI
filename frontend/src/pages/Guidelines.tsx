
import { useEffect, useState } from "react";
import { getBrands } from "../api/brands";
import {
  createGuideline,
  deleteGuideline,
  getGuidelines,
} from "../api/guidelines";
import type { Brand, Guideline } from "../types";

export default function Guidelines() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tone");
  const [severity, setSeverity] = useState("medium");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBrands()
      .then((data) => {
        setBrands(data);
        if (data.length) setSelectedBrand(data[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedBrand) {
      setGuidelines([]);
      return;
    }

    getGuidelines(selectedBrand)
      .then(setGuidelines)
      .catch((err: Error) => setError(err.message));
  }, [selectedBrand]);

  async function refreshGuidelines() {
    if (selectedBrand) {
      setGuidelines(await getGuidelines(selectedBrand));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBrand) {
      setError("Create a brand before adding guidelines.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createGuideline(selectedBrand, {
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        is_active: true,
      });

      setTitle("");
      setDescription("");
      await refreshGuidelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create guideline.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this guideline?")) return;

    try {
      await deleteGuideline(id);
      await refreshGuidelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete guideline.");
    }
  }

  return (
    <main className="page">
      <h1>Brand Guidelines</h1>
      <p>Create rules used by the AI and deterministic review engine.</p>

      {error && <p role="alert">{error}</p>}

      <label>
        Select Brand
        <select
          value={selectedBrand}
          onChange={(event) => setSelectedBrand(event.target.value)}
        >
          <option value="">Choose a brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <section className="dashboard-card">
        <h2>Add Guideline</h2>

        <form onSubmit={handleSubmit} className="brand-form">
          <label>
            Title *
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label>
            Description *
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the rule the content must follow"
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="tone">Tone of Voice</option>
              <option value="terminology">Terminology</option>
              <option value="factual">Factual Accuracy</option>
              <option value="accessibility">Accessibility</option>
              <option value="compliance">Compliance</option>
              <option value="general">General</option>
            </select>
          </label>

          <label>
            Severity
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <button type="submit" disabled={saving || !selectedBrand}>
            {saving ? "Saving..." : "Add Guideline"}
          </button>
        </form>
      </section>

      <section>
        <h2>Existing Guidelines</h2>

        {guidelines.length === 0 ? (
          <p>No guidelines found for this brand.</p>
        ) : (
          <div className="dashboard-grid">
            {guidelines.map((guideline) => (
              <article className="dashboard-card" key={guideline.id}>
                <h3>{guideline.title}</h3>
                <p>{guideline.description}</p>
                <p>Category: {guideline.category}</p>
                <p>Severity: {guideline.severity}</p>
                <button
                  type="button"
                  onClick={() => void handleDelete(guideline.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
