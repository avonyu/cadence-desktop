import * as z from "zod/mini";

export const aiSettingsSchema = z.object({
  apiKey: z.string().check(z.trim(), z.minLength(1)),
  model: z.string().check(z.minLength(1)),
});
