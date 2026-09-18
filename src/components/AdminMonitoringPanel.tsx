"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Clock,
  Cpu,
  Eye,
  Flag,
  RefreshCw,
  Server,
  Target,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import type { MonitoringData } from "@/lib/server/monitoring";

const REFRESH_INTERVAL_MS = 15_000;
const BACKUP_MAX_AGE_MS = 36 * 3_600_000;

interface AdminMonitoringPanelProps {
  getAdminHeaders: (extraHeaders?: HeadersInit) => HeadersInit;
}

const CARD_CLASS =
  "rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]";

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

function plural(count: number, singular: string) {
  return count > 1 ? `${singular}s` : singular;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function formatRelative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  return `il y a ${Math.round(hours / 24)} j`;
}

/** Jour "YYYY-MM-DD" formaté sans décalage de fuseau. */
function formatDay(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`)
  );
}

/** Plus petit maximum "rond" et pair (pour que la graduation du milieu soit entière). */
function niceMax(value: number) {
  if (value <= 4) return 4;

  const magnitude = 10 ** Math.floor(Math.log10(value));

  for (const step of [1, 2, 4, 6, 8, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }

  return 10 * magnitude;
}

interface ChartPoint {
  label: string;
  detail: string;
  value: number;
}

function BarChart({
  points,
  barClassName,
  labelEvery,
  summary,
}: {
  points: ChartPoint[];
  barClassName: string;
  labelEvery: number;
  summary: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const top = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const ticks = [top, top / 2, 0];
  const active = hovered === null ? null : points[hovered];

  return (
    <div>
      <div className="mb-3 min-h-5 text-xs font-semibold text-stone-500 dark:text-stone-400">
        {active ? (
          <span className="text-stone-900 dark:text-stone-100">{active.detail}</span>
        ) : (
          summary
        )}
      </div>

      <div className="flex" onMouseLeave={() => setHovered(null)}>
        <div className="relative h-40 w-9 shrink-0" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2 text-[10px] tabular-nums text-stone-400 dark:text-stone-500"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-40">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-dashed border-stone-200 dark:border-stone-800"
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-[3px]">
              {points.map((point, index) => (
                <div
                  key={point.label + index}
                  className="flex h-full flex-1 cursor-default items-end"
                  onMouseEnter={() => setHovered(index)}
                  onClick={() => setHovered(index)}
                  title={point.detail}
                >
                  <div
                    className={`w-full rounded-t-[3px] transition-opacity ${barClassName} ${
                      hovered === null || hovered === index ? "opacity-100" : "opacity-50"
                    }`}
                    style={{
                      height: `${(point.value / top) * 100}%`,
                      minHeight: point.value > 0 ? 3 : 0,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1.5 flex gap-[3px]">
            {points.map((point, index) => (
              <div key={point.label + index} className="relative h-4 flex-1">
                {(points.length - 1 - index) % labelEvery === 0 && (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-stone-400 dark:text-stone-500">
                    {point.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  children,
}: {
  icon: typeof BarChart3;
  iconClassName: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={CARD_CLASS}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-black">{title}</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{detail}</p>
    </div>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      role="img"
      aria-label={online ? "En ligne" : "Hors ligne"}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        online ? "bg-green-500" : "bg-stone-400 dark:bg-stone-500"
      }`}
    />
  );
}

export default function AdminMonitoringPanel({ getAdminHeaders }: AdminMonitoringPanelProps) {
  const router = useRouter();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/monitoring", { headers: getAdminHeaders() });

      if (response.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }

      const result = (await response.json()) as
        | ({ success: true } & MonitoringData)
        | { success: false };

      if (result.success) {
        setData(result);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch (error) {
      console.error("Erreur chargement monitoring:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [getAdminHeaders, router]);

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <section className={CARD_CLASS}>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {failed ? "Impossible de charger le monitoring." : "Chargement..."}
        </p>
      </section>
    );
  }

  const { live, views, members, activity, system } = data;
  const maxTopPage = Math.max(1, ...views.topPages.map((page) => page.total));
  const peakToday = Math.max(0, ...live.hourly.map((slot) => slot.peak));

  const hourlyPoints: ChartPoint[] = live.hourly.map((slot) => {
    const start = new Date(slot.hour);
    const hour = start.getHours();
    const date = start.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    return {
      label: `${hour}h`,
      value: slot.peak,
      detail: `${date}, ${hour}h–${(hour + 1) % 24}h : pic de ${slot.peak} ${plural(slot.peak, "connecté")}`,
    };
  });

  const dailyPoints = (series: { day: string; total: number }[], unit: string): ChartPoint[] =>
    series.map((point) => ({
      label: formatDay(point.day, { day: "2-digit", month: "2-digit" }),
      value: point.total,
      detail: `${formatDay(point.day, { weekday: "short", day: "numeric", month: "short" })} : ${formatNumber(point.total)} ${plural(point.total, unit)}`,
    }));

  const sum = (series: { total: number }[]) => series.reduce((acc, point) => acc + point.total, 0);
  const viewsTotal30 = sum(views.daily);
  const signupsTotal30 = sum(members.signupsDaily);
  const attemptsTotal30 = sum(activity.attemptsDaily);
  const backupIsStale =
    !system.lastBackup ||
    Date.now() - new Date(system.lastBackup.at).getTime() > BACKUP_MAX_AGE_MS;

  return (
    <div className="space-y-6">
      <section className={CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
              <Users className="h-7 w-7" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-[#1d1c18]" />
              </span>
            </div>
            <div>
              <p className="text-3xl font-black leading-tight">
                {formatNumber(live.visitors)} {plural(live.visitors, "étudiant")}{" "}
                {plural(live.visitors, "connecté")}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {formatNumber(live.memberCount)} {plural(live.memberCount, "membre")} ·{" "}
                {formatNumber(live.anonymous)} {plural(live.anonymous, "visiteur")} sans compte
              </p>
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        <div className="mt-5 grid gap-5 border-t border-stone-100 pt-5 dark:border-stone-800 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Membres en ligne
            </h3>
            {live.members.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Aucun membre connecté.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {live.members.map((member) => (
                  <a
                    key={member.handle}
                    href={`/profil/${member.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 py-1 pl-2.5 pr-3 text-sm font-semibold transition hover:border-green-400 dark:border-stone-700"
                  >
                    <StatusDot online />
                    {member.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Pages consultées en ce moment
            </h3>
            {live.pages.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Personne sur le site.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {live.pages.map((page) => (
                  <li key={page.path} className="flex items-center justify-between gap-3">
                    <span className="truncate text-stone-700 dark:text-stone-200">{page.path}</span>
                    <span className="font-bold">{page.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Eye}
          label="Vues aujourd'hui"
          value={formatNumber(views.today)}
          detail={`${formatNumber(views.total)} au total`}
        />
        <Kpi
          icon={Users}
          label="Membres"
          value={formatNumber(members.total)}
          detail={`+${members.newThisWeek} cette semaine · ${members.activeThisWeek} ${plural(members.activeThisWeek, "actif")}`}
        />
        <Kpi
          icon={BookOpen}
          label="Épreuves passées"
          value={formatNumber(activity.totalAttempts)}
          detail={`${formatNumber(activity.attemptsThisWeek)} cette semaine`}
        />
        <Kpi
          icon={Target}
          label="Score moyen"
          value={`${activity.avgScorePercent}%`}
          detail="Sur toutes les épreuves"
        />
        <Kpi
          icon={Zap}
          label="MedTok"
          value={formatNumber(activity.medtokAnswered)}
          detail="Cartes répondues"
        />
        <Kpi
          icon={Flag}
          label="Signalements"
          value={formatNumber(data.openReports)}
          detail={`${plural(data.openReports, "question")} à traiter`}
        />
        <Kpi
          icon={BarChart3}
          label="Pages suivies"
          value={formatNumber(views.trackedPaths)}
          detail="Chemins distincts vus"
        />
        <Kpi
          icon={Clock}
          label="Disponibilité"
          value={formatUptime(system.uptimeSeconds)}
          detail="Depuis le dernier redémarrage"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          icon={Activity}
          iconClassName="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          title="Connectés par heure"
          subtitle="Pic de connectés simultanés, 24 dernières heures"
        >
          <BarChart
            points={hourlyPoints}
            barClassName="bg-green-500 dark:bg-green-600"
            labelEvery={3}
            summary={`Pic sur 24 h : ${formatNumber(peakToday)} ${plural(peakToday, "connecté")}`}
          />
        </ChartCard>

        <ChartCard
          icon={Eye}
          iconClassName="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          title="Vues du site"
          subtitle="30 derniers jours (compteur simple, sans suivi individuel)"
        >
          <BarChart
            points={dailyPoints(views.daily, "vue")}
            barClassName="bg-sky-500 dark:bg-sky-600"
            labelEvery={5}
            summary={`${formatNumber(viewsTotal30)} ${plural(viewsTotal30, "vue")} sur 30 jours`}
          />
        </ChartCard>

        <ChartCard
          icon={UserPlus}
          iconClassName="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          title="Inscriptions"
          subtitle="Nouveaux membres par jour, 30 derniers jours"
        >
          <BarChart
            points={dailyPoints(members.signupsDaily, "inscription")}
            barClassName="bg-violet-500 dark:bg-violet-600"
            labelEvery={5}
            summary={`${formatNumber(signupsTotal30)} ${plural(signupsTotal30, "inscription")} sur 30 jours`}
          />
        </ChartCard>

        <ChartCard
          icon={BookOpen}
          iconClassName="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          title="Épreuves passées"
          subtitle="QCM terminés par jour, 30 derniers jours"
        >
          <BarChart
            points={dailyPoints(activity.attemptsDaily, "épreuve")}
            barClassName="bg-amber-500 dark:bg-amber-600"
            labelEvery={5}
            summary={`${formatNumber(attemptsTotal30)} ${plural(attemptsTotal30, "épreuve")} sur 30 jours`}
          />
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={CARD_CLASS}>
          <h3 className="mb-3 text-base font-black">Pages les plus vues</h3>
          {views.topPages.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Aucune vue enregistrée pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {views.topPages.map((page) => (
                <li key={page.path} className="text-sm">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate font-semibold text-stone-700 dark:text-stone-200">
                      {page.path}
                    </span>
                    <span className="font-bold tabular-nums">{formatNumber(page.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className="h-full rounded-full bg-sky-500 dark:bg-sky-600"
                      style={{ width: `${(page.total / maxTopPage) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-3 text-base font-black">Membres récemment actifs</h3>
          {members.recent.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Aucun membre inscrit.</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {members.recent.map((member) => (
                <li key={member.handle} className="flex items-center gap-3 py-2 text-sm">
                  <StatusDot online={member.online} />
                  <a
                    href={`/profil/${member.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate font-semibold hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    {member.name}
                  </a>
                  <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                    {member.online ? "en ligne" : formatRelative(member.lastSeenAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-3 flex items-center gap-2 text-base font-black">
            <Server className="h-4 w-4" />
            Serveur
          </h3>
          <dl className="space-y-2.5 text-sm">
            {[
              ["Disponibilité", formatUptime(system.uptimeSeconds)],
              ["Mémoire (RSS)", `${system.memoryMb} Mo`],
              ["Mémoire JS utilisée", `${system.heapUsedMb} Mo`],
              ["Base de données", `${system.dbSizeMb} Mo`],
              ["Node.js", system.nodeVersion],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                  <Cpu className="h-3.5 w-3.5" />
                  {label}
                </dt>
                <dd className="font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              backupIsStale
                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                : "border-stone-200 dark:border-stone-800"
            }`}
          >
            <div className="font-bold">Sauvegarde de la base</div>
            {system.lastBackup ? (
              <div className="text-xs">
                {formatRelative(system.lastBackup.at)} ·{" "}
                {Math.max(1, Math.round(system.lastBackup.bytes / 1024))} Ko
                {backupIsStale && " · plus de 36 h, à vérifier"}
              </div>
            ) : (
              <div className="text-xs">Aucune sauvegarde enregistrée (scripts/setup-ops.sh).</div>
            )}
          </div>

          <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
            Actualisé à {new Date(data.generatedAt).toLocaleTimeString("fr-FR")} · mise à jour
            automatique toutes les {REFRESH_INTERVAL_MS / 1000} s.
          </p>
        </div>
      </section>
    </div>
  );
}
