import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteChrome from "../components/siteChrome";
import PageViewTracker from "../components/PageViewTracker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://medecinehub.fr"),

  title: {
    default: "Medecine Hub - QCM gratuits DFASM1 et DFASM2",
    template: "%s | Medecine Hub",
  },

  description:
    "Révisez gratuitement vos examens de médecine avec des centaines de QCM d'annales DFASM1 et DFASM2 classés par matière et par année.",

  icons: {
    icon: "/brand/pfp-v2.png",
    apple: "/brand/pfp-v2.png",
  },

  openGraph: {
    title: "Medecine Hub - Annales et QCM gratuits de médecine",
    description:
      "Entraînez-vous gratuitement sur des QCM d'annales DFASM1 et DFASM2 classés par matière et par année.",
    url: "https://medecinehub.fr",
    siteName: "Medecine Hub",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/brand/banner.jpg",
        width: 1200,
        height: 630,
        alt: "Medecine Hub - Annales et QCM gratuits de médecine",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.className} bg-stone-50 text-stone-950 antialiased dark:bg-[#151512] dark:text-stone-100`}
      >
        <PageViewTracker />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
