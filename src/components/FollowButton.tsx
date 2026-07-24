"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { getLocalUserProfile } from "@/lib/userProfile";

interface FollowButtonProps {
  targetHandle: string;
  targetSub: string;
}

export default function FollowButton({ targetHandle, targetSub }: FollowButtonProps) {
  const [ownSub, setOwnSub] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const profile = getLocalUserProfile();

    if (!profile) {
      setLoading(false);
      return;
    }

    setOwnSub(profile.sub);

    fetch(`/api/social/follow-status?sub=${encodeURIComponent(profile.sub)}&targetHandle=${encodeURIComponent(targetHandle)}`)
      .then((response) => response.json())
      .then((result: { success: boolean; following?: boolean }) => {
        if (result.success) setFollowing(Boolean(result.following));
      })
      .finally(() => setLoading(false));
  }, [targetHandle]);

  if (loading) return null;
  if (!ownSub || ownSub === targetSub) return null;

  const toggleFollow = async () => {
    setPending(true);

    try {
      const response = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub: ownSub,
          targetHandle,
          action: following ? "unfollow" : "follow",
        }),
      });

      const result = (await response.json()) as { success: boolean; following?: boolean };
      if (result.success) setFollowing(Boolean(result.following));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        following
          ? "border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
          : "bg-emerald-800 text-white hover:bg-emerald-700"
      }`}
    >
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Abonné(e)" : "Suivre"}
    </button>
  );
}
