import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteChrome from "../components/siteChrome";
import PageViewTracker from "../components/PageViewTracker";
import { DialogProvider } from "../components/DialogProvider";

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
    icon: "/brand/favicon-icon.png",
    apple: "/brand/favicon-icon.png",
  },

  openGraph: {
    title: "Medecine Hub - Annales et QCM facultaires de médecine",
    description:
      "Entraînez-vous sur des QCM d'annales de la faculté de Toulouse, classés par matières et par années.",
    url: "https://medecinehub.fr",
    siteName: "Medecine Hub",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/brand/banner-v2.png",
        width: 1200,
        height: 630,
        alt: "Medecine Hub - Annales et QCM facultaires de médecine",
      },
    ],
  },

  verification: {
    google: "4kICAnwJ5y9gXJwfENfEFY6KXSvW_mh2qZ0WZuylnhM",
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
        <DialogProvider>
          <SiteChrome>{children}</SiteChrome>
        </DialogProvider>
      </body>
    </html>
  );
}
