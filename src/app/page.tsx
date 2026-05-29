"use client";

import { useEffect, useMemo, useState } from "react";
import MatiereCard from "@/components/MatiereCard";
import {
  BookOpen,
  Users,
  Sparkles,
  Heart,
  GraduationCap,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ExamPreview {
  annee: number;
  title: string;
  order: number;
}

interface MatiereData {
  matiere: string;
  slug: string;
  subjectOrder: number;
  exams: ExamPreview[];
  totalQuestions: number;
}

interface MatiereIndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  subjectOrder?: number;
  examOrder?: number;
  examTitle?: string;
}

function buildMatieresFromIndex(data: MatiereIndexEntry[]): MatiereData[] {
  const grouped: Record<string, MatiereData> = {};

  data.forEach((item, index) => {
    if (!grouped[item.slug]) {
      grouped[item.slug] = {
        matiere: item.matiere,
        slug: item.slug,
        subjectOrder: item.subjectOrder ?? index + 1,
        exams: [],
        totalQuestions: 0,
      };
    }

    grouped[item.slug].matiere = item.matiere;
    grouped[item.slug].subjectOrder = Math.min(
      grouped[item.slug].subjectOrder,
      item.subjectOrder ?? grouped[item.slug].subjectOrder
    );

    grouped[item.slug].exams.push({
      annee: item.annee,
      title: item.examTitle?.trim() || `${item.matiere} - ${item.annee}`,
      order: item.examOrder ?? item.annee,
    });

    grouped[item.slug].totalQuestions += item.total_questions;
  });

  return Object.values(grouped)
    .map((matiere) => ({
      ...matiere,
      exams: [...matiere.exams].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.subjectOrder - b.subjectOrder);
}

export default function HomePage() {
  const [matieres, setMatieres] = useState<MatiereData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    async function loadMatieres() {
      try {
        const response = await fetch("/data/qcm/index.json?t=" + Date.now());
        const data = (await response.json()) as MatiereIndexEntry[];

        setMatieres(buildMatieresFromIndex(data));
      } catch (error) {
        console.error("Erreur chargement:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMatieres();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) return;

      const x = Math.round((event.clientX / window.innerWidth) * 100);
      const y = Math.round((event.clientY / window.innerHeight) * 100);

      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const totalQuestions = useMemo(() => {
    return matieres.reduce((acc, matiere) => acc + matiere.totalQuestions, 0);
  }, [matieres]);

  const totalExams = useMemo(() => {
    return matieres.reduce((acc, matiere) => acc + matiere.exams.length, 0);
  }, [matieres]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-xl text-gray-600 dark:text-gray-300">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/50 via-transparent to-transparent" />

        <div
          className="pointer-events-none absolute -inset-20 opacity-70 transition-all duration-500"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.22), rgba(96,165,250,0.16) 18%, transparent 42%)`,
          }}
        />

        <div className="absolute top-20 left-10 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-24 right-10 w-56 h-56 bg-pink-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium mb-8 border border-white/20 shadow-lg">
              <Sparkles className="w-4 h-4" />
              <span>100% Gratuit • Annales médicales • Entraînement libre</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
              Révisez avec
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200">
                Medecine Hub
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
              Une plateforme gratuite pour s’entraîner sur des annales, suivre
              sa progression et travailler les dossiers comme en conditions
              d’examen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#matieres"
                className="inline-flex items-center gap-2 bg-white text-blue-700 px-7 py-4 rounded-2xl font-extrabold shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                <BookOpen className="w-5 h-5" />
                Commencer à réviser
              </a>

              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-7 py-4 rounded-2xl font-bold border border-white/20">
                <ShieldCheck className="w-5 h-5" />
                Accès libre et gratuit
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-lg">
              <BookOpen className="w-7 h-7 mx-auto mb-3 text-yellow-200" />
              <div className="text-3xl font-extrabold">{totalQuestions}</div>
              <div className="text-sm text-blue-100">questions</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-lg">
              <GraduationCap className="w-7 h-7 mx-auto mb-3 text-pink-200" />
              <div className="text-3xl font-extrabold">{totalExams}</div>
              <div className="text-sm text-blue-100">épreuves</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center shadow-lg">
              <Users className="w-7 h-7 mx-auto mb-3 text-cyan-200" />
              <div className="text-3xl font-extrabold">{matieres.length}</div>
              <div className="text-sm text-blue-100">matières</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="text-gray-50 dark:text-gray-950"
              fill="currentColor"
            />
          </svg>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-7 border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-5">
              <BookOpen className="w-7 h-7 text-white" />
            </div>

            <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              Annales structurées
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Les épreuves peuvent être organisées en dossiers, questions
              isolées et formats progressifs.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-7 border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-5">
              <Zap className="w-7 h-7 text-white" />
            </div>

            <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              Correction claire
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Après soumission, l’étudiant retrouve ses erreurs, ses oublis et
              ses bonnes réponses.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-7 border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-5">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>

            <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              Sauvegarde auto
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Les réponses en cours sont sauvegardées localement pour éviter de
              perdre une tentative.
            </p>
          </div>
        </section>

        <section id="matieres" className="pb-20 scroll-mt-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-blue-100 dark:border-blue-800">
              <GraduationCap className="w-4 h-4" />
              Bibliothèque d’annales
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
              Choisissez votre matière
            </h2>

            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Parcourez les annales classées par spécialité et épreuve.
            </p>
          </div>

          {matieres.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matieres.map((matiere) => (
                <MatiereCard
                  key={matiere.slug}
                  matiere={matiere.matiere}
                  slug={matiere.slug}
                  totalQuestions={matiere.totalQuestions}
                  exams={matiere.exams}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-10 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune matière</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Aucune annale n&apos;est disponible pour le moment.
              </p>
            </div>
          )}
        </section>

        <section className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-3xl shadow-2xl p-10 sm:p-12 text-center text-white mb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 bg-[size:18px_18px] opacity-30" />
          <div className="relative">
            <Heart className="w-16 h-16 mx-auto mb-6 animate-pulse" />

            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Vous aimez Medecine Hub ?
            </h2>

            <p className="text-lg text-purple-100 max-w-2xl mx-auto">
              Le projet reste gratuit pour aider un maximum d’étudiants en
              médecine à s’entraîner plus facilement.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}