const PARIS_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jour calendaire (YYYY-MM-DD) à Paris, pour que les compteurs journaliers basculent à minuit heure française. */
export function parisDay(date: Date = new Date()): string {
  return PARIS_DAY_FORMATTER.format(date);
}

/** Les `count` derniers jours (le plus ancien d'abord, aujourd'hui en dernier), à Paris. */
export function lastParisDays(count: number): string[] {
  const [year, month, day] = parisDay().split("-").map(Number);
  const days: string[] = [];

  // Arithmétique en UTC pur : pas de saut d'heure d'été/hiver à gérer.
  for (let i = count - 1; i >= 0; i--) {
    days.push(new Date(Date.UTC(year, month - 1, day - i)).toISOString().slice(0, 10));
  }

  return days;
}
