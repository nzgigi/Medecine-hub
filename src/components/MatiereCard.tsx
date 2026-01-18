import Link from 'next/link';
import { Heart, Syringe, Microscope, User, Scan, Bug, Wind, Camera, Droplet } from 'lucide-react';

interface MatiereCardProps {
  matiere: string;
  slug: string;
  totalQuestions: number;
  annees: number[];
}

const getIcon = (matiere: string) => {
  const icons: { [key: string]: any } = {
    'Cardiologie': Heart,
    'Diabetologie': Syringe,
    'Formation a la recherche': Microscope,
    'Geriatrie': User,
    'Gastroenterologie': Scan,
    'Infectiologie': Bug,
    'Pneumologie': Wind,
    'Radiologie': Camera,
    'Urologie': Droplet,
  };
  return icons[matiere] || Microscope;
};

const getColor = (matiere: string) => {
  const colors: { [key: string]: string } = {
    'Cardiologie': 'from-red-500 to-pink-500',
    'Diabetologie': 'from-purple-500 to-indigo-500',
    'Formation a la recherche': 'from-blue-500 to-cyan-500',
    'Geriatrie': 'from-orange-500 to-yellow-500',
    'Gastroenterologie': 'from-green-500 to-emerald-500',
    'Infectiologie': 'from-pink-500 to-rose-500',
    'Pneumologie': 'from-sky-500 to-blue-500',
    'Radiologie': 'from-violet-500 to-purple-500',
    'Urologie': 'from-teal-500 to-cyan-500',
  };
  return colors[matiere] || 'from-gray-500 to-slate-500';
};

export default function MatiereCard({ matiere, slug, totalQuestions, annees }: MatiereCardProps) {
  const Icon = getIcon(matiere);
  const gradient = getColor(matiere);

  return (
    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
      
      <div className="relative p-6">
        {/* Icon avec fond gradient */}
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Titre */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {matiere}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <span className="font-semibold text-blue-600">{totalQuestions}</span>
          <span>questions</span>
          <span className="text-gray-400">•</span>
          <span>{annees.length} année{annees.length > 1 ? 's' : ''}</span>
        </div>

        {/* Années cliquables */}
        <div className="flex flex-wrap gap-2">
          {annees.map((annee) => (
            <Link
              key={annee}
              href={`/qcm/${slug}/${annee}`}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border-2 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:scale-105 hover:shadow-md transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {annee}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
