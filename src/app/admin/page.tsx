"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Edit, LogOut, AlertCircle, RefreshCw, Save } from 'lucide-react';

interface MatiereIndex {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
}

export default function AdminDashboard() {
  const [matieres, setMatieres] = useState<MatiereIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [backing, setBacking] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    loadMatieres();
  }, [router]);

  const loadMatieres = async () => {
    try {
      const response = await fetch('/data/qcm/index.json?t=' + Date.now());
      const data = await response.json();
      setMatieres(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const handleSyncIndex = async () => {
    if (!confirm('Recalculer tous les totaux de questions depuis les fichiers QCM ?')) return;
    
    setSyncing(true);
    setSyncMessage('');
    
    try {
      const response = await fetch('/api/admin/sync-index', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSyncMessage(result.message);
        
        if (result.changes.length > 0) {
          console.log('📊 Modifications détectées:');
          console.table(result.changes);
        }
        
        await loadMatieres();
        
        setTimeout(() => setSyncMessage(''), 5000);
      } else {
        alert('❌ Erreur: ' + result.message);
      }
    } catch (error) {
      console.error('Erreur sync:', error);
      alert('❌ Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleBackup = async () => {
    if (!confirm('Créer un backup manuel sur GitHub ?\n\nCela va sauvegarder tous les fichiers QCM actuels.')) return;
    
    setBacking(true);
    setBackupMessage('');
    
    try {
      const response = await fetch('/api/admin/backup', { 
        method: 'POST' 
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBackupMessage(result.message);
        setTimeout(() => setBackupMessage(''), 5000);
      } else {
        alert('❌ Erreur: ' + result.message);
      }
    } catch (error) {
      console.error('Erreur backup:', error);
      alert('❌ Erreur lors du backup');
    } finally {
      setBacking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

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

  const totalQuestions = matieres.reduce((acc, m) => acc + m.total_questions, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Gestion des QCM Medecine Hub</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {backupMessage && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold">
                  ✅ {backupMessage}
                </div>
              )}
              {syncMessage && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold">
                  ✅ {syncMessage}
                </div>
              )}
              <button
                onClick={handleBackup}
                disabled={backing}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className={`w-4 h-4 ${backing ? 'animate-pulse' : ''}`} />
                {backing ? 'Backup...' : 'Backup GitHub'}
              </button>
              <button
                onClick={handleSyncIndex}
                disabled={syncing}
                className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-600 mb-1">{totalQuestions}</div>
            <div className="text-gray-600 font-medium">Questions totales</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-purple-600 mb-1">{matieres.length}</div>
            <div className="text-gray-600 font-medium">Fichiers QCM</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {new Set(matieres.map(m => m.matiere)).size}
            </div>
            <div className="text-gray-600 font-medium">Matières</div>
          </div>
        </div>

        {/* Liste des QCM */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Gestion des QCM</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Matière</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Année</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-700">Questions</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((matiere, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900">{matiere.matiere}</td>
                    <td className="py-4 px-4 text-gray-600">{matiere.annee}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {matiere.total_questions}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/edit/${matiere.slug}/${matiere.annee}`}
                          className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Backup automatique sur GitHub</h3>
              <p className="text-blue-800 text-sm">
                Chaque modification est automatiquement sauvegardée sur GitHub. 
                Utilisez "Backup GitHub" pour forcer un backup manuel avant une grosse modification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
