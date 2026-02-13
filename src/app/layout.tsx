'use client';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/NavBar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNzPage = pathname === '/nz';

  return (
    <html lang="fr">
      <head>
        <title>Medecine Hub - QCM gratuits DFASM1</title>
<meta name="description" content="Des centaines de QCM d'annales DFASM1 gratuits pour réviser vos examens de médecine. Toutes les matières, toutes les années." />

      </head>
      <body className={inter.className}>
        {isNzPage ? (
          // Page /nz : juste le contenu, sans navbar ni footer
          children
        ) : (
          // Toutes les autres pages : avec navbar et footer
          <>
            <Navbar />
            <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
              {children}
            </main>
            <footer className="bg-gray-900 text-white py-8 mt-12">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-gray-400">© 2026 Medecine Hub - Plateforme gratuite pour etudiants en medecine</p>
                <p className="text-sm text-gray-500 mt-2">DFASM1 - Annales 2023, 2024, 2025</p>
              </div>
            </footer>
          </>
        )}
      </body>
    </html>
  );
}
