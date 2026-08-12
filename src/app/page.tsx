"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MatiereCard from "@/components/MatiereCard";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  Stethoscope,
  Users,
  X,
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
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const [openMatiere, setOpenMatiere] = useState<MatiereData | null>(null);

  useEffect(() => {
    async function loadMatieres() {
      try {
        const response = await fetch("/data/qcm/index.json?t=" + Date.now());
        const data = (await response.json()) as MatiereIndexEntry[];
        const loadedMatieres = buildMatieresFromIndex(data);

        setMatieres(loadedMatieres);
        const loadedSemesters = groupMatieresBySemester(loadedMatieres);
        setActiveSemester(
          loadedSemesters.length > 0 ? loadedSemesters[0].name : null
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

  const currentSemester = useMemo(() => {
    return semesters.find((semester) => semester.name === activeSemester) || null;
  }, [semesters, activeSemester]);

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
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="flex flex-col-reverse items-center gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-300">
                <Stethoscope className="h-4 w-4 text-emerald-800 dark:text-emerald-300" />
                Annales medicales gratuites
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-950 dark:text-white sm:text-5xl">
                Medecine Hub
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600 dark:text-stone-300 sm:text-lg">
                Des QCM d&apos;annales pour les étudiants de Toulouse, classés par
                matières et par années, avec une interface simple pour réviser
                efficacement.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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

            <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36 lg:h-44 lg:w-44">
              <Image
                src="/brand/pfp-v2.png"
                alt="Medecine Hub"
                fill
                sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "questions", value: totalQuestions, icon: BookOpen },
              { label: "epreuves", value: totalExams, icon: GraduationCap },
              { label: "matieres", value: matieres.length, icon: Users },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-[#151512]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-3xl font-black leading-tight">
                      {item.value}
                    </div>
                    <div className="text-sm text-stone-600 dark:text-stone-400">
                      {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/medtok"
          className="group flex flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl bg-emerald-800 px-6 py-5 text-white shadow-sm transition-colors hover:bg-emerald-700 sm:flex-row sm:px-8"
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
                MedTok
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

      <section id="matieres" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-emerald-800 dark:text-emerald-300">
              Bibliotheque
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Choisir une matiere
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stone-600 dark:text-stone-400">
            Choisissez un semestre, puis une matiere pour voir ses epreuves.
          </p>
        </div>

        {semesters.length > 0 ? (
          <>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {semesters.map((semester) => {
                const isActive = activeSemester === semester.name;

                return (
                  <button
                    key={semester.name}
                    onClick={() => setActiveSemester(semester.name)}
                    className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                      isActive
                        ? "bg-emerald-800 text-white"
                        : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-300 dark:hover:bg-[#1d1c18]"
                    }`}
                  >
                    {semester.name}
                    <span
                      className={`ml-2 ${
                        isActive
                          ? "text-emerald-100"
                          : "text-stone-400 dark:text-stone-500"
                      }`}
                    >
                      {semester.matieres.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {currentSemester && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentSemester.matieres.map((matiere) => (
                  <MatiereCard
                    key={matiere.slug}
                    matiere={matiere.matiere}
                    slug={matiere.slug}
                    totalQuestions={matiere.totalQuestions}
                    exams={matiere.exams}
                    subjectIcon={matiere.subjectIcon}
                    subjectColor={matiere.subjectColor}
                    onOpen={() => setOpenMatiere(matiere)}
                  />
                ))}
              </div>
            )}
          </>
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

      {openMatiere && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpenMatiere(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-[#1a1917]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-5 dark:border-stone-800">
              <div>
                <h3 className="text-xl font-black text-stone-950 dark:text-white">
                  {openMatiere.matiere}
                </h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {openMatiere.totalQuestions} questions &middot;{" "}
                  {openMatiere.exams.length} épreuve
                  {openMatiere.exams.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setOpenMatiere(null)}
                className="shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto p-5">
              {openMatiere.exams.map((exam) => (
                <Link
                  key={`${openMatiere.slug}-${exam.annee}`}
                  href={`/qcm/${openMatiere.slug}/${exam.annee}`}
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
        </div>
      )}
    </main>
  );
}
