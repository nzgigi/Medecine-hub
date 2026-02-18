import Link from "next/link";
import {
  Heart,
  Coffee,
  Code,
  Zap,
  ArrowLeft,
  Mail,
} from "lucide-react";

export default function SoutenirPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 mb-8 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        {/* Hero Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden mb-8 border border-gray-100 dark:border-gray-800">
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 p-12 text-center text-white">
            <Heart className="w-20 h-20 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl font-extrabold mb-4">
              Soutenez Medecine hub
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              Aidez-nous à maintenir cette plateforme gratuite et à ajouter
              toujours plus de contenu pour les étudiants en médecine
            </p>
          </div>

          <div className="p-8 md:p-12">
            {/* Pourquoi soutenir */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Pourquoi nous soutenir ?
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Hébergement &amp; Infrastructure
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Maintenir le site accessible 24/7 avec de bonnes
                    performances coûte en serveur et bande passante.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-6 rounded-2xl border border-purple-200 dark:border-purple-800">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Développement continu
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Ajout de nouvelles fonctionnalités, corrections de bugs et
                    amélioration de l&apos;expérience utilisateur.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 p-6 rounded-2xl border border-pink-200 dark:border-pink-800">
                  <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-4">
                    <Coffee className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Motivation de l&apos;équipe
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Votre soutien nous motive à continuer d&apos;améliorer la
                    plateforme pour vous !
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-6 rounded-2xl border border-green-200 dark:border-green-800">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                    100% gratuit
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Nous nous engageons à garder Medecine Hub entièrement gratuit
                    pour tous les étudiants.
                  </p>
                </div>
              </div>
            </div>

            {/* Méthodes de soutien */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Comment nous aider ?
              </h2>

              <div className="space-y-4">
                {/* PayPal - Principal */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl border-4 border-blue-300 dark:border-blue-500">
                  <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Heart className="w-12 h-12" />
                      <div>
                        <h3 className="text-3xl font-bold">
                          Faites un don via PayPal
                        </h3>
                        <p className="text-blue-100 text-lg">
                          Le moyen le plus simple de nous soutenir
                        </p>
                      </div>
                    </div>
                    <p className="text-blue-50 mb-6">
                      Chaque contribution, quelle que soit son montant, nous
                      aide à maintenir la plateforme gratuite et à continuer de
                      l&apos;améliorer pour vous. Merci du fond du cœur ! 💙
                    </p>
                  </div>
                  <a
                    href="https://paypal.me/reallynz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl"
                  >
                    Donner via PayPal ❤️
                  </a>
                </div>

                {/* Partage */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <Zap className="w-10 h-10" />
                    <div>
                      <h3 className="text-2xl font-bold">
                        Partagez Medecine hub
                      </h3>
                      <p className="text-purple-100">
                        Parlez-en à vos camarades de promo !
                      </p>
                    </div>
                  </div>
                  <p className="text-purple-50">
                    Le meilleur soutien que vous puissiez nous apporter est de
                    faire connaître Medecine Hub auprès d&apos;autres étudiants qui
                    pourraient en bénéficier. 🚀
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-800">
              <Mail className="w-12 h-12 text-gray-600 dark:text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Une question ?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                N&apos;hésitez pas à nous contacter pour toute suggestion ou
                question
              </p>
              <a
                href="mailto:nasimzouh@gmail.com"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
              >
                nasimzouh@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Merci */}
        <div className="text-center bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-800">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Merci pour votre soutien ! 🙏
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            Grâce à vous, Medecine Hub peut rester gratuit et accessible à tous
            les étudiants en médecine.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
