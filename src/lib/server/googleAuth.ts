interface GoogleTokenInfo {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
}

export interface VerifiedGoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Vérifie un jeton d'identité Google (JWT reçu du bouton "Continuer avec
 * Google") en le soumettant à l'endpoint tokeninfo de Google, plutôt que de
 * décoder son contenu à l'aveugle. Ça évite qu'un appel direct à nos routes
 * /api/users/* puisse s'inventer n'importe quel utilisateur.
 */
export async function verifyGoogleCredential(
  credential: unknown
): Promise<VerifiedGoogleProfile> {
  if (typeof credential !== "string" || !credential) {
    throw new Error("Jeton Google manquant");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      credential
    )}`
  );

  if (!response.ok) {
    throw new Error("Jeton Google invalide ou expiré");
  }

  const payload = (await response.json()) as GoogleTokenInfo;

  const expectedAudience = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!expectedAudience || payload.aud !== expectedAudience) {
    throw new Error("Jeton Google non reconnu pour ce site");
  }

  if (!payload.sub || !payload.email || !payload.name) {
    throw new Error("Profil Google incomplet");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}
