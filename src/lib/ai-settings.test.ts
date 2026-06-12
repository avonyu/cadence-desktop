import { describe, expect, it } from "vitest";
import { aiSettingsSchema } from "./ai-settings";

describe("aiSettingsSchema", () => {
  it("rejects an empty API key", () => {
    const result = aiSettingsSchema.safeParse({
      apiKey: "",
      model: "deepseek-v4-flash",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only API key", () => {
    const result = aiSettingsSchema.safeParse({
      apiKey: "   ",
      model: "deepseek-v4-flash",
    });

    expect(result.success).toBe(false);
  });

  it("trims a valid API key", () => {
    const result = aiSettingsSchema.safeParse({
      apiKey: "  sk-example  ",
      model: "deepseek-v4-flash",
    });

    expect(result).toEqual({
      success: true,
      data: {
        apiKey: "sk-example",
        model: "deepseek-v4-flash",
      },
    });
  });
});
