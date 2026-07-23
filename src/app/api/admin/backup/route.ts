import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getAdminActor, requireAdminRequest } from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";

const execAsync = promisify(exec);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const date = new Date().toLocaleString("fr-FR");
    const cwd = process.cwd();

    const { stdout } = await execAsync(
      [
        "git add public/data/qcm/*.json public/images/qcm",
        `git commit -m "Backup manuel - ${date}"`,
        "git push origin main",
      ].join(" && "),
      { cwd }
    );

    logAdminAction(getAdminActor(request), "Backup manuel vers GitHub");

    return NextResponse.json({
      success: true,
      message: "Backup effectué sur GitHub",
      timestamp,
      details: stdout,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    if (message.includes("nothing to commit")) {
      return NextResponse.json({
        success: true,
        message: "Aucune modification à sauvegarder",
      });
    }

    console.error("Erreur backup:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors du backup: " + message,
      },
      { status: 500 }
    );
  }
}
