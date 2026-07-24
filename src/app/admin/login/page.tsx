"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  ShieldCheck,
} from "lucide-react";

export default function AdminLoginPage() {
  const [googleError, setGoogleError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setGoogleError("Connexion Google non configurée.");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        setGoogleError("Google n'a pas pu être initialisé.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: async (response) => {
          try {
            if (!response.credential) {
              throw new Error("Aucun profil Google reçu");
            }

            const apiResponse = await fetch("/api/auth/admin-google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });

            const data = await apiResponse.json();

            if (!apiResponse.ok || !data.success) {
              throw new Error(
                data.message || "Ce compte Google n'est pas autorisé"
              );
            }

            localStorage.setItem("admin_token", data.token);
            localStorage.setItem(
              "admin_identity",
              JSON.stringify({ name: data.name, picture: data.picture })
            );
            router.push("/admin");
          } catch (eventError) {
            setGoogleError(
              eventError instanceof Error
                ? eventError.message
                : "Connexion impossible"
            );
          }
        },
      });

      const googleButtonWidth = Math.min(
        320,
        Math.max(200, googleButtonRef.current.offsetWidth)
      );

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: googleButtonWidth,
      });

      setGoogleReady(true);
    };

    script.onerror = () => {
      setGoogleError("Impossible de charger Google Sign-In.");
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [clientId, router]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex flex-col justify-between border-r border-stone-200 bg-white px-12 py-10 dark:border-stone-800 dark:bg-[#1d1c18]">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>

          <div className="max-w-xl">
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <BookOpenCheck className="h-7 w-7" />
            </div>
            <h1 className="text-5xl font-black tracking-tight">
              Medecine Hub Admin
            </h1>
            <p className="mt-5 text-lg leading-8 text-stone-600 dark:text-stone-300">
              Un espace de pilotage pour organiser les matieres, verifier les
              QCM et garder les epreuves propres avant publication.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {["Acces securise", "QCM publics", "Backups"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-stone-200 p-4 font-semibold text-stone-700 dark:border-stone-800 dark:text-stone-200"
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        <main className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au site
              </Link>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-black">Connexion administrateur</h2>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Connectez-vous pour gerer les epreuves, les menus et la qualite
                des fichiers QCM.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
              <p className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-200">
                Connexion avec votre compte Google autorisé
              </p>

              <div className="min-h-11" ref={googleButtonRef} />

              {!googleReady && !googleError && (
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                  Chargement de Google...
                </p>
              )}

              {googleError && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
