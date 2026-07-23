import {
  Activity,
  Bone,
  Brain,
  Camera,
  Droplet,
  Heart,
  Microscope,
  Pill,
  Scan,
  Stethoscope,
  Syringe,
  User,
  Wind,
  type LucideIcon,
} from "lucide-react";

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  heart: Heart,
  syringe: Syringe,
  microscope: Microscope,
  scan: Scan,
  wind: Wind,
  camera: Camera,
  droplet: Droplet,
  user: User,
  brain: Brain,
  bone: Bone,
  pill: Pill,
  activity: Activity,
};

export const SUBJECT_ICON_KEYS = Object.keys(SUBJECT_ICONS);

export const SUBJECT_COLORS: Record<string, string> = {
  emerald:
    "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900",
  red: "text-red-700 bg-red-50 border-red-100 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900",
  violet:
    "text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-900",
  sky: "text-sky-700 bg-sky-50 border-sky-100 dark:text-sky-300 dark:bg-sky-950/30 dark:border-sky-900",
  amber:
    "text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900",
  rose: "text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-900",
  cyan: "text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/30 dark:border-cyan-900",
  indigo:
    "text-indigo-700 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-900",
  teal: "text-teal-700 bg-teal-50 border-teal-100 dark:text-teal-300 dark:bg-teal-950/30 dark:border-teal-900",
  stone:
    "text-stone-700 bg-stone-50 border-stone-100 dark:text-stone-300 dark:bg-stone-900 dark:border-stone-700",
};

export const SUBJECT_COLOR_KEYS = Object.keys(SUBJECT_COLORS);

// Couleur de la pastille utilisée dans le sélecteur admin (fond plein, pas le style "badge").
export const SUBJECT_COLOR_SWATCH: Record<string, string> = {
  emerald: "bg-emerald-600",
  red: "bg-red-600",
  violet: "bg-violet-600",
  sky: "bg-sky-600",
  amber: "bg-amber-500",
  rose: "bg-rose-600",
  cyan: "bg-cyan-600",
  indigo: "bg-indigo-600",
  teal: "bg-teal-600",
  stone: "bg-stone-600",
};
