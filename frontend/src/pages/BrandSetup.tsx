
import { useEffect, useState } from "react";
import { createBrand, deleteBrand, getBrands } from "../api/brands";
import type { Brand } from "../types";

export default function BrandSetup() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("");
  const [terminology, setTerminology] = useState("{}");
  const [approvedClaims, setApprovedClaims] = useState("");
  const [prohibitedTerms, setProhibitedTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadBrands() {
    try {
      setBrands(await getBrands());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load brands.");
    }
  }

  useEffect(() => {
    void loadBrands();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    let parsedTerminology: Record<string, string>;

    try {
      parsedTerminology = JSON.parse(terminology || "{}");

      if (
        !parsedTerminology ||
        Array.isArray(parsedTerminology) ||
        typeof parsedTerminology !== "object"
      ) {
        throw new Error();
      }
    } catch {
      setError('Enter valid terminology JSON, e.g. {"cheap":"affordable"}.');
      return;
    }

    setLoading(true);

    try {
      await createBrand({
        name: name.trim(),
        description: description.trim(),
        tone_of_voice: tone.trim(),
        terminology: parsedTerminology,
        approved_claims: approvedClaims
          .split("\n")
          .map((claim) => claim.trim())
          .filter(Boolean),
        prohibited_terms: prohibitedTerms
          .split(",")
          .map((term) => term.trim())
          .filter(Boolean),
      });

      setName("");
      setDescription("");
      setTone("");
      setTerminology("{}");
      setApprovedClaims("");
      setProhibitedTerms("");

      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create brand.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this brand?")) return;

    try {
      await deleteBrand(id);
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete brand.");
    }
  }

  return (
    <main className="page">
      <h1>Brand Setup</h1>
      <p>Configure brand identity, terminology, and verified claims.</p>

      {error && <p role="alert">{error}</p>}

      <section className="dashboard-card">
        <h2>Create a Brand</h2>

        <form onSubmit={handleSubmit} className="brand-form">
          <label>
            Brand Name *
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter brand name"
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the brand"
            />
          </label>

          <label>
            Tone of Voice
            <textarea
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder="e.g. Professional, friendly, concise"
            />
          </label>

          <label>
            Terminology (JSON)
            <textarea
              value={terminology}
              onChange={(event) => setTerminology(event.target.value)}
              placeholder='{"cheap":"affordable"}'
            />
          </label>

          <label>
            Approved Claims (one per line)
            <textarea
              value={approvedClaims}
              onChange={(event) => setApprovedClaims(event.target.value)}
              placeholder="Enter verified brand claims"
            />
          </label>

          <label>
            Prohibited Terms (comma-separated)
            <input
              value={prohibitedTerms}
              onChange={(event) => setProhibitedTerms(event.target.value)}
              placeholder="e.g. risk-free, guaranteed"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create Brand"}
          </button>
        </form>
      </section>

      <section>
        <h2>Existing Brands</h2>

        {brands.length === 0 ? (
          <p>No brands created yet.</p>
        ) : (
          <div className="dashboard-grid">
            {brands.map((brand) => (
              <article className="dashboard-card" key={brand.id}>
                <h3>{brand.name}</h3>
                <p>{brand.description || "No description"}</p>
                <p>
                  <strong>Tone:</strong>{" "}
                  {brand.tone_of_voice || "Not specified"}
                </p>

                <button
                  type="button"
                  onClick={() => void handleDelete(brand.id)}
                >
                  Delete Brand
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
