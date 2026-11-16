"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GraduationCap, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { saveLocalUserProfile } from "@/lib/userProfile";

interface LoginUser {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  avatarPath?: string;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as {
    success: boolean;
    message?: string;
    user?: LoginUser;
  };

  if (!result.success) throw new Error(result.message || "Connexion impossible");

  return result;
}

function safeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");

  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function ConnexionPage() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const finishLogin = (user: LoginUser) => {
    saveLocalUserProfile({
      sub: user.sub,
      name: user.name,
      email: user.email,
      picture: user.picture,
      customPicture: user.avatarPath,
      signedInAt: new Date().toISOString(),
    });

    // Rechargement complet : le serveur doit voir le nouveau cookie de session.
    window.location.assign(safeNextPath());
  };

  useEffect(() => {
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: async (response) => {
          try {
            if (!response.credential) throw new Error("Aucun profil Google reçu");

            const result = await postJson("/api/auth/google", {
              credential: response.credential,
            });
            finishLogin(result.user!);
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
        width: Math.min(320, Math.max(200, buttonRef.current.offsetWidth)),
      });
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [clientId]);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    try {
      await postJson("/api/auth/request-code", { email });
      setStep("code");
      setInfo(`Un code à 6 chiffres vient d'être envoyé à ${email.trim()}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Envoi impossible"
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await postJson("/api/auth/verify-code", { email, code });
      finishLogin(result.user!);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : "Code incorrect"
      );
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100";
  const buttonClass =
    "w-full rounded-lg bg-emerald-800 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-60";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12 text-stone-950 dark:bg-[#151512] dark:text-stone-100 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_420px] md:items-center">
        <section>
          <div className="relative mb-6 h-20 w-20">
            <Image
              src="/brand/pfp-v2.png"
              alt="Medecine Hub"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-300">
            <GraduationCap className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Accès réservé aux étudiants de Toulouse
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
            Connectez-vous avec votre adresse universitaire.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-stone-600 dark:text-stone-300">
            Medecine Hub est ouvert aux étudiants et personnels de
            l&apos;université de Toulouse. Seules les adresses{" "}
            <strong>@utoulouse.fr</strong> et <strong>@univ-tlse3.fr</strong>{" "}
            donnent accès au site.
          </p>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {step === "email" ? (
              <Mail className="h-6 w-6" />
            ) : (
              <KeyRound className="h-6 w-6" />
            )}
          </div>

          <h2 className="text-2xl font-black">Connexion</h2>

          {step === "email" ? (
            <form onSubmit={requestCode} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold" htmlFor="email">
                Adresse e-mail universitaire
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="prenom.nom@univ-tlse3.fr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={busy} className={buttonClass}>
                {busy ? "Envoi..." : "Recevoir mon code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold" htmlFor="code">
                Code reçu par e-mail
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                className={`${inputClass} text-center text-2xl font-black tracking-[0.5em]`}
              />
              <button type="submit" disabled={busy} className={buttonClass}>
                {busy ? "Vérification..." : "Me connecter"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                  setInfo("");
                }}
                className="w-full text-sm font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              >
                Changer d&apos;adresse ou renvoyer un code
              </button>
            </form>
          )}

          {clientId && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-stone-400">
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
                ou
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              </div>
              <div className="min-h-11" ref={buttonRef} />
              <p className="mt-2 text-xs text-stone-500">
                Uniquement avec un compte Google lié à votre adresse
                universitaire.
              </p>
            </>
          )}

          {info && !error && (
            <div className="mt-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {info}
            </div>
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
