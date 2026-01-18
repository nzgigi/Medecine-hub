import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matiere, annee, qcmData } = body; // ✅ ICI

    if (!matiere || !annee || !qcmData) {
      return NextResponse.json(
        {
          success: false,
          message: "Données manquantes (matiere, annee ou qcmData)",
        },
        { status: 400 }
      );
    }

    const dirPath = path.join(process.cwd(), "public", "data", "qcm");
    const filePath = path.join(dirPath, `${matiere}_${annee}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(qcmData, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "QCM sauvegardé avec succès",
    });
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de la sauvegarde",
      },
      { status: 500 }
    );
  }
}
