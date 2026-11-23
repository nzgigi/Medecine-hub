"use client";

import type { FilterOptions, PrivateFilters } from "@/lib/exam/privateTraining";

const SELECT_CLASSES =
  "w-full rounded-lg border-2 border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100";

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={SELECT_CLASSES}>
        <option value="">Tous</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Les sept filtres combinables, partagés par l'écran de réglage et « Mes erreurs ». */
export default function PrivateFiltersForm({
  filters,
  options,
  onChange,
  hideStatus = false,
}: {
  filters: PrivateFilters;
  options: FilterOptions;
  onChange: (filters: PrivateFilters) => void;
  /** Dans « Mes erreurs », le statut est fixé (erreurs actives). */
  hideStatus?: boolean;
}) {
  const set = <K extends keyof PrivateFilters>(key: K, value: string) =>
    onChange({ ...filters, [key]: value } as PrivateFilters);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Matière"
        value={filters.matiere}
        onChange={(v) => set("matiere", v)}
        options={options.matieres.map((m) => ({ value: m.slug, label: m.label }))}
      />
      <Field
        label="Item"
        value={filters.item}
        onChange={(v) => set("item", v)}
        options={options.items.map((item) => ({ value: item, label: item }))}
      />
      <Field
        label="Rang"
        value={filters.rang}
        onChange={(v) => set("rang", v)}
        options={[
          { value: "A", label: "Rang A" },
          { value: "B", label: "Rang B" },
        ]}
      />
      <Field
        label="Population"
        value={filters.population}
        onChange={(v) => set("population", v)}
        options={[
          { value: "adulte", label: "Adulte" },
          { value: "pediatrie", label: "Pédiatrie" },
        ]}
      />
      <Field
        label="Type de dossier"
        value={filters.type}
        onChange={(v) => set("type", v)}
        options={[
          { value: "SQI", label: "SQI" },
          { value: "DP", label: "DP" },
          { value: "KFP", label: "KFP" },
        ]}
      />
      {!hideStatus && (
        <Field
          label="Statut"
          value={filters.statut}
          onChange={(v) => set("statut", v)}
          options={[
            { value: "jamais", label: "Jamais faites" },
            { value: "erreurs", label: "Erreurs actives" },
            { value: "reussies", label: "Déjà réussies" },
          ]}
        />
      )}
    </div>
  );
}
