import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { listMembers } from "@/lib/server/socialProfile";
import MembersSearch from "@/components/MembersSearch";

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
          <MembersSearch members={members} />
        )}
      </div>
    </main>
  );
}
