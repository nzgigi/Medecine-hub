import {
  BookOpen,
  Camera,
  ChevronRight,
  Droplet,
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
  onOpen: () => void;
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
  totalQuestions,
  exams,
  subjectIcon,
  subjectColor,
  onOpen,
}: MatiereCardProps) {
  const colorStyle = getSubjectColorStyle(subjectColor);
  const accent = colorStyle?.className || getAccent(matiere);
  const CustomIcon = subjectIcon ? SUBJECT_ICONS[subjectIcon] : undefined;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-800 hover:bg-stone-50 dark:border-stone-800 dark:bg-[#151512] dark:hover:border-emerald-700 dark:hover:bg-[#1d1c18]"
    >
      <div
        className={`inline-flex shrink-0 rounded-lg border p-2.5 ${accent}`}
        style={colorStyle?.style}
      >
        {CustomIcon ? (
          <CustomIcon className="h-5 w-5" />
        ) : (
          renderMatiereIcon(matiere)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-black tracking-tight text-stone-950 dark:text-stone-100">
          {matiere}
        </h3>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {exams.length} épreuve{exams.length > 1 ? "s" : ""}
          </span>
          <span>&middot;</span>
          <span>{totalQuestions} questions</span>
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300" />
    </button>
  );
}
