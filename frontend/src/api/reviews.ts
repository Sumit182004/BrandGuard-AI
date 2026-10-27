import { apiRequest } from "./client";
import type { Review } from "../types";

export interface ReviewPayload {
  title: string;
  content: string;
  brand_id: string;
  creator_name?: string;
}

export interface ReviewDecisionPayload {
  decision: "approve" | "request_changes" | "submit";
  reviewer_name: string;
  comment?: string;
}

export interface RevisionPayload {
  content: string;
  editor_name: string;
  change_note?: string;
}

export interface ReviewRevision {
  id: string;
  version: number;
  content: string;
  findings: unknown[];
  change_note?: string | null;
  editor_name?: string | null;
  created_at: string;
}

export const getReviews = () =>
  apiRequest<Review[]>("/api/reviews");

export const getReview = (reviewId: string) =>
  apiRequest<Review>(
    `/api/reviews/${encodeURIComponent(reviewId)}`
  );

export const createReview = (data: ReviewPayload) =>
  apiRequest<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });

export async function uploadReview(
  brandId: string,
  title: string,
  file: File,
  creatorName = "Demo Creator"
): Promise<Review> {
  const formData = new FormData();

  formData.append("brand_id", brandId);
  formData.append("title", title);
  formData.append("creator_name", creatorName);
  formData.append("file", file);

  return apiRequest<Review>("/api/reviews/upload", {
    method: "POST",
    body: formData,
  });
}

export const decideReview = (
  reviewId: string,
  data: ReviewDecisionPayload
) =>
  apiRequest<Review>(
    `/api/reviews/${encodeURIComponent(reviewId)}/decision`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

export const createRevision = (
  reviewId: string,
  data: RevisionPayload
) =>
  apiRequest<Review>(
    `/api/reviews/${encodeURIComponent(reviewId)}/revisions`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

export const getRevisions = (reviewId: string) =>
  apiRequest<ReviewRevision[]>(
    `/api/reviews/${encodeURIComponent(reviewId)}/revisions`
  );