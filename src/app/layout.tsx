import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/NavBar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <title>Medecine Hub - QCM Medecine Gratuit</title>
        <meta name="description" content="Revisez gratuitement avec des annales de DFASM1" />
      </head>
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
