import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  User as UserIcon, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

interface SearchResult {
  id: number;
  order_id: string;
  product: string;
  customer_segment: string;
  region: string;
  sales: number;
  profit: number;
  is_anomaly: boolean;
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Simulated notifications
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Prophet Model trained successfully with Q3 parameters', type: 'info', time: '10m ago' },
    { id: 2, text: 'Anomaly detected: order IQ-2026-15024 discount exceeding 80%', type: 'anomaly', time: '1h ago' },
    { id: 3, text: 'PDF performance report ready for download', type: 'success', time: '2h ago' }
  ]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Forecasting', path: '/forecasting', icon: TrendingUp },
    { label: 'AI Insights', path: '/insights', icon: Sparkles },
    { label: 'AI Chat', path: '/chat', icon: MessageSquare },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Profile', path: '/profile', icon: UserIcon },
    { label: 'Activity Logs', path: '/logs', icon: History }
  ];

  // Perform search queries
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
          setSearchResults(res.data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click outside search dismiss
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (orderId: string) => {
    setShowSearchOverlay(false);
    setSearchQuery('');
    navigate(`/?search=${orderId}`);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#080b11] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* MOBILE SIDEBAR DRAWERS */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div 
            onClick={() => setSidebarOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR SIDEBAR */}
      <motion.aside 
        initial={{ x: 0 }}
        animate={{ width: sidebarOpen ? '260px' : '72px' }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className={`fixed md:sticky top-0 left-0 h-screen z-50 flex flex-col bg-white dark:bg-[#0e1420] border-r border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xl shadow-slate-100/50 dark:shadow-none`}
      >
        {/* LOGO AREA */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold text-lg shrink-0">
              IQ
            </div>
            {sidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg bg-gradient-to-r from-brand-600 to-violet-500 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent font-sans"
              >
                InsightIQ
              </motion.span>
            )}
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {sidebarOpen ? <X size={18} className="md:hidden" /> : <Menu size={18} />}
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon size={19} className={`shrink-0 ${isActive ? '' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
                {sidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
                {/* Active Indicator Tooltip when collapsed */}
                {!sidebarOpen && (
                  <div className="absolute left-16 scale-0 group-hover:scale-100 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-md z-50 pointer-events-none transition-transform origin-left whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* PROFILE BLOCK & LOGOUT */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-md shadow-brand-500/10">
                  {user?.username.substring(0, 2)}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-semibold truncate leading-tight">{user?.username}</h4>
                  <span className="text-xs text-slate-400 truncate block leading-tight">{user?.role}</span>
                </div>
              </div>
              <button 
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={logout}
              className="w-full flex justify-center py-3 rounded-xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Logout"
            >
              <LogOut size={19} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER BAR */}
        <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#0e1420] sticky top-0 z-30">
          
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 md:flex hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 md:hidden flex rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <Menu size={20} />
            </button>

            {/* GLOBAL SEARCH */}
            <div ref={searchRef} className="relative w-full">
              <div className="relative">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Global search by product, region, rep..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchOverlay(true);
                  }}
                  onFocus={() => setShowSearchOverlay(true)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>

              {/* SEARCH DROPDOWN OVERLAY */}
              <AnimatePresence>
                {showSearchOverlay && searchQuery.trim().length > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-12 left-0 right-0 max-h-[380px] overflow-y-auto bg-white dark:bg-[#0e1420] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2 z-50"
                  >
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-slate-400">Searching records...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {searchResults.map((order) => (
                          <div 
                            key={order.id}
                            onClick={() => handleSearchResultClick(order.order_id)}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer rounded-xl flex items-center justify-between gap-3"
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-brand-600 dark:text-brand-400">{order.order_id}</span>
                                {order.is_anomaly && (
                                  <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <AlertTriangle size={10} /> Outlier
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{order.product}</p>
                              <span className="text-[11px] text-slate-400">{order.region} • {order.customer_segment}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-semibold block">${order.sales.toLocaleString()}</span>
                              <span className={`text-[11px] font-medium ${order.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {order.profit >= 0 ? '+' : ''}${order.profit.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400">No matching sales records found</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ACTIONS (NOTIFICATIONS, THEME TOGGLER, USER CARD) */}
          <div className="flex items-center gap-2 md:gap-3.5">
            
            {/* THEME TOGGLER */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>

            {/* NOTIFICATIONS DRAWER */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell size={19} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0e1420]" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-[320px] bg-white dark:bg-[#0e1420] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-40"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-sm">Notifications</span>
                        <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold">{notifications.length} Unread</span>
                      </div>
                      
                      {notifications.length > 0 ? (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
                          {notifications.map(n => (
                            <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2 relative group/item">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'anomaly' ? 'bg-red-500' : n.type === 'success' ? 'bg-green-500' : 'bg-brand-500'}`} />
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs text-slate-600 dark:text-slate-200 leading-normal">{n.text}</p>
                                <span className="text-[10px] text-slate-400 block mt-1">{n.time}</span>
                              </div>
                              <button 
                                onClick={() => removeNotification(n.id)}
                                className="absolute right-2 top-2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover/item:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm text-slate-400">All caught up! No notifications</div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* QUICK USER DISPLAY */}
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow">
                {user?.username.substring(0, 2)}
              </div>
              <span className="text-xs font-semibold hidden md:inline">{user?.username}</span>
            </div>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
