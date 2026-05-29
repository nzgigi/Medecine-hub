import Link from "next/link";
import { Home, Search, BookOpen, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-extrabold text-white/20 mb-4 select-none">
            404
          </h1>

          <div className="w-24 h-24 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/20">
            <Search className="w-12 h-12 text-white" />
          </div>
        </div>

        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
          Page introuvable
        </h2>

        <p className="text-xl text-blue-100 mb-12 leading-relaxed">
          Oups ! Il semblerait que cette page n&apos;existe pas ou a été
          déplacée.
          <br />
          Retournez à l&apos;accueil pour continuer vos révisions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
          >
            <Home className="w-5 h-5" />
            Retour à l&apos;accueil
          </Link>

          <Link
            href="/#matieres"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all border border-white/30"
          >
            <BookOpen className="w-5 h-5" />
            Voir les matières
          </Link>
        </div>

        <div className="mt-16 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <p className="text-white/90 font-medium mb-4">Suggestions :</p>

          <ul className="text-left text-blue-100 space-y-2">
            <li className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Vérifiez l&apos;URL dans la barre d&apos;adresse
            </li>

            <li className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Utilisez le menu de navigation
            </li>

            <li className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Consultez nos matières disponibles
            </li>
          </ul>
        </div>
      </div>

      <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
    </div>
  );
}