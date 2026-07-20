"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("admin_token", data.token);
        router.push("/admin");
      } else {
        setError(data.error || "Identifiants incorrects");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-gray-950 dark:text-gray-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex flex-col justify-between border-r border-stone-200 bg-white px-12 py-10 dark:border-gray-800 dark:bg-gray-900">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-950 dark:text-gray-300 dark:hover:text-white"
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
            <p className="mt-5 text-lg leading-8 text-stone-600 dark:text-gray-300">
              Un espace de pilotage pour organiser les matieres, verifier les
              QCM et garder les epreuves propres avant publication.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {["Acces securise", "QCM publics", "Backups"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-stone-200 p-4 font-semibold text-stone-700 dark:border-gray-800 dark:text-gray-200"
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-gray-300"
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
              <p className="mt-2 text-sm text-stone-500 dark:text-gray-400">
                Connectez-vous pour gerer les epreuves, les menus et la qualite
                des fichiers QCM.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-gray-200">
                Nom d&apos;utilisateur
              </label>
              <div className="relative mb-5">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-11 pr-4 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/30"
                  placeholder="admin"
                  required
                />
              </div>

              <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-gray-200">
                Mot de passe
              </label>
              <div className="relative mb-6">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-11 pr-4 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/30"
                  placeholder="Mot de passe admin"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                {loading ? "Connexion..." : "Ouvrir le dashboard"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
