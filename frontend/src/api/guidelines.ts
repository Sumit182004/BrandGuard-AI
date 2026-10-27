import { apiRequest } from "./client";
import type { Guideline } from "../types";

export interface GuidelinePayload {
  title: string;
  description: string;
  category: string;
  severity: string;
  is_active?: boolean;
}

export const getGuidelines = (brandId: string) =>
  apiRequest<Guideline[]>(
    `/api/brands/${encodeURIComponent(brandId)}/guidelines`
  );

export const createGuideline = (
  brandId: string,
  data: GuidelinePayload
) =>
  apiRequest<Guideline>(
    `/api/brands/${encodeURIComponent(brandId)}/guidelines`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

export const updateGuideline = (
  guidelineId: string,
  data: Partial<GuidelinePayload>
) =>
  apiRequest<Guideline>(
    `/api/guidelines/${encodeURIComponent(guidelineId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

export const deleteGuideline = (guidelineId: string) =>
  apiRequest<void>(
    `/api/guidelines/${encodeURIComponent(guidelineId)}`,
    { method: "DELETE" }
  );