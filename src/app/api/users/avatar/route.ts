import { NextRequest, NextResponse } from "next/server";
import { chmod, mkdir, unlink, writeFile } from "fs/promises";
import { safeJoinInside } from "@/lib/server/security";
import { readUsers, sanitizeSub, setUserAvatar } from "@/lib/server/userStore";
import {
  ALLOWED_AVATAR_MIME_TYPES as ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_SIZE_BYTES as MAX_IMAGE_SIZE_BYTES,
  MAX_AVATAR_SIZE_LABEL,
} from "@/lib/avatarUpload";

function avatarDir() {
  return safeJoinInside(process.cwd(), "public", "images", "users");
}

async function removeExistingAvatarFile(sub: string) {
  for (const ext of Object.values(ALLOWED_IMAGE_TYPES)) {
    try {
      await unlink(safeJoinInside(avatarDir(), `${sub}.${ext}`));
    } catch {
      // pas grave si le fichier n'existe pas dans ce format
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const sub = sanitizeSub(formData.get("sub"));

    if (!readUsers()[sub]) {
      return NextResponse.json(
        { success: false, message: "Utilisateur inconnu — reconnectez-vous" },
        { status: 404 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Fichier manquant" },
        { status: 400 }
      );
    }

    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { success: false, message: "Format d'image non autorisé" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `Image trop lourde (${MAX_AVATAR_SIZE_LABEL} maximum)` },
        { status: 400 }
      );
    }

    const dir = avatarDir();
    await mkdir(dir, { recursive: true });
    await removeExistingAvatarFile(sub);

    const filename = `${sub}.${ext}`;
    const filepath = safeJoinInside(dir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    try {
      await chmod(filepath, 0o644);
    } catch (chmodError) {
      console.error("Erreur chmod avatar:", chmodError);
    }

    const path = `/images/users/${filename}?v=${Date.now()}`;
    setUserAvatar(sub, path);

    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error("Erreur upload avatar:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sub: rawSub } = (await req.json()) as { sub?: string };
    const sub = sanitizeSub(rawSub);

    await removeExistingAvatarFile(sub);
    setUserAvatar(sub, undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 400 }
    );
  }
}
