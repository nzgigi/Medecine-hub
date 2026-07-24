import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Droplet,
  FileText,
  Heart,
  Microscope,
  Scan,
  Stethoscope,
  Syringe,
  User,
  Wind,
} from "lucide-react";
import { SUBJECT_ICONS, getSubjectColorStyle } from "@/lib/subjectStyles";

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
  subjectIcon?: string;
  subjectColor?: string;
}

const accents: Record<string, string> = {
  Cardiologie: "text-red-700 bg-red-50 border-red-100 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900",
  Diabetologie:
    "text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-900",
  "Formation a la recherche":
    "text-sky-700 bg-sky-50 border-sky-100 dark:text-sky-300 dark:bg-sky-950/30 dark:border-sky-900",
  Geriatrie:
    "text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900",
  Gastroenterologie:
    "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900",
  Infectiologie:
    "text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-900",
  Pneumologie:
    "text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/30 dark:border-cyan-900",
  Radiologie:
    "text-indigo-700 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-900",
  Urologie:
    "text-teal-700 bg-teal-50 border-teal-100 dark:text-teal-300 dark:bg-teal-950/30 dark:border-teal-900",
};

function getAccent(matiere: string) {
  return (
    accents[matiere] ||
    "text-stone-700 bg-stone-50 border-stone-100 dark:text-stone-300 dark:bg-[#1d1c18] dark:border-stone-700"
  );
}

function renderMatiereIcon(matiere: string) {
  const className = "h-5 w-5";

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
    case "Pneumologie":
      return <Wind className={className} />;
    case "Radiologie":
      return <Camera className={className} />;
    case "Urologie":
      return <Droplet className={className} />;
    default:
      return <Stethoscope className={className} />;
  }
}

export default function MatiereCard({
  matiere,
  slug,
  totalQuestions,
  exams,
  subjectIcon,
  subjectColor,
}: MatiereCardProps) {
  const colorStyle = getSubjectColorStyle(subjectColor);
  const accent = colorStyle?.className || getAccent(matiere);
  const CustomIcon = subjectIcon ? SUBJECT_ICONS[subjectIcon] : undefined;

  return (
    <article className="h-full rounded-lg border border-stone-200 bg-white transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-[#151512] dark:hover:border-stone-700">
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`inline-flex rounded-lg border p-2 ${accent}`}
            style={colorStyle?.style}
          >
            {CustomIcon ? (
              <CustomIcon className="h-5 w-5" />
            ) : (
              renderMatiereIcon(matiere)
            )}
          </div>

          <div className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1 text-xs font-bold text-stone-600 dark:border-stone-700 dark:text-stone-300">
            <BookOpen className="h-3.5 w-3.5" />
            {exams.length}
          </div>
        </div>

        <h3 className="mt-5 text-xl font-black tracking-tight text-stone-950 dark:text-stone-100">
          {matiere}
        </h3>

        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {totalQuestions} questions disponibles
        </p>

        <div className="mt-5 flex-1 space-y-2">
          {exams.map((exam) => (
            <Link
              key={`${slug}-${exam.annee}`}
              href={`/qcm/${slug}/${exam.annee}`}
              className="group flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 transition-colors hover:border-emerald-800 hover:bg-white dark:border-stone-800 dark:bg-[#151512] dark:hover:border-emerald-700 dark:hover:bg-[#1d1c18]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-300">
                  <FileText className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                    {exam.title}
                  </span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400">
                    Année {exam.annee}
                  </span>
                </span>
              </span>

              <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300" />
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
