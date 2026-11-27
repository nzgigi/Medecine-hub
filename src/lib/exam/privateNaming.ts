/** Noms des QCM privés (admin) : tri, recherche et renommage. Logique pure. */

export const PRIVATE_NAME_MAX_LENGTH = 200;

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/** Tri « naturel » : Item 34, Item 35, puis Item 340. */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/gi, "oe")
    .toLowerCase();

/** Chaque mot saisi doit apparaître dans le nom ou l'année, sans tenir compte des accents. */
export function matchesSearch(entry: { matiere: string; annee: number }, query: string): boolean {
  const haystack = searchable(`${entry.matiere} ${entry.annee}`);

  return searchable(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

/** Renvoie le nom nettoyé, ou `null` s'il est vide ou trop long. */
export function cleanPrivateName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.replace(/\s+/g, " ").trim();
  return name && name.length <= PRIVATE_NAME_MAX_LENGTH ? name : null;
}

/** Applique le nouveau nom à une épreuve ; le slug, donc le suivi des erreurs, ne change pas. */
export function renameExam<T extends { matiere: string; annee: number; title?: string }>(
  exam: T,
  matiere: string
): T {
  const hasDefaultTitle = exam.title === `${exam.matiere} - ${exam.annee}`;

  return {
    ...exam,
    matiere,
    ...(hasDefaultTitle ? { title: `${matiere} - ${exam.annee}` } : {}),
  };
}
