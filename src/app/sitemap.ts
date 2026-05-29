import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

interface IndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  subjectOrder?: number;
  examOrder?: number;
  examTitle?: string;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://medecinehub.fr";
  const qcmIndexPath = path.join(
    process.cwd(),
    "public",
    "data",
    "qcm",
    "index.json"
  );

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  if (!fs.existsSync(qcmIndexPath)) {
    return routes;
  }

  try {
    const raw = fs.readFileSync(qcmIndexPath, "utf-8");
    const indexData = JSON.parse(raw) as IndexEntry[];

    const qcmRoutes: MetadataRoute.Sitemap = indexData.map((entry) => ({
      url: `${baseUrl}/qcm/${entry.slug}/${entry.annee}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    return [...routes, ...qcmRoutes];
  } catch (error) {
    console.error("Erreur génération sitemap:", error);
    return routes;
  }
}