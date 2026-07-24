// Règles de validation partagées entre le formulaire (client) et l'API d'upload (serveur),
// pour éviter qu'un fichier accepté côté client soit rejeté côté serveur sans message clair.
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_SIZE_LABEL = "5 Mo";

export const ALLOWED_AVATAR_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const ALLOWED_AVATAR_ACCEPT = Object.keys(ALLOWED_AVATAR_MIME_TYPES).join(",");
