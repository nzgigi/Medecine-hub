import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      // Domaine canonique: tout le trafic www est renvoye vers l'apex.
      // Sans ca, Google Identity Services s'initialise avec
      // origin=https://www.medecinehub.fr, qui n'est pas dans les origines
      // JavaScript autorisees du client OAuth -> "Acces bloque : erreur
      // d'autorisation" a la connexion.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.medecinehub.fr" }],
        destination: "https://medecinehub.fr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
