import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyStaff } from "./discordNotify";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("notifyStaff", () => {
  it("ne fait rien sans webhook configuré", async () => {
    vi.stubEnv("DISCORD_SITE_WEBHOOK_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await notifyStaff({ title: "Test" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie un embed sans aucune mention et tronque les textes trop longs", async () => {
    vi.stubEnv("DISCORD_SITE_WEBHOOK_URL", "https://discord.com/api/webhooks/1/token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await notifyStaff({ title: "T".repeat(400), description: "D".repeat(5000), fields: [{ name: "De", value: "V".repeat(2000) }] });

    const [url, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(url).toBe("https://discord.com/api/webhooks/1/token");
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.embeds[0].title).toHaveLength(250);
    expect(payload.embeds[0].description).toHaveLength(3500);
    expect(payload.embeds[0].fields[0].value).toHaveLength(1000);
  });

  it("n'échoue jamais si Discord est injoignable", async () => {
    vi.stubEnv("DISCORD_SITE_WEBHOOK_URL", "https://discord.com/api/webhooks/1/token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("réseau")));

    await expect(notifyStaff({ title: "Test" })).resolves.toBeUndefined();
  });
});
