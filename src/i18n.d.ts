import zh from "@/locales/zh/translation.json";

type Translation = typeof zh & {
  ai: {
    processing: string;
    noVideo: string;
    noApiKey: string;
    loadFailed: string;
    processFailed: string;
    processComplete: string;
  };
  activation: {
    title: string;
    activated: string;
    notActivated: string;
    codePlaceholder: string;
    activateButton: string;
    activating: string;
    invalidCode: string;
    activateSuccess: string;
    aiWeeklyLimit: string;
    transcodeWeeklyLimit: string;
    remaining: string;
    aiWeeklyLimitReached: string;
    transcodeWeeklyLimitReached: string;
    activateToUnlock: string;
  };
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: Translation;
    };
  }
}
