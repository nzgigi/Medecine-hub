import Link from 'next/link';
import { ArrowLeft, Shield, Mail, Building } from 'lucide-react';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900">Mentions Légales</h1>
              <p className="text-gray-600 mt-1">Dernière mise à jour : Janvier 2026</p>
            </div>
          </div>

          <div className="prose prose-blue max-w-none space-y-8">
            {/* Éditeur du site */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="w-6 h-6 text-blue-600" />
                Éditeur du site
              </h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Nom du site :</strong> Medecine Hub<br />
                  <strong>Type :</strong> Plateforme éducative gratuite<br />
                  <strong>Responsable de publication :</strong> Nasim nz<br />
                  <strong>Statut :</strong> Projet étudiant non commercial
                </p>
              </div>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Hébergement</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Hébergeur :</strong> OnetSolutions<br />
                  <strong>Adresse :</strong> 1 Allée de l'Ecluse, 33370 YVRAC<br />
                  <strong>Pays :</strong> France
                </p>
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Propriété intellectuelle</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Le contenu présent sur Medecine Hub (structure, design, code source) est protégé par le droit d'auteur 
                et appartient à ses créateurs.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                <h3 className="font-bold text-yellow-900 mb-2">⚠️ Concernant les annales</h3>
                <p className="text-yellow-800 text-sm leading-relaxed">
                  Les annales et questions présentes sur Medecine Hub proviennent des examens officiels de DFASM1 
                  de l'Université Paris Cité. Ces documents sont utilisés à des fins pédagogiques uniquement. 
                  Si vous êtes titulaire de droits sur ces contenus et souhaitez leur retrait, veuillez nous contacter.
                </p>
              </div>
            </section>

            {/* Utilisation du site */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Conditions d'utilisation</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>Medecine Hub est un service gratuit destiné aux étudiants en médecine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>L'utilisation du site est libre et ne nécessite pas de création de compte</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>Les QCM sont fournis à titre indicatif pour la révision personnelle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>Nous ne garantissons pas l'exactitude à 100% des corrections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>La reproduction ou distribution commerciale du contenu est interdite</span>
                </li>
              </ul>
            </section>

            {/* Données personnelles */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Données personnelles</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Medecine Hub ne collecte aucune donnée personnelle des utilisateurs. Le site fonctionne sans 
                inscription et n'utilise pas de cookies de suivi.
              </p>
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                <h3 className="font-bold text-green-900 mb-2">✅ Respect de votre vie privée</h3>
                <p className="text-green-800 text-sm">
                  Aucune donnée personnelle n'est collectée, stockée ou partagée. Votre progression est sauvegardée 
                  uniquement localement sur votre appareil (localStorage).
                </p>
              </div>
            </section>

            {/* Limitation de responsabilité */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation de responsabilité</h2>
              <p className="text-gray-700 leading-relaxed">
                Medecine Hub est fourni "tel quel" sans garantie d'aucune sorte. Nous nous efforçons de maintenir 
                le site accessible et à jour, mais ne pouvons garantir :
              </p>
              <ul className="mt-4 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">−</span>
                  <span>La disponibilité permanente du service</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">−</span>
                  <span>L'exactitude absolue de tous les contenus pédagogiques</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">−</span>
                  <span>L'absence totale d'erreurs techniques</span>
                </li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                Contact
              </h2>
              <div className="bg-blue-50 p-6 rounded-xl">
                <p className="text-gray-700 leading-relaxed">
                  Pour toute question concernant ces mentions légales, le contenu du site, 
                  ou une demande de retrait de contenu :
                </p>
                <a 
                  href="mailto:nasimzouh@gmail.com" 
                  className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  nasimzouh@gmail.com
                </a>
              </div>
            </section>

            {/* Crédits */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Crédits</h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>Design & Développement :</strong> Nasim nz<br />
                <strong>Framework :</strong> Next.js 16<br />
                <strong>UI :</strong> Tailwind CSS & Lucide React<br />
                <strong>Sources des annales :</strong> Université Paris Cité - DFASM1
              </p>
            </section>

            {/* Modification */}
            <section className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500">
                Ces mentions légales peuvent être modifiées à tout moment. Dernière mise à jour : Janvier 2026.
              </p>
            </section>
          </div>
        </div>

        {/* Retour */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
