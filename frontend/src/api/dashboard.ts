import { apiRequest } from "./client";
import type { DashboardStats } from "../types";

export const getDashboardStats = () =>
  apiRequest<DashboardStats>("/api/dashboard/stats");