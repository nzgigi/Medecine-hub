"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { 
  Globe, 
  Code, 
  Smartphone, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  FileText,
  Rocket,
  CheckCircle,
  ArrowRight,
  Monitor,
  Zap,
  Shield,
  ExternalLink,
  Users,
  MessageSquare,
  Video,
  User
} from 'lucide-react';


interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  image?: string;
  link?: string;
}


export default function InoriWebPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };


    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);


  const projects: Project[] = [
    {
      id: '1',
      title: 'Medecine Hub',
      description: 'Plateforme éducative avec système de QCM pour étudiants en médecine. Interface moderne et intuitive.',
      category: 'Plateforme web',
      image: '/projects/medecine.png',
      link: 'https://inoritech.fr'
    },
    {
      id: '2',
      title: 'Soruden',
      description: 'Site communautaire complet avec guides, wiki et base de données pour la communauté Trove (jeu vidéo)',
      category: 'Site communautaire',
      image: '/projects/soruden.png',
      link: 'https://soruden.fr'
    },
    {
      id: '3',
      title: 'Institut Maris-Stella',
      description: 'Site web vitrine créé spécialement pour l\'institut Maris-Stella de Bruxelles. Design moderne et responsive.',
      category: 'Site web',
      image: '/projects/soon.gif'
    },
    {
      id: '4',
      title: 'TroveFall',
      description: 'Jeu web multijoueur inspiré de Spyfall, adapté à l\'univers Trove. Développé pour un créateur de contenu anglais avec +13K abonnés.',
      category: 'Site web / Jeu en ligne',
      image: '/projects/trovefall.png',
      link: 'https://trovefall.vercel.app/'
    },
    {
      id: '5',
      title: 'Bot Discord Soruden',
      description: 'Bot Discord pour la communauté Soruden, avec des fonctionnalités de gestion de serveur et d\'interaction.',
      category: 'Bot Discord',
      image: '/projects/sorudenbots.png'
    },
    {
      id: '6',
      title: 'Logiciel Complexe Soruden',
      description: 'Logiciel avancé pour la communauté Soruden, avec des fonctionnalités de gestion de contenu et d\'analyse en lisant la mémoire live d\'un jeu',
      category: 'Logiciel',
      image: '/projects/delveindex.png'
    }
  ];


  const services = [
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Sites web sur mesure',
      description: 'Création de sites vitrines modernes adaptés à vos besoins et votre budget.'
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: 'Applications web',
      description: 'Développement d\'applications web modernes, rapides et sécurisées.'
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Design responsive',
      description: 'Interfaces optimisées pour tous les appareils : mobile, tablette et ordinateur.'
    },
    {
      icon: <Monitor className="w-8 h-8" />,
      title: 'Refonte de site',
      description: 'Modernisation de votre site existant pour améliorer l\'expérience utilisateur.'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Performance',
      description: 'Sites ultra-rapides optimisés pour le référencement Google (SEO).'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Maintenance & Support',
      description: 'Accompagnement continu et support technique pour votre projet web.'
    }
  ];


  // ✅ MODIFIÉ : handleSubmit qui envoie vers /api/devis
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/devis', {  // ← Route spécifique pour les devis
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Demande de devis envoyée avec succès !');
        // Réinitialiser le formulaire
        setFormData({ 
          name: '', 
          email: '', 
          phone: '', 
          company: '', 
          message: '' 
        });
      } else {
        alert('❌ ' + (result.error || 'Erreur lors de l\'envoi'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur serveur');
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* Cursor glow effect - LE TRUC DE DINGUE */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition duration-300"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 80%)`
        }}
      />


      {/* Header / Hero Section */}
      <header className="relative">
        {/* Animated background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        
        <nav className="relative z-10 max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Inori Web
          </div>
          <div className="hidden md:flex gap-8">
            <a href="#services" className="hover:text-blue-400 transition-all duration-300 hover:scale-105">Services</a>
            <a href="#realisations" className="hover:text-blue-400 transition-all duration-300 hover:scale-105">Réalisations</a>
            <a href="#processus" className="hover:text-blue-400 transition-all duration-300 hover:scale-105">Processus</a>
            <a href="#contact" className="hover:text-blue-400 transition-all duration-300 hover:scale-105">Contact</a>
          </div>
        </nav>


        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-300">Disponible pour nouveaux projets</span>
            </div>


            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-[fadeIn_0.6s_ease-out]">
              Créons ensemble
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                votre site web
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed animate-[fadeIn_0.7s_ease-out]">
              Agence web belge spécialisée dans la création de sites modernes, performants et sur mesure.
            </p>


            <div className="flex flex-wrap gap-4 animate-[fadeIn_0.8s_ease-out]">
              <a
                href="#contact"
                className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]"
              >
                Demander un devis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <a
                href="#realisations"
                className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 px-8 py-4 rounded-xl font-bold transition-all duration-300 backdrop-blur-sm hover:border-blue-500"
              >
                Nos réalisations
              </a>
            </div>
          </div>
        </div>
      </header>


      {/* Stats avec animations */}
      <section className="relative py-16 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { value: '100%', label: 'Satisfait ou remboursé', delay: '0s' },
              { value: '2-4', label: 'Semaines de livraison', delay: '0.1s' },
              { value: '24/7', label: 'Support disponible', delay: '0.2s' }
            ].map((stat, index) => (
              <div 
                key={index}
                className="group text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105"
                style={{ animationDelay: stat.delay }}
              >
                <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Services */}
      <section id="services" className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Nos services
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Des solutions web complètes adaptées à vos besoins
            </p>
          </div>


          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={index}
                className="group bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors duration-300">{service.title}</h3>
                <p className="text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Compétences/Technologies - VERSION COMPACTE */}
      <section className="relative py-20 px-4 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Technologies & Compétences
            </h2>
            <p className="text-xl text-slate-400 mb-4">
              Bien plus que des sites web !
            </p>
            <p className="text-slate-500 max-w-3xl mx-auto">
              Nous maîtrisons un large éventail de technologies pour répondre à tous vos besoins : sites web, bots Discord/Telegram/WhatsApp, logiciels sur mesure, intégrations API et bien plus encore.
            </p>
          </div>


          {/* Grille de compétences compacte */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Web Development */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-bold text-lg mb-3">Développement Web</h3>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li>• Next.js / React</li>
                <li>• TypeScript / JavaScript</li>
                <li>• TailwindCSS</li>
                <li>• Node.js / API REST</li>
              </ul>
            </div>


            {/* Bots & Automation */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-bold text-lg mb-3">Bots & Automatisation</h3>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li>• Bots Discord</li>
                <li>• Bots Telegram</li>
                <li>• Bots WhatsApp</li>
                <li>• Scripts d'automatisation</li>
              </ul>
            </div>


            {/* Software & APIs */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-3">Logiciels & APIs</h3>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li>• Logiciels sur mesure</li>
                <li>• Intégrations API</li>
                <li>• Python / C++</li>
                <li>• Bases de données</li>
              </ul>
            </div>


            {/* Design & Performance */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-green-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-bold text-lg mb-3">Design & Performance</h3>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li>• UI/UX Design</li>
                <li>• Responsive Design</li>
                <li>• Optimisation SEO</li>
                <li>• Hébergement / VPS</li>
              </ul>
            </div>
          </div>


          {/* Highlight - Ce qu'on fait */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-6 h-6 text-blue-400" />
                <h4 className="font-bold text-lg">Sites Web</h4>
              </div>
              <p className="text-sm text-slate-300">
                Sites vitrines, plateformes éducatives, applications web complexes avec bases de données
              </p>
            </div>


            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
                <h4 className="font-bold text-lg">Bots Intelligents</h4>
              </div>
              <p className="text-sm text-slate-300">
                Création de bots Discord, Telegram, WhatsApp avec commandes personnalisées et intégrations API
              </p>
            </div>


            <div className="bg-gradient-to-br from-purple-500/10 to-green-500/10 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <Code className="w-6 h-6 text-purple-400" />
                <h4 className="font-bold text-lg">Solutions Sur Mesure</h4>
              </div>
              <p className="text-sm text-slate-300">
                Logiciels personnalisés, outils d'automatisation, intégrations avec vos systèmes existants
              </p>
            </div>
          </div>


          {/* Mini badges technologies */}
          <div className="mt-12 text-center">
            <p className="text-slate-500 mb-6 text-xs uppercase tracking-wider font-semibold">
              Stack technique
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'Next.js',
                'React',
                'TypeScript',
                'Node.js',
                'Python',
                'Discord.js',
                'TailwindCSS',
                'PostgreSQL',
                'C++',
                'Javascript',
                'C#',
                'Lua',
                'MySQL',
                'HTML/CSS'
              ].map((tech, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300 hover:-translate-y-0.5 text-sm"
                >
                  <span className="text-slate-300">
                    {tech}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Réalisations */}
      <section id="realisations" className="relative py-32 px-4 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Nos réalisations
            </h2>
            <p className="text-xl text-slate-400">
              Des projets concrets qui parlent pour nous
            </p>
          </div>


          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <div 
                key={project.id}
                className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:-translate-y-2"
              >
                {/* Image du projet */}
                <div className="relative h-56 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 overflow-hidden">
                  {project.image ? (
                    <Image 
                      src={project.image} 
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Globe className="w-20 h-20 text-blue-400/50 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent opacity-60" />
                </div>


                <div className="p-6">
                  <div className="text-sm text-blue-400 font-semibold mb-2">
                    {project.category}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors duration-300">
                    {project.title}
                  </h3>
                  <p className="text-slate-400 mb-4 leading-relaxed">
                    {project.description}
                  </p>
                  {project.link && (
                    <a 
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold group/link"
                    >
                      Voir le site
                      <ExternalLink className="w-4 h-4 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform duration-300" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>


          {/* Message de flexibilité */}
          <div className="mt-16 text-center max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-8 backdrop-blur-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-500">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Rocket className="w-8 h-8 text-blue-400" />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Un projet unique en tête ?
                </h3>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed mb-4">
                Ces réalisations ne sont qu'un aperçu de nos compétences. 
                <span className="font-bold text-white"> Nous savons nous adapter à presque tout type de projet</span> : 
                site web, application, bot, logiciel, API... 
              </p>
              <p className="text-slate-400">
                Vous avez une idée particulière ? Parlons-en ! On trouve toujours une solution. 💪
              </p>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              >
                Discuter de votre projet
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* Processus - VERSION AMÉLIORÉE */}
      <section id="processus" className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-slate-400">Un processus simple et transparent en 4 étapes</p>
          </div>


          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                step: '1', 
                icon: <MessageSquare className="w-8 h-8" />,
                title: 'Contact', 
                desc: 'Vous nous contactez par email, téléphone ou en personne. On s\'adapte à vous !' 
              },
              { 
                step: '2', 
                icon: <FileText className="w-8 h-8" />,
                title: 'Devis', 
                desc: 'Nous créons un devis gratuit et personnalisé selon vos besoins' 
              },
              { 
                step: '3', 
                icon: <Code className="w-8 h-8" />,
                title: 'Développement', 
                desc: 'Nous créons votre site avec des rendez-vous réguliers pour mettre les choses au point' 
              },
              { 
                step: '4', 
                icon: <Rocket className="w-8 h-8" />,
                title: 'Livraison', 
                desc: 'Mise en ligne de votre site et formation complète à son utilisation' 
              }
            ].map((item, index) => (
              <div 
                key={index} 
                className="group relative"
              >
                {/* Ligne de connexion */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent" />
                )}
                
                <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:-translate-y-3">
                  {/* Numéro de l'étape */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black mb-4 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    {item.step}
                  </div>
                  
                  {/* Icône */}
                  <div className="flex justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-center mb-3 group-hover:text-blue-400 transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-center leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Section Contact améliorée */}
      <section className="relative py-20 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-full px-6 py-3 mb-8">
            <Users className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-semibold">Nous sommes là pour vous !</span>
          </div>
          
          <h2 className="text-4xl font-black mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Contact flexible et personnalisé
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Nous nous adaptons à VOS préférences de communication
          </p>


          {/* Options de contact */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">En personne</h3>
              <p className="text-sm text-slate-400">Rencontre physique à Bruxelles</p>
            </div>


            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">Visioconférence</h3>
              <p className="text-sm text-slate-400">Appel vidéo via Teams/Zoom</p>
            </div>


            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-teal-500/50 hover:shadow-[0_0_30px_rgba(20,184,166,0.2)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-teal-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">Par téléphone</h3>
              <p className="text-sm text-slate-400">Appel simple et rapide</p>
            </div>
          </div>


          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-blue-400" />
              <span className="font-bold text-lg">On fait TOUT pour le client</span>
            </div>
            <p className="text-slate-300">
              Choisissez le mode de communication qui VOUS convient. Votre confort est notre priorité !
            </p>
          </div>
        </div>
      </section>


      {/* Contact Form */}
      <section id="contact" className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Formulaire */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-blue-500/30 transition-all duration-500">
              <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Demande de devis gratuit
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500"
                    placeholder="Jean Dupont"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500"
                    placeholder="jean@exemple.com"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500"
                    placeholder="+32 488 96 43 80"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Entreprise
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500"
                    placeholder="Nom de votre entreprise"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-white placeholder-slate-500 resize-none"
                    placeholder="Décrivez votre projet..."
                  />
                </div>


                <button
                  type="submit"
                  className="group w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  Envoyer ma demande
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </form>
            </div>


            {/* Informations */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-blue-500/30 transition-all duration-500">
                <h3 className="text-2xl font-bold mb-6">Informations de contact</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Email</div>
                      <a href="mailto:inoritechlje@gmail.com" className="text-blue-400 hover:text-blue-300 transition-colors duration-300">
                        inoritechlje@gmail.com
                      </a>
                    </div>
                  </div>


                  <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Téléphone</div>
                      <a href="tel:+32488964380" className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300">
                        +32 488 96 43 80
                      </a>
                    </div>
                  </div>


                  <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Localisation</div>
                      <div className="text-slate-400">Bruxelles, Belgique</div>
                    </div>
                  </div>
                </div>
              </div>


              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-500">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold mb-2">Réponse rapide garantie</div>
                    <p className="text-slate-300 text-sm">
                      Nous répondons à toutes les demandes sous 24h ouvrées. 
                      Devis gratuit et sans engagement.
                    </p>
                  </div>
                </div>
              </div>


              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 text-center hover:border-slate-600 transition-all duration-300">
                <div className="text-sm text-slate-400 mb-2">Numéro de TVA</div>
                <div className="font-semibold text-lg">En cours de création</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="relative border-t border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Inori Web
              </div>
              <p className="text-slate-400">
                Agence web belge spécialisée dans la création de sites modernes et performants.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Liens rapides</h4>
              <div className="space-y-2">
                <a href="#services" className="block text-slate-400 hover:text-blue-400 transition-colors duration-300">Services</a>
                <a href="#realisations" className="block text-slate-400 hover:text-blue-400 transition-colors duration-300">Réalisations</a>
                <a href="#processus" className="block text-slate-400 hover:text-blue-400 transition-colors duration-300">Processus</a>
                <a href="#contact" className="block text-slate-400 hover:text-blue-400 transition-colors duration-300">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-slate-400">
                <div>Bruxelles, Belgique</div>
                <div>contact@inoriweb.be</div>
                <div>TVA: En cours</div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>© 2026 Inori Web. Tous droits réservés.</p>
          </div>
        </div>
      </footer>


    </div>
  );
}
