export interface LocalUserProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  customPicture?: string;
  signedInAt: string;
}

interface GoogleJwtPayload {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

export const USER_PROFILE_STORAGE_KEY = "medecine_hub_user";
export const USER_PROFILE_UPDATED_EVENT = "medecine-hub-profile-updated";

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(padded);

  return decodeURIComponent(
    decoded
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

export function decodeGoogleCredential(credential: string): LocalUserProfile {
  const [, payload] = credential.split(".");
  if (!payload) throw new Error("Credential Google invalide");

  const parsed = JSON.parse(decodeBase64Url(payload)) as GoogleJwtPayload;

  if (!parsed.sub || !parsed.email || !parsed.name) {
    throw new Error("Profil Google incomplet");
  }

  return {
    sub: parsed.sub,
    name: parsed.name,
    email: parsed.email,
    picture: parsed.picture,
    signedInAt: new Date().toISOString(),
  };
}

export function getLocalUserProfile(): LocalUserProfile | null {
  if (typeof window === "undefined") return null;

  const rawProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (!rawProfile) return null;

  try {
    return JSON.parse(rawProfile) as LocalUserProfile;
  } catch {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    return null;
  }
}

export function saveLocalUserProfile(profile: LocalUserProfile) {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT));
}

export function clearLocalUserProfile() {
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT));
}

export function updateLocalUserProfile(
  updates: Partial<Pick<LocalUserProfile, "customPicture" | "name">>
) {
  const currentProfile = getLocalUserProfile();
  if (!currentProfile) return null;

  const nextProfile = {
    ...currentProfile,
    ...updates,
  };

  saveLocalUserProfile(nextProfile);

  return nextProfile;
}

export function getProfilePicture(profile: LocalUserProfile) {
  return profile.customPicture || profile.picture;
}
