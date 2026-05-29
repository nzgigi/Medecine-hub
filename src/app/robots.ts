import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://medecinehub.fr";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}