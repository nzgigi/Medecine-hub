"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { useAdminSessionExpiry } from "@/lib/adminSession";

export default function AdminSessionBadge() {
  const { remainingLabel, isExpiringSoon } = useAdminSessionExpiry();

  if (!remainingLabel) return null;

  return (
    <Link
      href="/admin/login"
      title={
        isExpiringSoon
          ? "Session bientot expiree, clique pour te reconnecter"
          : "Temps restant avant expiration de la session admin"
      }
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
        isExpiringSoon
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          : "border-stone-200 bg-white text-stone-500 hover:bg-stone-100 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-400"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      Session {remainingLabel}
    </Link>
  );
}
