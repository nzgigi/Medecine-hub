"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import {
  decodeGoogleCredential,
  saveLocalUserProfile,
} from "@/lib/userProfile";

export default function ConnexionPage() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setError(
        "Connexion Google non configurée. Ajoutez NEXT_PUBLIC_GOOGLE_CLIENT_ID dans l'environnement."
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        setError("Google n'a pas pu être initialisé.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: (response) => {
          try {
            if (!response.credential) {
              throw new Error("Aucun profil Google reçu");
            }

            const profile = decodeGoogleCredential(response.credential);
            saveLocalUserProfile(profile);
            router.push("/compte");
          } catch (eventError) {
            setError(
              eventError instanceof Error
                ? eventError.message
                : "Connexion impossible"
            );
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
      });

      setReady(true);
    };

    script.onerror = () => {
      setError("Impossible de charger Google Sign-In.");
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [clientId, router]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-16 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_420px] md:items-center">
        <section>
          <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-300">
            <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Connexion locale, sans base utilisateur
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
            Retrouver ses révisions sans créer un vrai compte lourd.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-stone-600 dark:text-stone-300">
            Google sert uniquement à vous reconnaître dans ce navigateur. Les
            statistiques affichées restent locales: historique QCM, scores et
            progression enregistrés sur votre appareil.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-700 dark:text-emerald-300"
          >
            Retour aux annales
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <UserRound className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-black">Connexion</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
            Continuez avec votre compte Google pour ouvrir votre tableau de bord
            personnel.
          </p>

          <div className="mt-6 min-h-11" ref={buttonRef} />

          {!ready && !error && (
            <p className="mt-3 text-sm text-stone-500">Chargement de Google...</p>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
