const DISCORD_EMBED_COLOR = 0x4e8f6c;

interface StaffNotification {
  title: string;
  description?: string;
  fields?: { name: string; value: string }[];
}

/**
 * Prévient l'équipe sur Discord via le webhook DISCORD_SITE_WEBHOOK_URL (salon privé de l'équipe).
 * Sans variable d'environnement, ou si Discord ne répond pas, ne fait rien : ne doit jamais faire échouer une requête.
 */
export async function notifyStaff({ title, description, fields }: StaffNotification): Promise<void> {
  const url = process.env.DISCORD_SITE_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Medecine Hub — Site",
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: title.slice(0, 250),
            description: description?.slice(0, 3500),
            color: DISCORD_EMBED_COLOR,
            fields: fields?.map((field) => ({
              name: field.name.slice(0, 250),
              value: field.value.slice(0, 1000),
              inline: true,
            })),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Discord injoignable : l'e-mail reste la source de vérité.
  }
}
