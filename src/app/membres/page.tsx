import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles, Users } from "lucide-react";
import { listMembers } from "@/lib/server/socialProfile";

export const dynamic = "force-dynamic";

export default function MembresPage() {
  const members = listMembers();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="mt-6 mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Membres</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {members.length} membre{members.length > 1 ? "s" : ""} sur Medecine Hub
            </p>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
            Aucun membre pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member) => {
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
      </div>
    </main>
  );
}
