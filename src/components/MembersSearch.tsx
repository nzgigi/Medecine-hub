"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, Sparkles } from "lucide-react";

interface MemberEntry {
  sub: string;
  handle: string;
  name: string;
  picture?: string;
  avatarPath?: string;
  role: "etudiant" | "administrateur";
  totalAttempts: number;
  achievementsCount: number;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export default function MembersSearch({ members }: { members: MemberEntry[] }) {
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return members;

    return members.filter((member) =>
      normalize(member.name).includes(normalizedQuery)
    );
  }, [members, query]);

  return (
    <>
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un membre par pseudo..."
          className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-100"
        />
      </div>

      {filteredMembers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Aucun membre ne correspond à &quot;{query}&quot;.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredMembers.map((member) => {
            const avatarSrc = member.avatarPath || member.picture;

            return (
              <Link
                key={member.sub}
                href={`/profil/${member.handle}`}
                className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 dark:border-stone-800 dark:bg-[#1d1c18] dark:hover:border-emerald-700"
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt={member.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {member.name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-bold">{member.name}</p>
                    {member.role === "administrateur" && (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                    {member.totalAttempts} épreuve{member.totalAttempts > 1 ? "s" : ""}
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <Sparkles className="h-3 w-3" />
                    {member.achievementsCount}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
