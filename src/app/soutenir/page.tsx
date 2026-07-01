import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  ExternalLink,
  Heart,
  Mail,
  Server,
  Share2,
  ShieldCheck,
} from "lucide-react";

export default function SoutenirPage() {
  const contributions = [
    {
      icon: Server,
      title: "Maintenir la plateforme accessible",
      description:
        "Votre soutien contribue aux frais d’hébergement et permet de conserver un site rapide et disponible pour tous les étudiants.",
    },
    {
      icon: Code2,
      title: "Continuer à améliorer le site",
      description:
        "Nous pouvons corriger les problèmes rencontrés, améliorer l’interface et ajouter progressivement de nouvelles fonctionnalités utiles.",
    },
    {
      icon: ShieldCheck,
      title: "Préserver un accès entièrement gratuit",
      description:
        "L’objectif reste simple : proposer un espace d’entraînement accessible sans abonnement et sans limiter l’accès aux annales.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Retour */}
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
      </div>

      {/* Introduction */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            <Heart className="h-4 w-4" />
            Soutenir le projet
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Aidez-nous à faire grandir Medecine Hub
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Medecine Hub a été créé pour permettre aux étudiants de réviser
            gratuitement avec des annales et des QCM accessibles simplement.
            Votre soutien nous aide à maintenir cette plateforme et à continuer
            de l&apos;améliorer dans le temps.
          </p>
        </div>
      </section>

      {/* Contenu principal */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        {/* Colonne gauche */}
        <div className="space-y-8">
          {/* Pourquoi soutenir */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              À quoi sert votre soutien ?
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Chaque contribution est utilisée pour garder le projet fiable,
              accessible et agréable à utiliser au quotidien.
            </p>

            <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
              {contributions.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex gap-4 py-6 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partager le site */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Share2 className="h-5 w-5" />
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Vous pouvez aussi simplement partager le site
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Un don n&apos;est évidemment pas obligatoire. Parler de Medecine
              Hub à vos camarades de promotion est déjà une excellente manière
              de nous aider à faire connaître la plateforme.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Retourner sur la plateforme
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Colonne droite */}
        <aside className="space-y-6">
          {/* Carte PayPal */}
          <div className="rounded-2xl border border-blue-200 bg-blue-600 p-6 text-white shadow-sm dark:border-blue-800 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Heart className="h-5 w-5" />
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-tight">
              Faire un don
            </h2>

            <p className="mt-3 text-sm leading-6 text-blue-100">
              Même une petite contribution nous aide à couvrir les frais du site
              et à continuer de développer Medecine Hub.
            </p>

            <a
              href="https://paypal.me/reallynz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
            >
              Donner via PayPal
              <ExternalLink className="h-4 w-4" />
            </a>

            <p className="mt-4 text-center text-xs leading-5 text-blue-100">
              Le montant est libre. Merci pour votre aide.
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Mail className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              Une question ?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Vous pouvez nous écrire pour toute suggestion ou question
              concernant le projet.
            </p>

            <a
              href="mailto:nasimzouh@gmail.com"
              className="mt-4 inline-block break-all text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              nasimzouh@gmail.com
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}