import { apiRequest } from "./client";
import type { Brand } from "../types";

export interface BrandPayload {
  name: string;
  description?: string;
  tone_of_voice?: string;
  terminology?: Record<string, string>;
  approved_claims?: string[];
  prohibited_terms?: string[];
}

export const getBrands = () =>
  apiRequest<Brand[]>("/api/brands");

export const getBrand = (brandId: string) =>
  apiRequest<Brand>(`/api/brands/${encodeURIComponent(brandId)}`);

export const createBrand = (data: BrandPayload) =>
  apiRequest<Brand>("/api/brands", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBrand = (
  brandId: string,
  data: Partial<BrandPayload>
) =>
  apiRequest<Brand>(`/api/brands/${encodeURIComponent(brandId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBrand = (brandId: string) =>
  apiRequest<void>(`/api/brands/${encodeURIComponent(brandId)}`, {
    method: "DELETE",
  });