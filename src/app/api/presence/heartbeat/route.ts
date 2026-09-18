import { NextRequest, NextResponse } from "next/server";
import { recordHeartbeat, recordLeave } from "@/lib/server/presence";
import { sanitizeSub } from "@/lib/server/userStore";

const VISITOR_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_PATH_LENGTH = 200;

interface HeartbeatBody {
  visitorId?: unknown;
  sub?: unknown;
  path?: unknown;
  leaving?: unknown;
}

function sanitizePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > MAX_PATH_LENGTH) return undefined;

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HeartbeatBody;

    if (typeof body.visitorId !== "string" || !VISITOR_ID_PATTERN.test(body.visitorId)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (body.leaving === true) {
      recordLeave(body.visitorId);
      return NextResponse.json({ success: true });
    }

    const path = sanitizePath(body.path);

    if (path?.startsWith("/admin")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    let sub: string | undefined;

    if (body.sub !== undefined && body.sub !== null) {
      try {
        sub = sanitizeSub(body.sub);
      } catch {
        sub = undefined;
      }
    }

    recordHeartbeat({ visitorId: body.visitorId, sub, path });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
