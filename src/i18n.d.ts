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
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: Translation;
    };
  }
}
