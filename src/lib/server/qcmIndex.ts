export interface IndexEntry {
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

export function normalizeIndex(entries: IndexEntry[]): IndexEntry[] {
  const subjectSlugs: string[] = [];

  entries.forEach((entry) => {
    if (!subjectSlugs.includes(entry.slug)) {
      subjectSlugs.push(entry.slug);
    }
  });

  const subjectOrderMap = new Map<string, number>();

  subjectSlugs
    .map((slug) => {
      const subjectEntries = entries.filter((entry) => entry.slug === slug);
      const existingOrder = subjectEntries.find(
        (entry) => typeof entry.subjectOrder === "number"
      )?.subjectOrder;

      return {
        slug,
        order: existingOrder ?? subjectSlugs.indexOf(slug) + 1,
      };
    })
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => {
      subjectOrderMap.set(item.slug, index + 1);
    });

  const grouped = new Map<string, IndexEntry[]>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.slug)) {
      grouped.set(entry.slug, []);
    }

    grouped.get(entry.slug)?.push(entry);
  });

  const normalized: IndexEntry[] = [];

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
