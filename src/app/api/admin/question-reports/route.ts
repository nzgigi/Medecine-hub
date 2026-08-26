import { NextRequest, NextResponse } from "next/server";
import { getAdminActor, requireAdminRequest } from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";
import {
  deleteQuestionReport,
  listQuestionReports,
  setQuestionReportStatus,
} from "@/lib/server/questionReports";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ success: true, reports: listQuestionReports() });
}

interface ActionBody {
  action?: unknown;
  id?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as ActionBody;
    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { success: false, message: "Identifiant invalide" },
        { status: 400 }
      );
    }

    if (body.action === "resolve") {
      setQuestionReportStatus(id, "resolu");
      logAdminAction(getAdminActor(request), "Signalement marqué résolu", `#${id}`);
    } else if (body.action === "reopen") {
      setQuestionReportStatus(id, "nouveau");
      logAdminAction(getAdminActor(request), "Signalement rouvert", `#${id}`);
    } else if (body.action === "delete") {
      deleteQuestionReport(id);
      logAdminAction(getAdminActor(request), "Signalement supprimé", `#${id}`);
    } else {
      return NextResponse.json(
        { success: false, message: "Action inconnue" },
        { status: 400 }
      );
    }

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
