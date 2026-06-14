import restrictionsData from "@/config/feature-restrictions.json";

export interface FeatureRestriction {
  id: string;
  label: string;
  type: "count";
  period: "weekly";
  limit: number;
}

export function getFeatureRestrictions(): FeatureRestriction[] {
  if (import.meta.env.VITE_BUILD_MODE !== "commercial") return [];
  return restrictionsData.features as FeatureRestriction[];
}

export function getFeatureLimit(id: string): number {
  const restriction = getFeatureRestrictions().find((f) => f.id === id);
  return restriction?.limit ?? Infinity;
}
