"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ImagePoint, ImageZone } from "@/types/exam";

export const ZONE_COLOR_PALETTE = [
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#06b6d4",
  "#84cc16",
];

export function getZoneColor(index: number): string {
  return ZONE_COLOR_PALETTE[index % ZONE_COLOR_PALETTE.length];
}

function distanceBetweenPoints(a: ImagePoint, b: ImagePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface ImageZoneCanvasProps {
  image: string;
  /** Points a afficher (reponse de l'eleve, ou zones en mode auteur admin). */
  points: ImagePoint[];
  /** Zones correctes : affichees en overlay (correction, admin). */
  zones?: ImageZone[];
  /** Si fourni, un clic sur l'image ajoute un point. */
  onAddPoint?: (point: ImagePoint) => void;
  /** Si fourni, un clic sur un point existant le retire. */
  onRemovePoint?: (index: number) => void;
  className?: string;
  imageAlt?: string;
}

export default function ImageZoneCanvas({
  image,
  points,
  zones,
  onAddPoint,
  onRemovePoint,
  className,
  imageAlt = "Image annotable",
}: ImageZoneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(0);

  // Mesure synchrone immediate (avant peinture) pour eviter un flash sans
  // marqueurs le temps que ResizeObserver declenche son premier callback.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.getBoundingClientRect().width;
    if (width) setRenderedWidth(width);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setRenderedWidth(width);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toPx = (fraction: number) => fraction * renderedWidth;

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.width;

    onAddPoint({ x, y });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`relative select-none overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700 ${
        onAddPoint ? "cursor-crosshair" : ""
      } ${className || ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={imageAlt} className="block w-full" draggable={false} />

      {renderedWidth > 0 &&
        zones?.map((zone, index) => {
          const color = getZoneColor(index);

          return (
            <div
              key={`zone-${index}`}
              className="pointer-events-none absolute rounded-full border-2"
              style={{
                left: toPx(zone.x),
                top: toPx(zone.y),
                width: toPx(zone.radius * 2),
                height: toPx(zone.radius * 2),
                transform: "translate(-50%, -50%)",
                borderColor: color,
                backgroundColor: `${color}26`,
              }}
              title={zone.label}
            />
          );
        })}

      {renderedWidth > 0 &&
        points.map((point, index) => {
          const withinZone = zones?.some(
            (zone) => distanceBetweenPoints(point, zone) <= zone.radius
          );

          const colorClasses = zones
            ? withinZone
              ? "border-emerald-600 bg-emerald-600"
              : "border-red-600 bg-red-600"
            : "border-white bg-emerald-600";

          return (
            <button
              key={`point-${index}`}
              type="button"
              onClick={(event) => {
                if (!onRemovePoint) return;
                event.stopPropagation();
                onRemovePoint(index);
              }}
              className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-white shadow ${colorClasses} ${
                onRemovePoint ? "cursor-pointer" : "cursor-default"
              }`}
              style={{ left: toPx(point.x), top: toPx(point.y) }}
              aria-label={onRemovePoint ? "Retirer ce marqueur" : "Marqueur"}
              title={onRemovePoint ? "Cliquer pour retirer" : undefined}
            >
              {onRemovePoint && <X className="h-3.5 w-3.5" />}
            </button>
          );
        })}
    </div>
  );
}
