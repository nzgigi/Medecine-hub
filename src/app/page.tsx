"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MatiereCard from "@/components/MatiereCard";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Stethoscope,
  Users,
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
  semesterName: string;
  semesterOrder: number;
  exams: ExamPreview[];
  totalQuestions: number;
  subjectIcon?: string;
  subjectColor?: string;
}

interface MatiereIndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  subjectOrder?: number;
  examOrder?: number;
  examTitle?: string;
  semesterName?: string;
  semesterOrder?: number;
  subjectIcon?: string;
  subjectColor?: string;
}

interface SemesterGroup {
  name: string;
  order: number;
  matieres: MatiereData[];
}

function buildMatieresFromIndex(data: MatiereIndexEntry[]): MatiereData[] {
  const grouped: Record<string, MatiereData> = {};

  data.forEach((item, index) => {
    if (!grouped[item.slug]) {
      grouped[item.slug] = {
        matiere: item.matiere,
        slug: item.slug,
        subjectOrder: item.subjectOrder ?? index + 1,
        semesterName: item.semesterName?.trim() || "Semestre 7",
        semesterOrder: item.semesterOrder ?? 1,
        exams: [],
        totalQuestions: 0,
        subjectIcon: item.subjectIcon,
        subjectColor: item.subjectColor,
      };
    }

    grouped[item.slug].subjectOrder = Math.min(
      grouped[item.slug].subjectOrder,
      item.subjectOrder ?? grouped[item.slug].subjectOrder
    );
    grouped[item.slug].semesterName =
      item.semesterName?.trim() || grouped[item.slug].semesterName;
    grouped[item.slug].semesterOrder = Math.min(
      grouped[item.slug].semesterOrder,
      item.semesterOrder ?? grouped[item.slug].semesterOrder
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

function groupMatieresBySemester(matieres: MatiereData[]): SemesterGroup[] {
  const grouped = new Map<string, SemesterGroup>();

  matieres.forEach((matiere) => {
    const name = matiere.semesterName || "Semestre 7";

    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        order: matiere.semesterOrder || grouped.size + 1,
        matieres: [],
      });
    }

    const group = grouped.get(name);

    if (group) {
      group.order = Math.min(group.order, matiere.semesterOrder || group.order);
      group.matieres.push(matiere);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => a.order - b.order);
}

export default function HomePage() {
  const [matieres, setMatieres] = useState<MatiereData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    async function loadMatieres() {
      try {
        const response = await fetch("/data/qcm/index.json?t=" + Date.now());
        const data = (await response.json()) as MatiereIndexEntry[];
        const loadedMatieres = buildMatieresFromIndex(data);

        setMatieres(loadedMatieres);
        setOpenSemesters(
          loadedMatieres.length > 0
            ? { [loadedMatieres[0].semesterName || "Semestre 7"]: true }
            : {}
        );
      } catch (error) {
        console.error("Erreur chargement:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMatieres();
  }, []);

  const totalQuestions = useMemo(() => {
    return matieres.reduce((acc, matiere) => acc + matiere.totalQuestions, 0);
  }, [matieres]);

  const totalExams = useMemo(() => {
    return matieres.reduce((acc, matiere) => acc + matiere.exams.length, 0);
  }, [matieres]);

  const semesters = useMemo(() => {
    return groupMatieresBySemester(matieres);
  }, [matieres]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-[#151512]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
          <div className="text-sm font-semibold text-stone-500">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-[#151512]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col-reverse items-center gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-300">
                <Stethoscope className="h-4 w-4 text-emerald-800 dark:text-emerald-300" />
                Annales medicales gratuites
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-stone-950 dark:text-white sm:text-6xl">
                Medecine Hub
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 dark:text-stone-300 sm:text-lg">
                Des QCM d&apos;annales classes par matiere et par annee, avec une
                interface simple pour reviser sans perdre de temps.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#matieres"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700"
                >
                  Commencer a reviser
                  <ArrowRight className="h-4 w-4" />
                </a>

                <Link
                  href="/compte"
                  className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-200 dark:hover:bg-[#1d1c18]"
                >
                  Voir mon compte
                </Link>
              </div>
            </div>

            <div className="relative h-40 w-40 shrink-0 sm:h-56 sm:w-56 lg:h-64 lg:w-64">
              <Image
                src="/brand/pfp-v2.png"
                alt="Medecine Hub"
                fill
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 224px, 160px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { label: "questions", value: totalQuestions, icon: BookOpen },
              { label: "epreuves", value: totalExams, icon: GraduationCap },
              { label: "matieres", value: matieres.length, icon: Users },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-[#151512]"
                >
                  <Icon className="h-5 w-5 text-emerald-800 dark:text-emerald-300" />
                  <div className="mt-3 text-3xl font-black">{item.value}</div>
                  <div className="text-sm text-stone-600 dark:text-stone-400">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <Link
          href="/swipe"
          className="group flex flex-col items-center justify-between gap-5 overflow-hidden rounded-2xl bg-emerald-800 px-6 py-7 text-white shadow-sm transition-colors hover:bg-emerald-700 sm:flex-row sm:px-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide">
                Nouveau
              </div>
              <h3 className="mt-1 text-xl font-black tracking-tight">
                Mode Swipe
              </h3>
              <p className="mt-1 max-w-md text-sm text-emerald-50">
                Revisez a la vitesse de vos reflexes : glissez a gauche pour
                vrai, a droite pour faux, vers le bas pour passer.
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-emerald-800 transition-transform group-hover:translate-x-1">
            Essayer
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      <section id="matieres" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-emerald-800 dark:text-emerald-300">
              Bibliotheque
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Choisir une matiere
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stone-600 dark:text-stone-400">
            Ouvrez un semestre, choisissez une matiere, puis lancez l&apos;annee
            que vous voulez travailler.
          </p>
        </div>

        {semesters.length > 0 ? (
          <div className="space-y-3">
            {semesters.map((semester) => {
              const isOpen = Boolean(openSemesters[semester.name]);

              return (
                <section
                  key={semester.name}
                  className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-[#151512]"
                >
                  <button
                    onClick={() =>
                      setOpenSemesters((current) => ({
                        ...current,
                        [semester.name]: !isOpen,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50 dark:hover:bg-[#1d1c18]"
                  >
                    <span>
                      <span className="block text-xl font-black">
                        {semester.name}
                      </span>
                      <span className="block text-sm text-stone-500 dark:text-stone-400">
                        {semester.matieres.length} matiere
                        {semester.matieres.length > 1 ? "s" : ""}
                      </span>
                    </span>

                    {isOpen ? (
                      <ChevronDown className="h-5 w-5 text-stone-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-stone-500" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="grid grid-cols-1 gap-4 border-t border-stone-100 p-4 md:grid-cols-2 lg:grid-cols-3 dark:border-stone-800">
                      {semester.matieres.map((matiere) => (
                        <MatiereCard
                          key={matiere.slug}
                          matiere={matiere.matiere}
                          slug={matiere.slug}
                          totalQuestions={matiere.totalQuestions}
                          exams={matiere.exams}
                          subjectIcon={matiere.subjectIcon}
                          subjectColor={matiere.subjectColor}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white p-10 text-center dark:border-stone-800 dark:bg-[#151512]">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-stone-400" />
            <h3 className="text-xl font-black">Aucune matiere</h3>
            <p className="mt-2 text-sm text-stone-500">
              Aucune annale n&apos;est disponible pour le moment.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
