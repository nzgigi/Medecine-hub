"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MatiereCard from '@/components/MatiereCard';
import { BookOpen, Users, Sparkles, Github, Heart, FileText } from 'lucide-react';

interface MatiereData {
  matiere: string;
  slug: string;
  annees: number[];
  totalQuestions: number;
}

export default function HomePage() {
  const [matieres, setMatieres] = useState<MatiereData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatieres() {
      try {
        const response = await fetch('/data/qcm/index.json');
        const data = await response.json();
        
        const grouped: { [key: string]: any } = {};
        data.forEach((item: any) => {
          if (!grouped[item.matiere]) {
            grouped[item.matiere] = {
              matiere: item.matiere,
              slug: item.slug,
              annees: [],
              totalQuestions: 0,
            };
          }
          grouped[item.matiere].annees.push(item.annee);
          grouped[item.matiere].totalQuestions += item.total_questions;
        });
        
        const matieresArray = Object.values(grouped).map((m: any) => ({
          ...m,
          annees: m.annees.sort()
        }));
        
        setMatieres(matieresArray);
        setLoading(false);
      } catch (error) {
        console.error('Erreur chargement:', error);
        setLoading(false);
      }
    }
    loadMatieres();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  const totalQuestions = matieres.reduce((acc, m) => acc + m.totalQuestions, 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section avec gradient animé */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-8 border border-white/20">
              <Sparkles className="w-4 h-4" />
              <span>100% Gratuit • DFASM1</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl font-extrabold mb-6 leading-tight">
              Révisez avec
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-pink-200">
                Medecine Hub
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Des centaines de QCM d'annales pour préparer vos examens de médecine gratuitement
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#matieres"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <BookOpen className="w-5 h-5" />
                Commencer maintenant
              </a>
              <Link
                href="/sources"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all border border-white/30"
              >
                <FileText className="w-5 h-5" />
                Sources
              </Link>
            </div>
          </div>
        </div>

        {/* Vague en bas */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(249, 250, 251)"/>
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div className="text-4xl font-extrabold text-gray-900 mb-2">{totalQuestions}</div>
            <div className="text-gray-600 font-medium">Questions disponibles</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="text-4xl font-extrabold text-gray-900 mb-2">{matieres.length}</div>
            <div className="text-gray-600 font-medium">Matières</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="text-4xl font-extrabold text-gray-900 mb-2">100%</div>
            <div className="text-gray-600 font-medium">Gratuit</div>
          </div>
        </div>

        {/* Matières */}
        <div id="matieres" className="pb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Choisissez votre matière
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Parcourez nos annales classées par spécialité et année
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matieres.map((matiere) => (
              <MatiereCard
                key={matiere.slug}
                matiere={matiere.matiere}
                slug={matiere.slug}
                totalQuestions={matiere.totalQuestions}
                annees={matiere.annees}
              />
            ))}
          </div>
        </div>

        {/* CTA Support */}
        <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-3xl shadow-2xl p-12 text-center text-white mb-20">
          <Heart className="w-16 h-16 mx-auto mb-6 animate-pulse" />
          <h2 className="text-3xl font-extrabold mb-4">Vous aimez Medecine Hub ?</h2>
          <p className="text-lg text-purple-100 mb-8 max-w-2xl mx-auto">
            Soutenez le projet pour nous aider à ajouter plus de contenu et maintenir la plateforme gratuite
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/soutenir"
              className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-xl"
            >
              <Heart className="w-5 h-5" />
              Soutenir le projet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
