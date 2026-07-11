import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setEmail('');
    setPassword('');
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white relative overflow-hidden font-sans">
      
      {/* Dynamic background lights */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      
      <div className="w-full max-w-md p-6 relative z-10">
        
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-500 items-center justify-center shadow-lg shadow-brand-500/20 text-white font-extrabold text-2xl mb-3">
            IQ
          </div>
          <h1 className="text-2xl font-bold tracking-tight">InsightIQ</h1>
          <p className="text-sm text-slate-400 mt-1">AI Decision Intelligence Platform</p>
        </div>

        {/* Card */}
        <motion.div 
          layout
          className="bg-slate-950/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex border-b border-slate-800 pb-4 mb-6">
            <button 
              onClick={() => { if (!isLogin) toggleMode(); }}
              className={`flex-1 text-center font-semibold text-sm pb-2 transition-colors duration-200 relative ${isLogin ? 'text-white' : 'text-slate-500'}`}
            >
              Sign In
              {isLogin && <motion.div layoutId="auth-active-tab" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-brand-500" />}
            </button>
            <button 
              onClick={() => { if (isLogin) toggleMode(); }}
              className={`flex-1 text-center font-semibold text-sm pb-2 transition-colors duration-200 relative ${!isLogin ? 'text-white' : 'text-slate-500'}`}
            >
              Register
              {!isLogin && <motion.div layoutId="auth-active-tab" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-brand-500" />}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl font-semibold text-sm shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-5 text-center text-xs text-slate-500">
              <p>Demo Account: <span className="text-brand-400 font-semibold">admin</span> / Password: <span className="text-brand-400 font-semibold">password123</span></p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
