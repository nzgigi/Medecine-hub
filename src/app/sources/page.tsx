import Link from 'next/link';
import { FileText, ExternalLink, Download, Heart, ArrowLeft } from 'lucide-react';

export default function SourcesPage() {
  const sources = [
    {
      annee: 2025,
      matieres: [
        { nom: 'Cardiologie', date: '23 janvier 2025', lien: '#' },
        { nom: 'Diabétologie', date: '22 janvier 2025', lien: '#' },
        { nom: 'Formation à la recherche', date: '22 janvier 2025', lien: '#' },
        { nom: 'Gériatrie', date: '22 janvier 2025', lien: '#' },
        { nom: 'Gastroentérologie', date: '23 janvier 2025', lien: '#' },
        { nom: 'Infectiologie', date: '24 janvier 2025', lien: '#' },
        { nom: 'Pneumologie', date: '23 janvier 2025', lien: '#' },
        { nom: 'Radiologie', date: '23 janvier 2025', lien: '#' },
        { nom: 'Urologie', date: '24 janvier 2025', lien: '#' },
      ]
    },
    {
      annee: 2024,
      matieres: [
        { nom: 'Cardiologie', date: '25 janvier 2024', lien: '#' },
        { nom: 'Diabétologie', date: '24 janvier 2024', lien: '#' },
        { nom: 'Formation générale à la recherche', date: '24 janvier 2024', lien: '#' },
        { nom: 'Gériatrie', date: '24 janvier 2024', lien: '#' },
        { nom: 'Gastroentérologie', date: '25 janvier 2024', lien: '#' },
        { nom: 'Maladies transmissibles', date: '26 janvier 2024', lien: '#' },
        { nom: 'Pneumologie', date: '25 janvier 2024', lien: '#' },
        { nom: 'Radiologie', date: '25 janvier 2024', lien: '#' },
        { nom: 'Urologie', date: '26 janvier 2024', lien: '#' },
      ]
    },
    {
      annee: 2023,
      matieres: [
        { nom: 'Cardiologie', date: '18 janvier 2023', lien: '#' },
        { nom: 'Diabétologie', date: '17 janvier 2023', lien: '#' },
        { nom: 'Formation générale à la recherche', date: '17 janvier 2023', lien: '#' },
        { nom: 'Gériatrie', date: '17 janvier 2023', lien: '#' },
        { nom: 'Gastroentérologie', date: '18 janvier 2023', lien: '#' },
        { nom: 'Maladies transmissibles', date: '16 janvier 2023', lien: '#' },
        { nom: 'Pneumologie', date: '18 janvier 2023', lien: '#' },
        { nom: 'Radiologie', date: '18 janvier 2023', lien: '#' },
        { nom: 'Urologie', date: '16 janvier 2023', lien: '#' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900">Sources des annales</h1>
              <p className="text-gray-600 mt-1">DFASM1 - Université Paris Cité</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
            <p className="text-gray-700 leading-relaxed">
              Tous les QCM présents sur Medecine Hub proviennent des <strong>examens officiels de DFASM1</strong> organisés 
              par l'Université Paris Cité. Ces documents sont accessibles publiquement et nous les avons compilés 
              pour faciliter vos révisions.
            </p>
          </div>

          {/* Liste des sources par année */}
          <div className="space-y-8">
            {sources.map((anneeData) => (
              <div key={anneeData.annee}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-lg">
                    {anneeData.annee}
                  </span>
                  <span className="text-gray-400 text-lg">({anneeData.matieres.length} examens)</span>
                </h2>

                <div className="grid gap-3">
                  {anneeData.matieres.map((matiere, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{matiere.nom}</h3>
                          <p className="text-sm text-gray-500">{matiere.date}</p>
                        </div>
                      </div>
                      <a
                        href={matiere.lien}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Credit */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-start gap-4">
              <Heart className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Remerciements</h3>
                <p className="text-gray-600 leading-relaxed">
                  Un grand merci à l'<strong>Université Paris Cité</strong> et aux enseignants du DFASM1 
                  pour la qualité des examens et leur mise à disposition publique. Ces ressources sont 
                  essentielles pour la formation des futurs médecins.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
              ⚠️ Avertissement
            </h3>
            <p className="text-sm text-yellow-800 leading-relaxed">
              Medecine Hub est un projet étudiant indépendant et non affilié à l'Université Paris Cité. 
              Les annales sont utilisées à des fins pédagogiques uniquement. Si vous êtes titulaire de droits 
              sur ces documents et souhaitez leur retrait, contactez-nous.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105"
          >
            Commencer à réviser
          </Link>
        </div>
      </div>
    </div>
  );
}
