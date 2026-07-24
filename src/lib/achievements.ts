import {
  Calendar,
  Compass,
  Flag,
  Flame,
  Globe,
  Heart,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  flag: Flag,
  zap: Zap,
  medal: Medal,
  trophy: Trophy,
  star: Star,
  sparkles: Sparkles,
  compass: Compass,
  globe: Globe,
  "shield-check": ShieldCheck,
  "calendar-check": Calendar,
  flame: Flame,
  heart: Heart,
  users: Users,
  "user-plus": UserPlus,
};

export interface UserStatsForAchievements {
  totalAttempts: number;
  distinctMatieres: number;
  totalMatieresAvailable: number;
  perfectScores: number;
  bestScorePercent: number;
  avgScorePercent: number;
  totalQuestionsAnswered: number;
  distinctActiveDays: number;
  followersCount: number;
  followingCount: number;
}

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  check: (stats: UserStatsForAchievements) => boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "premier-pas",
    title: "Premier pas",
    description: "Termine ta première épreuve",
    icon: "flag",
    check: (stats) => stats.totalAttempts >= 1,
  },
  {
    key: "dix-epreuves",
    title: "Sur la lancée",
    description: "10 épreuves complétées",
    icon: "zap",
    check: (stats) => stats.totalAttempts >= 10,
  },
  {
    key: "cinquante-epreuves",
    title: "Marathonien",
    description: "50 épreuves complétées",
    icon: "medal",
    check: (stats) => stats.totalAttempts >= 50,
  },
  {
    key: "cent-epreuves",
    title: "Centurion",
    description: "100 épreuves complétées",
    icon: "trophy",
    check: (stats) => stats.totalAttempts >= 100,
  },
  {
    key: "sans-faute",
    title: "Sans faute",
    description: "Obtiens 100% sur une épreuve",
    icon: "star",
    check: (stats) => stats.perfectScores >= 1,
  },
  {
    key: "perfectionniste",
    title: "Perfectionniste",
    description: "5 épreuves réussies à 100%",
    icon: "sparkles",
    check: (stats) => stats.perfectScores >= 5,
  },
  {
    key: "touche-a-tout",
    title: "Touche-à-tout",
    description: "Au moins 3 matières différentes tentées",
    icon: "compass",
    check: (stats) => stats.distinctMatieres >= 3,
  },
  {
    key: "explorateur-complet",
    title: "Explorateur complet",
    description: "Toutes les matières du programme tentées",
    icon: "globe",
    check: (stats) =>
      stats.totalMatieresAvailable > 0 &&
      stats.distinctMatieres >= stats.totalMatieresAvailable,
  },
  {
    key: "serieux",
    title: "Sérieux(se)",
    description: "Moyenne d'au moins 80% sur 10 épreuves ou plus",
    icon: "shield-check",
    check: (stats) => stats.totalAttempts >= 10 && stats.avgScorePercent >= 80,
  },
  {
    key: "habitue",
    title: "Habitué(e)",
    description: "Actif(ve) sur 5 jours différents",
    icon: "calendar-check",
    check: (stats) => stats.distinctActiveDays >= 5,
  },
  {
    key: "increvable",
    title: "Increvable",
    description: "200 questions répondues au total",
    icon: "flame",
    check: (stats) => stats.totalQuestionsAnswered >= 200,
  },
  {
    key: "premier-fan",
    title: "Premier fan",
    description: "Obtiens ton premier abonné",
    icon: "heart",
    check: (stats) => stats.followersCount >= 1,
  },
  {
    key: "populaire",
    title: "Populaire",
    description: "10 abonnés",
    icon: "users",
    check: (stats) => stats.followersCount >= 10,
  },
  {
    key: "influenceur",
    title: "Influenceur(se)",
    description: "50 abonnés",
    icon: "trophy",
    check: (stats) => stats.followersCount >= 50,
  },
  {
    key: "sociable",
    title: "Sociable",
    description: "Suis au moins 5 membres",
    icon: "user-plus",
    check: (stats) => stats.followingCount >= 5,
  },
];

export const ACHIEVEMENTS_BY_KEY: Record<string, AchievementDefinition> = Object.fromEntries(
  ACHIEVEMENTS.map((achievement) => [achievement.key, achievement])
);

export function computeEarnedAchievementKeys(
  stats: UserStatsForAchievements
): string[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.check(stats)).map(
    (achievement) => achievement.key
  );
}
