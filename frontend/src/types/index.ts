
export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  tone_of_voice?: string | null;
  terminology: Record<string, string>;
  approved_claims: string[];
  prohibited_terms: string[];
  created_at?: string;
}

export interface Guideline {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  is_active: boolean;
  created_at?: string;
}

export type ReviewStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved";

export interface Finding {
  title: string;
  category: string;
  severity: "high" | "medium" | "low";
  issue: string;
  evidence: string;
  guideline?: string | null;
  recommendation: string;
}

export interface Review {
  id: string;
  title: string;
  content: string;
  content_type?: string;
  status: ReviewStatus;
  overall_score: number | null;
  findings: Finding[];
  suggested_content?: string | null;
  reviewer_comment?: string | null;
  creator_name?: string | null;
  reviewer_name?: string | null;
  brand_id: string;
  brand_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReviewRevision {
  id: string;
  review_id: string;
  version: number;
  content: string;
  findings: Finding[];
  change_note?: string | null;
  editor_name?: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_brands: number;
  total_reviews: number;
  pending_reviews: number;
  total_findings: number;
  high_severity_findings: number;
  average_score: number | null;
  status_counts: Record<string, number>;
}
