"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [responseMessage, setResponseMessage] = useState("");

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }

    if (!formData.email.trim()) {
      newErrors.email = "L’adresse e-mail est requise";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L’adresse e-mail semble invalide";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Le sujet est requis";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Le message est requis";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Le message doit contenir au moins 10 caractères";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("loading");
    setResponseMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l’envoi du message");
      }

      setStatus("success");
      setResponseMessage(
        "Votre message a bien été envoyé. Nous vous répondrons dans les meilleurs délais."
      );
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });

      setTimeout(() => {
        setStatus("idle");
        setResponseMessage("");
      }, 5000);
    } catch (error: unknown) {
      setStatus("error");

      const message =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue. Veuillez réessayer plus tard.";

      setResponseMessage(message);
    }
  };

  const inputClassName = (fieldName: string) =>
    `w-full rounded-lg border bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 ${
      errors[fieldName]
        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-red-700 dark:focus:ring-red-950/50"
        : "border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:focus:border-blue-500 dark:focus:ring-blue-950/50"
    }`;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {/* Retour */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        {/* Introduction */}
        <section className="pb-12 pt-14 sm:pb-16 sm:pt-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              <Mail className="h-4 w-4" />
              Nous contacter
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Une question ou une suggestion ?
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Vous avez remarqué un problème sur le site, vous souhaitez nous
              transmettre une remarque ou simplement poser une question ?
              Envoyez-nous un message à l&apos;aide du formulaire.
            </p>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Informations */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Pour quelles raisons nous écrire ?
              </h2>

              <div className="mt-6 space-y-5">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <AlertCircle className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Signaler un problème
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Une erreur, un bug ou une difficulté rencontrée pendant
                      votre utilisation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <Lightbulb className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Proposer une amélioration
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Une idée utile pour faciliter les révisions ou améliorer
                      la plateforme.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <Clock3 className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Délai de réponse
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Nous essayons généralement de répondre sous 24 à 48 heures.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Liens secondaires */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                Informations utiles
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Vous pouvez également consulter les informations relatives à la
                plateforme et à ses contenus.
              </p>

              <div className="mt-5 space-y-1">
                <Link
                  href="/sources"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Consulter les sources
                  </span>

                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/mentions-legales"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Mentions légales
                  </span>

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Formulaire */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Envoyez-nous un message
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Remplissez les champs ci-dessous. Nous utiliserons votre adresse
                e-mail uniquement pour vous répondre.
              </p>
            </div>

            {status === "success" && (
              <div
                role="status"
                className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-300" />
                <p className="text-sm leading-6 text-green-800 dark:text-green-200">
                  {responseMessage}
                </p>
              </div>
            )}

            {status === "error" && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-300" />
                <p className="text-sm leading-6 text-red-800 dark:text-red-200">
                  {responseMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Nom */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Nom complet
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.name)}
                    className={inputClassName("name")}
                    placeholder="Votre nom"
                  />

                  {errors.name && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Adresse e-mail
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    className={inputClassName("email")}
                    placeholder="nom@exemple.com"
                  />

                  {errors.email && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Sujet */}
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Sujet
                </label>

                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.subject)}
                  className={inputClassName("subject")}
                  placeholder="De quoi souhaitez-vous parler ?"
                />

                {errors.subject && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Message
                  </label>

                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formData.message.length} caractères
                  </span>
                </div>

                <textarea
                  id="message"
                  name="message"
                  rows={7}
                  value={formData.message}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.message)}
                  className={`${inputClassName("message")} resize-y`}
                  placeholder="Expliquez-nous votre demande avec autant de détails que nécessaire..."
                />

                {errors.message && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}