"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import PrivateMistakesTab from "@/components/PrivateMistakesTab";
import { hasAdminToken } from "@/lib/exam/privateClient";

// Page réservée à l'administrateur : sans jeton valide, redirection vers la connexion admin,
// et les données (QCM et historique) sont de toute façon refusées côté serveur (401).
export default function PrivateMistakesPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      if (hasAdminToken()) setAllowed(true);
      else router.push("/admin/login");
    };

    check();
  }, [router]);

  if (!allowed) return null;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>

        <div className="mb-6 mt-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Mes erreurs privées</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Erreurs de tes QCM privés (épreuve et entraînement). Réussis une question une fois pour la retirer.
            </p>
          </div>
        </div>

        <PrivateMistakesTab />
      </div>
    </main>
  );
}
