import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/server/security";
import { readUsers } from "@/lib/server/userStore";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const store = readUsers();
  const users = Object.values(store).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );

  return NextResponse.json({
    success: true,
    total: users.length,
    users: users.map((user) => ({
      name: user.name,
      email: user.email,
      handle: user.handle,
      role: user.role,
      firstSeenAt: user.firstSeenAt,
      lastSeenAt: user.lastSeenAt,
      hasCustomAvatar: Boolean(user.avatarPath),
    })),
  });
}
