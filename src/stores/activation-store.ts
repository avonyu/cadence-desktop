import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getWeekStart } from "@/lib/week-utils";
import { getFeatureLimit, getRestrictedFeatureIds } from "@/lib/feature-restrictions";

const USAGE_KEY = "cadence:activation-usage";
const STATE_KEY = "cadence:activation-state";

interface UsageEntry {
  weekStart: string;
  count: number;
}

interface ActivationState {
  activated: boolean;
  trialActive: boolean;
  trialDaysRemaining: number;
  usage: Record<string, UsageEntry>;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  activate: (code: string) => Promise<{ success: boolean; error?: string }>;
  getRemaining: (featureId: string) => number;
  getLimit: (featureId: string) => number;
  checkAndRecord: (featureId: string) => Promise<boolean>;
  canUseFeature: (featureId: string) => boolean;
}

function loadUsage(): Record<string, UsageEntry> {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveUsage(usage: Record<string, UsageEntry>) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch { /* ignore */ }
}

interface ActivationInfo {
  activated: boolean;
  code: string;
  fingerprint: string;
  trialActive: boolean;
  trialDaysRemaining: number;
}

function loadActivationState(): ActivationInfo {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as ActivationInfo;
  } catch { /* ignore */ }
  return { activated: false, code: "", fingerprint: "", trialActive: false, trialDaysRemaining: 0 };
}

function saveActivationState(info: ActivationInfo) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(info));
  } catch { /* ignore */ }
}

export const useActivationStore = create<ActivationState>()((set, get) => ({
  activated: false,
  trialActive: false,
  trialDaysRemaining: 0,
  usage: {},
  hydrated: false,

  hydrate: async () => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") {
      set({ activated: true, trialActive: false, trialDaysRemaining: 0, hydrated: true });
      return;
    }

    try {
      const status = await invoke<{
        activated: boolean;
        trialActive: boolean;
        trialDaysRemaining: number;
      }>("get-activation-status");
      const usage = loadUsage();
      set({
        activated: status.activated,
        trialActive: status.trialActive,
        trialDaysRemaining: status.trialDaysRemaining,
        usage,
        hydrated: true,
      });
    } catch (err) {
      console.error("[activation] Failed to get activation status:", err);
      const state = loadActivationState();
      const usage = loadUsage();
      set({
        activated: state.activated,
        trialActive: state.trialActive,
        trialDaysRemaining: state.trialDaysRemaining,
        usage,
        hydrated: true,
      });
    }
  },

  activate: async (code: string) => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") {
      return { success: true };
    }

    try {
      const result = await invoke<{ success: boolean; error?: string; fingerprint?: string }>(
        "activate",
        { code },
      );

      if (result.success) {
        saveActivationState({
          activated: true,
          code,
          fingerprint: result.fingerprint ?? "",
          trialActive: false,
          trialDaysRemaining: 0,
        });
        saveUsage({});
        set({ activated: true, trialActive: false, trialDaysRemaining: 0, usage: {} });
      }

      return result;
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  },

  getRemaining: (featureId: string) => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") return Infinity;

    const { activated, usage } = get();
    if (activated) return Infinity;

    const limit = getFeatureLimit(featureId);
    const entry = usage[featureId];
    if (!entry) return limit;

    const currentWeek = getWeekStart();
    if (entry.weekStart !== currentWeek) return limit;

    return Math.max(0, limit - entry.count);
  },

  getLimit: (featureId: string) => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") return 0;
    return getFeatureLimit(featureId);
  },

  checkAndRecord: async (featureId: string) => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") return true;

    const { activated, usage: currentUsage } = get();
    if (activated) return true;

    const limit = getFeatureLimit(featureId);
    const entry = currentUsage[featureId];
    const currentWeek = getWeekStart();

    if (entry && entry.weekStart === currentWeek && entry.count >= limit) {
      return false;
    }

    const newEntry: UsageEntry = {
      weekStart: currentWeek,
      count: (entry && entry.weekStart === currentWeek ? entry.count : 0) + 1,
    };

    const newUsage = { ...currentUsage, [featureId]: newEntry };
    set({ usage: newUsage });
    saveUsage(newUsage);

    return true;
  },

  canUseFeature: (featureId: string) => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") return true;

    const { activated, trialActive } = get();
    if (activated || trialActive) return true;

    const restrictedFeatures = getRestrictedFeatureIds();
    return !restrictedFeatures.includes(featureId);
  },
}));
