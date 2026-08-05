"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  DatabaseZap,
  Edit,
  FileText,
  History,
  LayoutGrid,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  DEFAULT_SUBJECT_COLOR,
  SUBJECT_ICON_KEYS,
  SUBJECT_ICONS,
  getSubjectColorStyle,
} from "@/lib/subjectStyles";
import { useDialogs } from "@/components/DialogProvider";
import AdminMedtokPanel from "@/components/AdminMedtokPanel";

interface MatiereIndex {
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

interface SubjectGroup {
  matiere: string;
  slug: string;
  subjectOrder: number;
  semesterName: string;
  semesterOrder: number;
  totalQuestions: number;
  exams: MatiereIndex[];
  subjectIcon?: string;
  subjectColor?: string;
}

interface SemesterGroup {
  name: string;
  order: number;
  subjects: SubjectGroup[];
}

interface ValidationIssue {
  file: string;
  level: "error" | "warning";
  message: string;
}

interface AnalyticsData {
  totalViews: number;
  trackedPaths: number;
  topPages: { path: string; total: number }[];
  dailySeries: { day: string; total: number }[];
}

interface UserSummaryEntry {
  name: string;
  email: string;
  firstSeenAt: string;
  lastSeenAt: string;
  hasCustomAvatar: boolean;
}

interface UsersSummary {
  total: number;
  users: UserSummaryEntry[];
}

function normalizeIndex(entries: MatiereIndex[]): MatiereIndex[] {
  const subjectOrderMap = new Map<string, number>();
  let nextSubjectOrder = 1;

  entries.forEach((entry) => {
    if (!subjectOrderMap.has(entry.slug)) {
      subjectOrderMap.set(entry.slug, entry.subjectOrder ?? nextSubjectOrder);
      nextSubjectOrder++;
    }
  });

  const grouped = new Map<string, MatiereIndex[]>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.slug)) {
      grouped.set(entry.slug, []);
    }

    grouped.get(entry.slug)?.push(entry);
  });

  const normalized: MatiereIndex[] = [];

  grouped.forEach((subjectEntries, slug) => {
    const sortedExams = [...subjectEntries].sort((a, b) => {
      const orderA = a.examOrder ?? a.annee;
      const orderB = b.examOrder ?? b.annee;
      return orderA - orderB;
    });

    sortedExams.forEach((entry, index) => {
      normalized.push({
        ...entry,
        subjectOrder: subjectOrderMap.get(slug) ?? 999,
        semesterName: entry.semesterName?.trim() || "Semestre 7",
        semesterOrder: entry.semesterOrder ?? 1,
        examOrder: index + 1,
        examTitle:
          entry.examTitle?.trim() || `${entry.matiere} - ${entry.annee}`,
      });
    });
  });

  return normalized.sort((a, b) => {
    const subjectDiff = (a.subjectOrder ?? 999) - (b.subjectOrder ?? 999);
    if (subjectDiff !== 0) return subjectDiff;

    return (a.examOrder ?? 999) - (b.examOrder ?? 999);
  });
}

function groupSubjects(entries: MatiereIndex[]): SubjectGroup[] {
  const grouped = new Map<string, SubjectGroup>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.slug)) {
      grouped.set(entry.slug, {
        matiere: entry.matiere,
        slug: entry.slug,
        subjectOrder: entry.subjectOrder ?? 999,
        semesterName: entry.semesterName?.trim() || "Semestre 7",
        semesterOrder: entry.semesterOrder ?? 1,
        totalQuestions: 0,
        exams: [],
        subjectIcon: entry.subjectIcon,
        subjectColor: entry.subjectColor,
      });
    }

    const group = grouped.get(entry.slug);

    if (group) {
      group.totalQuestions += entry.total_questions;
      group.semesterName = entry.semesterName?.trim() || group.semesterName;
      group.semesterOrder = Math.min(
        group.semesterOrder,
        entry.semesterOrder ?? group.semesterOrder
      );
      group.subjectIcon = group.subjectIcon || entry.subjectIcon;
      group.subjectColor = group.subjectColor || entry.subjectColor;
      group.exams.push(entry);
    }
  });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      exams: [...group.exams].sort((a, b) => {
        const orderA = a.examOrder ?? a.annee;
        const orderB = b.examOrder ?? b.annee;
        return orderA - orderB;
      }),
    }))
    .sort((a, b) => a.subjectOrder - b.subjectOrder);
}

function groupSemesters(subjects: SubjectGroup[]): SemesterGroup[] {
  const grouped = new Map<string, SemesterGroup>();

  subjects.forEach((subject) => {
    const name = subject.semesterName || "Semestre 7";

    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        order: subject.semesterOrder || grouped.size + 1,
        subjects: [],
      });
    }

    const group = grouped.get(name);

    if (group) {
      group.order = Math.min(group.order, subject.semesterOrder || group.order);
      group.subjects.push(subject);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => a.order - b.order);
}

function getAdminHeaders(extraHeaders: HeadersInit = {}) {
  const token = localStorage.getItem("admin_token");

  return {
    ...extraHeaders,
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black text-stone-950 dark:text-white">
        {value}
      </div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{detail}</p>
    </div>
  );
}

function AdminAction({
  icon: Icon,
  label,
  loadingLabel,
  loading,
  onClick,
}: {
  icon: typeof BookOpen;
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800"
    >
      <Icon className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
      {loading ? loadingLabel || "En cours..." : label}
    </button>
  );
}

type AdminTab = "overview" | "epreuves" | "medtok";

const FAVORITE_COLORS_STORAGE_KEY = "medecine_hub_admin_favorite_colors";
const MAX_FAVORITE_COLORS = 10;

export default function AdminDashboard() {
  const router = useRouter();
  const { alert: showAlert, confirm: showConfirm, dangerConfirm: showDangerConfirm, prompt: showPrompt } =
    useDialogs();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITE_COLORS_STORAGE_KEY);
      if (raw) setFavoriteColors(JSON.parse(raw));
    } catch {
      // pas grave si le stockage local est indisponible
    }
  }, []);

  const addFavoriteColor = (color: string) => {
    if (!color || !color.startsWith("#")) return;

    setFavoriteColors((current) => {
      const next = [color, ...current.filter((c) => c !== color)].slice(
        0,
        MAX_FAVORITE_COLORS
      );
      localStorage.setItem(FAVORITE_COLORS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeFavoriteColor = (color: string) => {
    setFavoriteColors((current) => {
      const next = current.filter((c) => c !== color);
      localStorage.setItem(FAVORITE_COLORS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const [entries, setEntries] = useState<MatiereIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [extraSemesters, setExtraSemesters] = useState<SemesterGroup[]>([]);

  const [savingIndex, setSavingIndex] = useState(false);
  const [normalizingIndex, setNormalizingIndex] = useState(false);
  const [migratingQcm, setMigratingQcm] = useState(false);
  const [validatingQcm, setValidatingQcm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backing, setBacking] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    []
  );
  const [validationSummary, setValidationSummary] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [registeredUsers, setRegisteredUsers] = useState<UsersSummary | null>(
    null
  );

  const maxDailyViews = useMemo(() => {
    if (!analytics || analytics.dailySeries.length === 0) return 1;
    return Math.max(1, ...analytics.dailySeries.map((point) => point.total));
  }, [analytics]);

  const [createMode, setCreateMode] = useState<"existing" | "new">("existing");
  const [selectedExistingSlug, setSelectedExistingSlug] = useState("");
  const [newMatiere, setNewMatiere] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [newAnnee, setNewAnnee] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState(SUBJECT_ICON_KEYS[0]);
  const [newSubjectColor, setNewSubjectColor] = useState(DEFAULT_SUBJECT_COLOR);
  const [creating, setCreating] = useState(false);

  const slugIsValid = newSlug === "" || SLUG_PATTERN.test(newSlug);

  const handleMatiereChange = (value: string) => {
    setNewMatiere(value);
    if (!slugManuallyEdited) {
      setNewSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(value.trim().length > 0);
    setNewSlug(slugify(value));
  };

  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadIndex();
    loadAnalytics();
    loadRegisteredUsers();
  }, [router]);

  const loadRegisteredUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: getAdminHeaders(),
      });

      const result = (await response.json()) as
        | { success: true; total: number; users: UserSummaryEntry[] }
        | { success: false };

      if (result.success) {
        setRegisteredUsers({ total: result.total, users: result.users });
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);

    try {
      const response = await fetch("/api/admin/analytics", {
        headers: getAdminHeaders(),
      });

      const result = (await response.json()) as
        | (AnalyticsData & { success: true })
        | { success: false };

      if (result.success) {
        setAnalytics({
          totalViews: result.totalViews,
          trackedPaths: result.trackedPaths,
          topPages: result.topPages,
          dailySeries: result.dailySeries,
        });
      }
    } catch (error) {
      console.error("Erreur chargement analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadIndex = async () => {
    try {
      const response = await fetch("/data/qcm/index.json?t=" + Date.now());
      const data = (await response.json()) as MatiereIndex[];
      setEntries(normalizeIndex(data));
    } catch (error) {
      console.error("Erreur chargement:", error);
      await showAlert("Erreur lors du chargement de l'index QCM");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const closeValidationReport = () => {
    setValidationIssues([]);
    setValidationSummary("");
  };

  const saveIndex = async (nextEntries: MatiereIndex[]) => {
    setSavingIndex(true);

    try {
      const normalizedEntries = normalizeIndex(nextEntries);

      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "saveIndex",
          entries: normalizedEntries,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        entries?: MatiereIndex[];
      };

      if (!result.success) {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      setEntries(result.entries || normalizedEntries);
      showStatus("Index sauvegarde");
    } catch (error) {
      console.error("Erreur sauvegarde index:", error);
      await showAlert("Erreur lors de la sauvegarde de l'index");
    } finally {
      setSavingIndex(false);
    }
  };

  const normalizeIndexOnServer = async () => {
    if (
      !(await showConfirm(
        "Cela va remplir automatiquement subjectOrder, examOrder et examTitle dans index.json.",
        { title: "Normaliser l'index ?" }
      ))
    ) {
      return;
    }

    setNormalizingIndex(true);

    try {
      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "normalizeIndex",
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        entries?: MatiereIndex[];
      };

      if (!result.success) {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      setEntries(result.entries || []);
      showStatus(result.message || "Index normalise");
    } catch (error) {
      console.error("Erreur normalisation index:", error);
      await showAlert("Erreur lors de la normalisation de l'index");
    } finally {
      setNormalizingIndex(false);
    }
  };

  const migrateQcmFolders = async () => {
    if (
      !(await showConfirm(
        "Les anciens fichiers questions[] seront convertis vers folders[]. Les fichiers deja migres seront ignores.",
        { title: "Migrer les anciens QCM vers le format dossiers ?" }
      ))
    ) {
      return;
    }

    setMigratingQcm(true);

    try {
      const response = await fetch("/api/admin/migrate-qcm-folders", {
        method: "POST",
        headers: getAdminHeaders(),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      showStatus(result.message || "Migration terminee");
      await loadIndex();
    } catch (error) {
      console.error("Erreur migration QCM:", error);
      await showAlert("Erreur lors de la migration des QCM");
    } finally {
      setMigratingQcm(false);
    }
  };

  const validateQcmFiles = async () => {
    setValidatingQcm(true);
    setValidationIssues([]);
    setValidationSummary("");

    try {
      const response = await fetch("/api/admin/validate-qcm", {
        method: "POST",
        headers: getAdminHeaders(),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        errorCount?: number;
        warningCount?: number;
        issues?: ValidationIssue[];
      };

      if (!result.success) {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      setValidationIssues(result.issues || []);
      setValidationSummary(result.message || "Verification terminee");

      if (!result.issues || result.issues.length === 0) {
        showStatus(result.message || "Tous les QCM sont valides");
      }
    } catch (error) {
      console.error("Erreur validation QCM:", error);
      await showAlert("Erreur lors de la verification des QCM");
    } finally {
      setValidatingQcm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const handleBackup = async () => {
    if (
      !(await showConfirm("Cela va sauvegarder les fichiers QCM actuels.", {
        title: "Creer un backup manuel sur GitHub ?",
      }))
    ) {
      return;
    }

    setBacking(true);

    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: getAdminHeaders(),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (result.success) {
        showStatus(result.message || "Backup effectue");
      } else {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur backup:", error);
      await showAlert("Erreur lors du backup");
    } finally {
      setBacking(false);
    }
  };

  const handleSyncIndex = async () => {
    if (
      !(await showConfirm("Recalculer tous les totaux de questions depuis les fichiers QCM ?"))
    ) {
      return;
    }

    setSyncing(true);

    try {
      const response = await fetch("/api/admin/sync-index", {
        method: "POST",
        headers: getAdminHeaders(),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (result.success) {
        showStatus(result.message || "Synchronisation effectuee");
        await loadIndex();
      } else {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur sync:", error);
      await showAlert("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateQCM = async () => {
    const anneeNum = Number(newAnnee);

    if (!anneeNum || Number.isNaN(anneeNum)) {
      await showAlert("Une annee valide est requise");
      return;
    }

    let matiere: string;
    let slug: string;

    if (createMode === "existing") {
      const subject = existingSubjects.find(
        (item) => item.slug === selectedExistingSlug
      );

      if (!subject) {
        await showAlert("Choisissez une matiere existante");
        return;
      }

      matiere = subject.matiere;
      slug = subject.slug;
    } else {
      matiere = newMatiere.trim();
      slug = newSlug.trim();

      if (!matiere || !slug) {
        await showAlert("Matiere et slug sont requis");
        return;
      }

      if (!SLUG_PATTERN.test(slug)) {
        await showAlert(
          "Slug invalide : uniquement des lettres minuscules, chiffres et tirets (ex: cardiologie)."
        );
        return;
      }
    }

    setCreating(true);

    try {
      const response = await fetch("/api/qcm/create", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          matiere,
          slug,
          annee: anneeNum,
          ...(createMode === "new"
            ? { subjectIcon: newSubjectIcon, subjectColor: newSubjectColor }
            : {}),
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        await showAlert(
          "Erreur creation QCM : " + (result.message || "Erreur inconnue")
        );
        return;
      }

      await loadIndex();

      setNewMatiere("");
      setNewSlug("");
      setSlugManuallyEdited(false);
      setNewAnnee("");
      setNewSubjectIcon(SUBJECT_ICON_KEYS[0]);
      setNewSubjectColor(DEFAULT_SUBJECT_COLOR);

      if (
        await showConfirm("Voulez-vous l'editer maintenant ?", {
          title: "QCM cree / mis a jour pour cette matiere et cette annee.",
        })
      ) {
        router.push(`/admin/edit/${slug}/${anneeNum}`);
      }
    } catch (error) {
      console.error(error);
      await showAlert("Erreur lors de la creation du QCM");
    } finally {
      setCreating(false);
    }
  };

  const renameSubject = (slug: string, newName: string) => {
    const nextEntries = entries.map((entry) =>
      entry.slug === slug
        ? {
            ...entry,
            matiere: newName,
            examTitle:
              entry.examTitle && entry.examTitle.includes(entry.matiere)
                ? entry.examTitle.replace(entry.matiere, newName)
                : entry.examTitle,
          }
        : entry
    );

    setEntries(nextEntries);
  };

  const updateSubjectIcon = (slug: string, iconKey: string) => {
    const nextEntries = entries.map((entry) =>
      entry.slug === slug ? { ...entry, subjectIcon: iconKey } : entry
    );

    setEntries(nextEntries);
  };

  const updateSubjectColor = (slug: string, colorValue: string) => {
    const nextEntries = entries.map((entry) =>
      entry.slug === slug ? { ...entry, subjectColor: colorValue } : entry
    );

    setEntries(nextEntries);
  };

  const renameExam = (slug: string, annee: number, newTitle: string) => {
    const nextEntries = entries.map((entry) =>
      entry.slug === slug && entry.annee === annee
        ? {
            ...entry,
            examTitle: newTitle,
          }
        : entry
    );

    setEntries(nextEntries);
  };

  const moveSubject = (slug: string, direction: "up" | "down") => {
    const groups = groupSubjects(normalizeIndex(entries));
    const index = groups.findIndex((group) => group.slug === slug);
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || newIndex < 0 || newIndex >= groups.length) return;

    [groups[index], groups[newIndex]] = [groups[newIndex], groups[index]];

    const orderMap = new Map<string, number>();

    groups.forEach((group, groupIndex) => {
      orderMap.set(group.slug, groupIndex + 1);
    });

    const nextEntries = entries.map((entry) => ({
      ...entry,
      subjectOrder: orderMap.get(entry.slug) ?? entry.subjectOrder,
    }));

    setEntries(normalizeIndex(nextEntries));
  };

  const addSemester = async () => {
    const semesters = groupSemesters(groupSubjects(normalizeIndex(entries)));
    const name = (
      await showPrompt("Nom du nouveau menu deroulant :", { defaultValue: "Semestre 8" })
    )?.trim();

    if (!name) return;

    if (semesters.some((semester) => semester.name === name)) {
      await showAlert("Ce semestre existe deja.");
      return;
    }

    setExtraSemesters((current) => [
      ...current,
      { name, order: semesters.length + current.length + 1, subjects: [] },
    ]);
    showStatus(`Menu "${name}" cree.`);
  };

  const renameSemester = (oldName: string, newName: string) => {
    const cleanedName = newName.trim();
    if (!cleanedName) return;

    setExtraSemesters((current) =>
      current.map((semester) =>
        semester.name === oldName ? { ...semester, name: cleanedName } : semester
      )
    );

    setEntries((current) =>
      current.map((entry) =>
        (entry.semesterName?.trim() || "Semestre 7") === oldName
          ? { ...entry, semesterName: cleanedName }
          : entry
      )
    );
  };

  const moveSemester = (name: string, direction: "up" | "down") => {
    const index = semesters.findIndex((semester) => semester.name === name);
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || newIndex < 0 || newIndex >= semesters.length) return;

    const nextSemesters = [...semesters];

    [nextSemesters[index], nextSemesters[newIndex]] = [
      nextSemesters[newIndex],
      nextSemesters[index],
    ];

    const orderMap = new Map<string, number>();

    nextSemesters.forEach((semester, semesterIndex) => {
      orderMap.set(semester.name, semesterIndex + 1);
    });

    setExtraSemesters((current) =>
      current.map((semester) => ({
        ...semester,
        order: orderMap.get(semester.name) ?? semester.order,
      }))
    );

    setEntries((current) =>
      normalizeIndex(
        current.map((entry) => ({
          ...entry,
          semesterOrder:
            orderMap.get(entry.semesterName?.trim() || "Semestre 7") ??
            entry.semesterOrder,
        }))
      )
    );
  };

  const assignSubjectToSemester = (slug: string, semesterName: string) => {
    const semester = semesters.find((item) => item.name === semesterName);

    setEntries((current) =>
      normalizeIndex(
        current.map((entry) =>
          entry.slug === slug
            ? {
                ...entry,
                semesterName,
                semesterOrder: semester?.order ?? semesters.length + 1,
              }
            : entry
        )
      )
    );
  };

  const moveExam = (
    slug: string,
    annee: number,
    direction: "up" | "down"
  ) => {
    const subjectEntries = entries
      .filter((entry) => entry.slug === slug)
      .sort((a, b) => (a.examOrder ?? a.annee) - (b.examOrder ?? b.annee));

    const index = subjectEntries.findIndex((entry) => entry.annee === annee);
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || newIndex < 0 || newIndex >= subjectEntries.length) return;

    [subjectEntries[index], subjectEntries[newIndex]] = [
      subjectEntries[newIndex],
      subjectEntries[index],
    ];

    const examOrderMap = new Map<number, number>();

    subjectEntries.forEach((entry, entryIndex) => {
      examOrderMap.set(entry.annee, entryIndex + 1);
    });

    const nextEntries = entries.map((entry) => {
      if (entry.slug !== slug) return entry;

      return {
        ...entry,
        examOrder: examOrderMap.get(entry.annee) ?? entry.examOrder,
      };
    });

    setEntries(normalizeIndex(nextEntries));
  };

  const deleteExam = async (slug: string, annee: number) => {
    const confirmed = await showDangerConfirm(
      `Tu es sur le point de supprimer definitivement l'epreuve ${slug} ${annee}.`,
      { detail: "Le fichier JSON de cette epreuve sera supprime." }
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "deleteExam", slug, annee }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      await loadIndex();
      showStatus("Epreuve supprimee");
    } catch (error) {
      console.error("Erreur suppression epreuve:", error);
      await showAlert("Erreur lors de la suppression");
    }
  };

  const deleteSubject = async (slug: string, matiere: string) => {
    const confirmed = await showDangerConfirm(
      `Tu es sur le point de supprimer definitivement la matiere "${matiere}".`,
      { detail: "Toutes les epreuves JSON de cette matiere seront supprimees." }
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "deleteSubject", slug }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        await showAlert("Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      await loadIndex();
      showStatus("Matiere supprimee");
    } catch (error) {
      console.error("Erreur suppression matiere:", error);
      await showAlert("Erreur lors de la suppression");
    }
  };

  const existingSubjects = useMemo(() => {
    return groupSubjects(normalizeIndex(entries));
  }, [entries]);

  useEffect(() => {
    if (existingSubjects.length === 0) return;

    if (
      !selectedExistingSlug ||
      !existingSubjects.some((subject) => subject.slug === selectedExistingSlug)
    ) {
      setSelectedExistingSlug(existingSubjects[0].slug);
    }
  }, [existingSubjects, selectedExistingSlug]);

  const subjects = useMemo(() => {
    const normalized = normalizeIndex(entries);
    const groups = groupSubjects(normalized);

    if (!search.trim()) return groups;

    const query = search.toLowerCase();

    return groups
      .map((subject) => ({
        ...subject,
        exams: subject.exams.filter((exam) => {
          return (
            subject.matiere.toLowerCase().includes(query) ||
            subject.slug.toLowerCase().includes(query) ||
            String(exam.annee).includes(query) ||
            (exam.examTitle || "").toLowerCase().includes(query)
          );
        }),
      }))
      .filter((subject) => subject.exams.length > 0);
  }, [entries, search]);

  const semesters = useMemo(() => {
    const persistedSemesters = groupSemesters(
      groupSubjects(normalizeIndex(entries))
    );
    const persistedNames = new Set(
      persistedSemesters.map((semester) => semester.name)
    );

    return [
      ...persistedSemesters,
      ...extraSemesters.filter((semester) => !persistedNames.has(semester.name)),
    ].sort((a, b) => a.order - b.order);
  }, [entries, extraSemesters]);

  const totalQuestions = entries.reduce(
    (acc, entry) => acc + entry.total_questions,
    0
  );

  const totalSubjects = new Set(entries.map((entry) => entry.slug)).size;

  const validationErrorCount = validationIssues.filter(
    (issue) => issue.level === "error"
  ).length;

  const validationWarningCount = validationIssues.filter(
    (issue) => issue.level === "warning"
  ).length;

  const totalMenus = semesters.length;
  const averageQuestions =
    entries.length > 0 ? Math.round(totalQuestions / entries.length) : 0;
  const latestYear =
    entries.length > 0 ? Math.max(...entries.map((entry) => entry.annee)) : "-";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-[#151512]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-emerald-600 mx-auto mb-4" />
          <div className="text-lg font-semibold text-stone-600 dark:text-stone-300">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Administration
                </p>
                <h1 className="text-3xl font-black">Dashboard QCM</h1>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Vue d&apos;ensemble, creation et maintenance des epreuves.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {statusMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {statusMessage}
                </div>
              )}
              <button
                onClick={() => saveIndex(entries)}
                disabled={savingIndex}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingIndex ? "Sauvegarde..." : "Sauvegarder"}
              </button>
              <Link
                href="/admin/logs"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <History className="h-4 w-4" />
                Journal
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <LogOut className="h-4 w-4" />
                Deconnexion
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="flex gap-2 overflow-x-auto lg:h-fit lg:flex-col lg:gap-1 lg:overflow-visible lg:sticky lg:top-6">
            {(
              [
                { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
                { id: "epreuves", label: "Epreuves", icon: FileText },
                { id: "medtok", label: "MedTok", icon: Zap },
              ] as { id: AdminTab; label: string; icon: typeof BookOpen }[]
            ).map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-[#1d1c18]"
                  }`}
                >
                  <TabIcon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          <div className="min-w-0">

        {activeTab === "overview" && (
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={BarChart3}
            label="Questions"
            value={totalQuestions}
            detail={`${averageQuestions} questions par epreuve`}
          />
          <StatCard
            icon={FileText}
            label="Epreuves"
            value={entries.length}
            detail={`Derniere annee: ${latestYear}`}
          />
          <StatCard
            icon={BookOpen}
            label="Matieres"
            value={totalSubjects}
            detail={`${totalMenus} menu(s) d'accueil`}
          />
          <StatCard
            icon={ClipboardCheck}
            label="Validation"
            value={
              validationSummary
                ? `${validationErrorCount}/${validationWarningCount}`
                : "A lancer"
            }
            detail="Erreurs / warnings detectes"
          />
          <StatCard
            icon={Users}
            label="Utilisateurs"
            value={registeredUsers ? registeredUsers.total : "..."}
            detail={
              registeredUsers
                ? "Comptes Google inscrits"
                : "Chargement..."
            }
          />
        </section>
        )}

        {activeTab === "epreuves" && (
        <section className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Ajouter une epreuve</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Choisissez une matiere existante ou creez-en une nouvelle.
                </p>
              </div>
            </div>

            <div className="mb-4 inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1 dark:border-stone-800 dark:bg-[#151512]">
              <button
                onClick={() => setCreateMode("existing")}
                disabled={existingSubjects.length === 0}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  createMode === "existing"
                    ? "bg-white text-stone-950 shadow-sm dark:bg-stone-800 dark:text-white"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                Matiere existante
              </button>
              <button
                onClick={() => setCreateMode("new")}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                  createMode === "new"
                    ? "bg-white text-stone-950 shadow-sm dark:bg-stone-800 dark:text-white"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                Nouvelle matiere
              </button>
            </div>

            {createMode === "existing" ? (
              existingSubjects.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Aucune matiere existante pour le moment — utilisez
                  &quot;Nouvelle matiere&quot;.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-center">
                  <div className="relative">
                    <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                    <select
                      value={selectedExistingSlug}
                      onChange={(event) =>
                        setSelectedExistingSlug(event.target.value)
                      }
                      className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
                    >
                      {existingSubjects.map((subject) => (
                        <option key={subject.slug} value={subject.slug}>
                          {subject.matiere} — {subject.exams.length} epreuve
                          {subject.exams.length > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="number"
                    placeholder="Annee"
                    value={newAnnee}
                    onChange={(event) => setNewAnnee(event.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
                  />

                  <button
                    onClick={handleCreateQCM}
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    {creating ? "Creation..." : "Ajouter"}
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_0.85fr_120px_auto] md:items-start">
                <input
                  type="text"
                  placeholder="Matiere (ex: Cardiologie)"
                  value={newMatiere}
                  onChange={(event) => handleMatiereChange(event.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
                />
                <div>
                  <input
                    type="text"
                    placeholder="Slug (ex: cardiologie)"
                    value={newSlug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
                  />
                  {!slugIsValid && (
                    <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      Slug invalide : minuscules, chiffres et tirets uniquement.
                    </p>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Annee"
                  value={newAnnee}
                  onChange={(event) => setNewAnnee(event.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
                />
                <button
                  onClick={handleCreateQCM}
                  disabled={creating || !slugIsValid}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  {creating ? "Creation..." : "Creer"}
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Icone
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_ICON_KEYS.map((iconKey) => {
                    const Icon = SUBJECT_ICONS[iconKey];
                    const active = newSubjectIcon === iconKey;

                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setNewSubjectIcon(iconKey)}
                        aria-label={`Icone ${iconKey}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition ${
                          active
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Couleur
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newSubjectColor}
                    onChange={(event) => setNewSubjectColor(event.target.value)}
                    aria-label="Choisir une couleur"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-stone-300 bg-white p-1 dark:border-stone-700 dark:bg-[#151512]"
                  />
                  <input
                    type="text"
                    value={newSubjectColor}
                    onChange={(event) => setNewSubjectColor(event.target.value)}
                    placeholder="#10b981"
                    className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-mono text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
                  />
                </div>
              </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Maintenance</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Actions techniques a utiliser quand le contenu change.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AdminAction icon={ShieldCheck} label="Verifier" loadingLabel="Verification..." loading={validatingQcm} onClick={validateQcmFiles} />
              <AdminAction icon={RefreshCw} label="Synchroniser" loadingLabel="Synchronisation..." loading={syncing} onClick={handleSyncIndex} />
              <AdminAction icon={Wand2} label="Normaliser" loadingLabel="Normalisation..." loading={normalizingIndex} onClick={normalizeIndexOnServer} />
              <AdminAction icon={DatabaseZap} label="Migrer" loadingLabel="Migration..." loading={migratingQcm} onClick={migrateQcmFolders} />
              <AdminAction icon={Save} label="Backup GitHub" loadingLabel="Backup..." loading={backing} onClick={handleBackup} />
            </div>
          </div>
        </section>
        )}

        {activeTab === "overview" && (
        <section className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Statistiques</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Vues du site (compteur simple, pas de suivi individuel).
                </p>
              </div>
            </div>

            <button
              onClick={loadAnalytics}
              disabled={loadingAnalytics}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingAnalytics ? "animate-spin" : ""}`}
              />
              Actualiser
            </button>
          </div>

          {!analytics ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {loadingAnalytics ? "Chargement..." : "Aucune donnee pour le moment."}
            </p>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                  <div className="text-xs font-bold uppercase text-stone-500 dark:text-stone-400">
                    Vues totales
                  </div>
                  <div className="text-3xl font-black">
                    {analytics.totalViews}
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                  <div className="text-xs font-bold uppercase text-stone-500 dark:text-stone-400">
                    Pages suivies
                  </div>
                  <div className="text-3xl font-black">
                    {analytics.trackedPaths}
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 text-sm font-bold text-stone-700 dark:text-stone-200">
                  14 derniers jours
                </div>

                {analytics.dailySeries.length === 0 ? (
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Pas encore de donnees quotidiennes.
                  </p>
                ) : (
                  <div className="flex h-28 items-end gap-1">
                    {analytics.dailySeries.map((point) => {
                      const heightPercent = Math.round(
                        (point.total / maxDailyViews) * 100
                      );

                      return (
                        <div
                          key={point.day}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`${point.day} : ${point.total} vue(s)`}
                        >
                          <div
                            className="min-h-[2px] w-full rounded-t bg-emerald-500 dark:bg-emerald-600"
                            style={{
                              height: `${Math.max(heightPercent, 2)}%`,
                            }}
                          />
                          <div className="text-[9px] text-stone-400 dark:text-stone-500">
                            {point.day.slice(5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-sm font-bold text-stone-700 dark:text-stone-200">
                  Pages les plus vues
                </div>

                {analytics.topPages.length === 0 ? (
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Aucune vue enregistree pour le moment.
                  </p>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {analytics.topPages.map((page) => (
                      <div
                        key={page.path}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="truncate text-stone-700 dark:text-stone-200">
                          {page.path}
                        </span>
                        <span className="font-bold text-stone-950 dark:text-stone-100">
                          {page.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
        )}

        {activeTab === "epreuves" && validationSummary && (
          <section className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Rapport de verification</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{validationSummary}</p>
              </div>
              <button onClick={closeValidationReport} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800">
                <X className="h-4 w-4" />
                Fermer
              </button>
            </div>

            {validationIssues.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                Aucun probleme detecte. Les QCM sont propres.
              </div>
            ) : (
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-2">
                {validationIssues.map((issue, index) => (
                  <div key={`${issue.file}-${index}`} className={`rounded-lg border p-3 ${issue.level === "error" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"}`}>
                    <div className="font-bold">{issue.file}</div>
                    <div className="mt-1 text-sm">{issue.message}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "epreuves" && (
        <>
        <section className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="border-b border-stone-200 p-5 dark:border-stone-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black">Gestion des QCM</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Modifiez les menus, les matieres et les epreuves depuis un seul endroit.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={addSemester} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800">
                  <Plus className="h-4 w-4" />
                  Menu
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input type="text" placeholder="Rechercher une matiere ou une annee" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full min-w-[260px] rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-stone-200 p-5 dark:border-stone-800 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center gap-2 font-black">
                <Layers className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                Menus d&apos;accueil
              </div>
              <div className="space-y-2">
                {semesters.map((semester, index) => (
                  <div key={semester.name} className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                    <input value={semester.name} onChange={(event) => renameSemester(semester.name, event.target.value)} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100" />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                        {semester.subjects.length} matiere{semester.subjects.length > 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSemester(semester.name, "up")} disabled={index === 0} className="rounded-md p-2 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" title="Monter le menu"><ArrowUp className="h-4 w-4" /></button>
                        <button onClick={() => moveSemester(semester.name, "down")} disabled={index === semesters.length - 1} className="rounded-md p-2 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" title="Descendre le menu"><ArrowDown className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="p-5">
              <div className="space-y-4">
                {subjects.map((subject, subjectIndex) => (
                  <section key={subject.slug} className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
                    <div className="bg-stone-50 p-5 dark:bg-[#151512]">
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Matiere</label>
                        <input value={subject.matiere} onChange={(event) => renameSubject(subject.slug, event.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base font-bold text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-100" />
                        <p className="mt-1.5 text-sm font-semibold text-stone-500 dark:text-stone-400">{subject.slug} - {subject.totalQuestions} question(s)</p>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="w-full max-w-[220px]">
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Menu</label>
                          <select value={subject.semesterName} onChange={(event) => assignSubjectToSemester(subject.slug, event.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-100">
                            {semesters.map((semester) => <option key={semester.name} value={semester.name}>{semester.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveSubject(subject.slug, "up")} disabled={subjectIndex === 0} className="rounded-lg p-2 hover:bg-white disabled:opacity-30 dark:hover:bg-stone-800" title="Monter la matiere"><ArrowUp className="h-5 w-5" /></button>
                          <button onClick={() => moveSubject(subject.slug, "down")} disabled={subjectIndex === subjects.length - 1} className="rounded-lg p-2 hover:bg-white disabled:opacity-30 dark:hover:bg-stone-800" title="Descendre la matiere"><ArrowDown className="h-5 w-5" /></button>
                          <button onClick={() => deleteSubject(subject.slug, subject.matiere)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Supprimer la matiere"><Trash2 className="h-5 w-5" /></button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div>
                          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Icone</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SUBJECT_ICON_KEYS.map((iconKey) => {
                              const Icon = SUBJECT_ICONS[iconKey];
                              const active = subject.subjectIcon === iconKey;

                              return (
                                <button
                                  key={iconKey}
                                  type="button"
                                  onClick={() => updateSubjectIcon(subject.slug, iconKey)}
                                  aria-label={`Icone ${iconKey}`}
                                  title={iconKey}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 transition ${
                                    active
                                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-400 dark:hover:bg-stone-800"
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Couleur</p>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const PreviewIcon = subject.subjectIcon
                                ? SUBJECT_ICONS[subject.subjectIcon]
                                : undefined;
                              const previewStyle = getSubjectColorStyle(subject.subjectColor);

                              return (
                                <span
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${previewStyle?.className || "border-stone-200 text-stone-400 dark:border-stone-700"}`}
                                  style={previewStyle?.style}
                                  title="Aperçu"
                                >
                                  {PreviewIcon ? <PreviewIcon className="h-4 w-4" /> : null}
                                </span>
                              );
                            })()}
                            <input
                              type="color"
                              value={subject.subjectColor && subject.subjectColor.startsWith("#") ? subject.subjectColor : DEFAULT_SUBJECT_COLOR}
                              onChange={(event) => updateSubjectColor(subject.slug, event.target.value)}
                              aria-label="Choisir une couleur"
                              className="h-8 w-12 cursor-pointer rounded-lg border border-stone-300 bg-white p-1 dark:border-stone-700 dark:bg-[#1d1c18]"
                            />
                            <input
                              type="text"
                              value={subject.subjectColor || ""}
                              onChange={(event) => updateSubjectColor(subject.slug, event.target.value)}
                              placeholder="#10b981"
                              className="w-24 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-mono text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-100"
                            />
                            <button
                              type="button"
                              onClick={() => addFavoriteColor(subject.subjectColor || DEFAULT_SUBJECT_COLOR)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-stone-500 transition hover:border-amber-400 hover:text-amber-500 dark:border-stone-700 dark:text-stone-400"
                              title="Ajouter aux couleurs favorites"
                              aria-label="Ajouter aux couleurs favorites"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          </div>

                          {favoriteColors.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {favoriteColors.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => updateSubjectColor(subject.slug, color)}
                                  onDoubleClick={() => removeFavoriteColor(color)}
                                  className="group relative h-6 w-6 shrink-0 rounded-full border border-stone-300 dark:border-stone-700"
                                  style={{ backgroundColor: color }}
                                  title={`${color} (double-clic pour retirer)`}
                                  aria-label={`Utiliser la couleur ${color}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-stone-100 dark:divide-stone-800">
                      {subject.exams.map((exam, examIndex) => (
                        <div key={`${exam.slug}-${exam.annee}`} className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[96px_1fr_140px_auto] lg:items-center">
                          <div className="text-sm font-black text-stone-500 dark:text-stone-400">{exam.annee}</div>
                          <input value={exam.examTitle || `${exam.matiere} - ${exam.annee}`} onChange={(event) => renameExam(exam.slug, exam.annee, event.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100" />
                          <div className="text-sm font-semibold text-stone-500 dark:text-stone-400">{exam.total_questions} question(s)</div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveExam(exam.slug, exam.annee, "up")} disabled={examIndex === 0} className="rounded-lg p-2 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" title="Monter l'epreuve"><ArrowUp className="h-4 w-4" /></button>
                            <button onClick={() => moveExam(exam.slug, exam.annee, "down")} disabled={examIndex === subject.exams.length - 1} className="rounded-lg p-2 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" title="Descendre l'epreuve"><ArrowDown className="h-4 w-4" /></button>
                            <Link href={`/admin/edit/${exam.slug}/${exam.annee}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"><Edit className="h-4 w-4" />Modifier</Link>
                            <button onClick={() => deleteExam(exam.slug, exam.annee)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Supprimer l'epreuve"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                {subjects.length === 0 && (
                  <div className="rounded-xl border border-dashed border-stone-300 py-12 text-center text-stone-500 dark:border-stone-700 dark:text-stone-400">
                    Aucun resultat.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>
              Les renommages et les changements d&apos;ordre restent en attente jusqu&apos;au clic sur Sauvegarder. Les suppressions, elles, sont appliquees apres confirmation.
            </p>
          </div>
        </div>
        </>
        )}

        {activeTab === "medtok" && (
          <AdminMedtokPanel
            existingSubjects={existingSubjects.map((subject) => ({
              slug: subject.slug,
              matiere: subject.matiere,
            }))}
            getAdminHeaders={getAdminHeaders}
            onStatus={showStatus}
          />
        )}

          </div>
        </div>
      </div>
    </div>
  );
}
