import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getRestrictedFeatureIds } from "@/lib/feature-restrictions";

interface ActivationState {
  activated: boolean;
  trialActive: boolean;
  trialDaysRemaining: number;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  activate: (code: string) => Promise<{ success: boolean; error?: string }>;
  canUseFeature: (featureId: string) => boolean;
}

export const useActivationStore = create<ActivationState>()((set, get) => ({
  activated: false,
  trialActive: false,
  trialDaysRemaining: 0,
  hydrated: false,

  hydrate: async () => {
    try {
      const status = await invoke<{
        activated: boolean;
        trialActive: boolean;
        trialDaysRemaining: number;
      }>("get_activation_status");
      set({
        activated: status.activated,
        trialActive: status.trialActive,
        trialDaysRemaining: status.trialDaysRemaining,
        hydrated: true,
      });
    } catch (err) {
      console.error("[activation] Failed to get activation status:", err);
      // Fallback for OSS mode when backend is unreachable
      if (import.meta.env.VITE_BUILD_MODE !== "commercial") {
        set({ activated: true, trialActive: false, trialDaysRemaining: 0, hydrated: true });
      } else {
        set({ hydrated: true });
      }
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
        set({
          activated: true,
          trialActive: false,
          trialDaysRemaining: 0,
        });
      }

      return result;
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  },

  canUseFeature: (featureId: string) => {
    if (import.meta.env.VITE_BUILD_MODE !== "commercial") return true;

    const { activated, trialActive } = get();
    if (activated || trialActive) return true;

    const restrictedFeatures = getRestrictedFeatureIds();
    return !restrictedFeatures.includes(featureId);
  },
}));
