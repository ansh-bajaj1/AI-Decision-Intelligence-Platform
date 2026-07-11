import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Shield, 
  Calendar, 
  History, 
  Star, 
  BarChart,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  created_at: string;
}

interface FavoriteDashboard {
  id: string;
  dashboard_name: string;
  created_at: string;
}

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [favorites, setFavorites] = useState<FavoriteDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [logRes, favRes] = await Promise.all([
        api.get('/auth/activity-logs'),
        api.get('/auth/favorites')
      ]);
      setLogs(logRes.data);
      setFavorites(favRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleRemoveFavorite = async (id: string) => {
    if (!confirm('Remove this dashboard from your favorites?')) return;
    try {
      await api.delete(`/auth/favorites/${id}`);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to format date
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Format action text for styling
  const getActionBadge = (action: string) => {
    const base = "inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ";
    switch (action) {
      case 'USER_LOGIN':
        return <span className={base + "bg-green-500/10 text-green-600"}>Login</span>;
      case 'USER_REGISTER':
        return <span className={base + "bg-blue-500/10 text-blue-600"}>Register</span>;
      case 'GENERATE_FORECAST':
        return <span className={base + "bg-purple-500/10 text-purple-600"}>Forecast</span>;
      case 'GENERATE_INSIGHTS':
        return <span className={base + "bg-pink-500/10 text-pink-600"}>AI Insights</span>;
      case 'AI_CHAT':
        return <span className={base + "bg-indigo-500/10 text-brand-600"}>AI Chat</span>;
      case 'EXPORT_PDF':
      case 'EXPORT_EXCEL':
      case 'EXPORT_CSV':
        return <span className={base + "bg-amber-500/10 text-amber-600"}>Export</span>;
      case 'ADD_FAVORITE':
      case 'REMOVE_FAVORITE':
        return <span className={base + "bg-yellow-500/10 text-yellow-600"}>Favorite</span>;
      default:
        return <span className={base + "bg-slate-100 text-slate-500"}>{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">User Account</h1>
        <p className="text-sm text-slate-400 mt-1">Manage credentials, view favorite dashboards, and audit security log activities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: PROFILE CARD & STATS */}
        <div className="space-y-6">
          
          {/* PROFILE CARD */}
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 md:p-6 rounded-2xl shadow-sm text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg uppercase mb-4">
              {user?.username.substring(0, 2)}
            </div>
            
            <h2 className="text-lg font-bold tracking-tight">{user?.username}</h2>
            <span className="text-xs text-slate-400 font-semibold">{user?.role}</span>
            
            <div className="mt-6 border-t border-slate-100 dark:border-slate-850 pt-5 text-left space-y-4">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Mail size={16} className="text-slate-400" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Shield size={16} className="text-slate-400" />
                <span>Access Level: {user?.role}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Calendar size={16} className="text-slate-400" />
                <span>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* FAVORITE DASHBOARDS LIST */}
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-850">
              <Star size={16} className="text-amber-500" />
              <span className="font-bold text-sm">Favorite Dashboards</span>
            </div>
            
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
            ) : favorites.length > 0 ? (
              <div className="space-y-2">
                {favorites.map((fav) => (
                  <div key={fav.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <BarChart size={15} className="text-brand-500" />
                      <span className="text-xs font-semibold truncate">{fav.dashboard_name}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No dashboards favorited yet</p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVITY LOGS */}
        <div className="lg:col-span-2">
          
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <History size={17} className="text-brand-500" />
              <div>
                <h2 className="font-bold text-base">Account Security & Audit Log</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Chronological record of recent logins, report generation, and AI evaluations.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-4">Action</th>
                    <th className="p-4">Log Details</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {loading ? (
                    [1, 2, 3].map(i => (
                      <tr key={i}>
                        <td className="p-4"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></td>
                        <td className="p-4"><div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></td>
                        <td className="p-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></td>
                      </tr>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        <td className="p-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                        <td className="p-4 font-medium text-slate-650 dark:text-slate-350">{log.details}</td>
                        <td className="p-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-slate-400">No activity logs recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
