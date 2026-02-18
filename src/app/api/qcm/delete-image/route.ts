import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { imagePath } = await req.json();
    if (!imagePath) return NextResponse.json({ success: false }, { status: 400 });

    const fullPath = path.join(process.cwd(), "public", imagePath);
    await unlink(fullPath);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Fichier introuvable" }, { status: 404 });
  }
}
