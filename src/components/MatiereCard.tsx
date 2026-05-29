import Link from "next/link";
import {
  Heart,
  Syringe,
  Microscope,
  User,
  Scan,
  Bug,
  Wind,
  Camera,
  Droplet,
  FileText,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface ExamPreview {
  annee: number;
  title: string;
  order: number;
}

interface MatiereCardProps {
  matiere: string;
  slug: string;
  totalQuestions: number;
  exams: ExamPreview[];
}

const colors: Record<string, string> = {
  Cardiologie: "from-red-500 to-pink-500",
  Diabetologie: "from-purple-500 to-indigo-500",
  "Formation a la recherche": "from-blue-500 to-cyan-500",
  Geriatrie: "from-orange-500 to-yellow-500",
  Gastroenterologie: "from-green-500 to-emerald-500",
  Infectiologie: "from-pink-500 to-rose-500",
  Pneumologie: "from-sky-500 to-blue-500",
  Radiologie: "from-violet-500 to-purple-500",
  Urologie: "from-teal-500 to-cyan-500",
};

const softColors: Record<string, string> = {
  Cardiologie:
    "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800",
  Diabetologie:
    "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800",
  "Formation a la recherche":
    "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800",
  Geriatrie:
    "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800",
  Gastroenterologie:
    "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800",
  Infectiologie:
    "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/20 dark:text-pink-200 dark:border-pink-800",
  Pneumologie:
    "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-800",
  Radiologie:
    "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-200 dark:border-violet-800",
  Urologie:
    "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-200 dark:border-teal-800",
};

function getColor(matiere: string) {
  return colors[matiere] || "from-gray-500 to-slate-500";
}

function getSoftColor(matiere: string) {
  return (
    softColors[matiere] ||
    "bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
  );
}

function renderMatiereIcon(matiere: string) {
  const className = "w-8 h-8 text-white";

  switch (matiere) {
    case "Cardiologie":
      return <Heart className={className} />;
    case "Diabetologie":
      return <Syringe className={className} />;
    case "Formation a la recherche":
      return <Microscope className={className} />;
    case "Geriatrie":
      return <User className={className} />;
    case "Gastroenterologie":
      return <Scan className={className} />;
    case "Infectiologie":
      return <Bug className={className} />;
    case "Pneumologie":
      return <Wind className={className} />;
    case "Radiologie":
      return <Camera className={className} />;
    case "Urologie":
      return <Droplet className={className} />;
    default:
      return <Microscope className={className} />;
  }
}

export default function MatiereCard({
  matiere,
  slug,
  totalQuestions,
  exams,
}: MatiereCardProps) {
  const gradient = getColor(matiere);
  const softColor = getSoftColor(matiere);

  return (
    <article className="group relative h-full overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />

      <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/20 transition-all" />

      <div className="relative p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
          >
            {renderMatiereIcon(matiere)}
          </div>

          <div
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${softColor}`}
          >
            <BookOpen className="w-3 h-3" />
            {exams.length} épreuve{exams.length > 1 ? "s" : ""}
          </div>
        </div>

        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">
          {matiere}
        </h3>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-5">
          <span className="font-extrabold text-blue-600 dark:text-blue-400">
            {totalQuestions}
          </span>
          <span>questions disponibles</span>
        </div>

        <div className="space-y-2 flex-1">
          {exams.map((exam) => (
            <Link
              key={`${slug}-${exam.annee}`}
              href={`/qcm/${slug}/${exam.annee}`}
              className="group/exam flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/60 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all duration-200"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-blue-600 dark:text-blue-300 group-hover/exam:bg-white/20 group-hover/exam:text-white group-hover/exam:border-white/20 transition-all flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900 dark:text-gray-100 group-hover/exam:text-white truncate">
                    {exam.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 group-hover/exam:text-blue-100">
                    Année {exam.annee}
                  </span>
                </span>
              </span>

              <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover/exam:text-white group-hover/exam:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        {exams.length === 0 && (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucune épreuve disponible pour cette matière.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}