import { apiRequest } from "./client";
import type { ApiChartPoint, ApiDashboardStats } from "./types";

export const dashboardApi = {
  getStats() {
    return apiRequest<ApiDashboardStats>("/dashboard/stats");
  },

  getChart(interval: "daily" | "weekly" | "monthly" = "daily") {
    return apiRequest<ApiChartPoint[]>(
      `/dashboard/chart?interval=${encodeURIComponent(interval)}`,
    );
  },
};
