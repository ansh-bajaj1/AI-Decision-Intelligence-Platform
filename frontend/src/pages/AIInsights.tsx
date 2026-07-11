import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import api from '../services/api';
import { InsightsSkeleton } from '../components/LoadingSkeletons';

interface AIInsightCard {
  title: string;
  metric: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  recommendation: string;
}

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsightCard[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/insights');
      setInsights(res.data.insights);
      setSummary(res.data.summary);
      setHasGenerated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get card type color theme
  const getTypeClasses = (type: string) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-l-4 border-l-green-500',
          bg: 'bg-green-500/5 dark:bg-green-500/[0.02]',
          badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
          icon: <CheckCircle size={17} className="text-green-500" />
        };
      case 'warning':
        return {
          border: 'border-l-4 border-l-amber-500',
          bg: 'bg-amber-500/5 dark:bg-amber-500/[0.02]',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
          icon: <AlertTriangle size={17} className="text-amber-500" />
        };
      case 'danger':
        return {
          border: 'border-l-4 border-l-red-500',
          bg: 'bg-red-500/5 dark:bg-red-500/[0.02]',
          badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
          icon: <TrendingDown size={17} className="text-red-500" />
        };
      case 'info':
      default:
        return {
          border: 'border-l-4 border-l-brand-500',
          bg: 'bg-brand-500/5 dark:bg-brand-500/[0.02]',
          badge: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
          icon: <Lightbulb size={17} className="text-brand-500" />
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Business Insights</h1>
          <p className="text-sm text-slate-400 mt-1">Strategic recommendations generated using LLM reasoning over company sales indicators.</p>
        </div>
        
        {!loading && (
          <button
            onClick={generateInsights}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all duration-300 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles size={17} />
            <span>{hasGenerated ? 'Re-Generate Insights' : 'Generate Insights'}</span>
          </button>
        )}
      </div>

      {/* DYNAMIC VIEWS */}
      {loading ? (
        <InsightsSkeleton />
      ) : !hasGenerated ? (
        /* INITIAL BLANK STATE */
        <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-12 text-center max-w-2xl mx-auto mt-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Sparkles size={30} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Generate Decision Intelligence</h2>
          <p className="text-slate-400 text-sm mt-2.5 max-w-md mx-auto leading-relaxed">
            Click the button below to feed real-time transactions, regional margin statistics, and category performance data to our AI model. You will receive structured, actionable recommendations.
          </p>
          <button
            onClick={generateInsights}
            className="px-6 py-3 mt-6 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-brand-500/25 cursor-pointer hover:shadow-brand-500/35 transition-all inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>Generate Business Insights</span>
          </button>
        </div>
      ) : (
        /* GENERATED CONTENT */
        <div className="space-y-6">
          
          {/* EXECUTIVE BRIEF SUMMARY BANNER */}
          {summary && (
            <div className="bg-gradient-to-r from-brand-950 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-900/40 relative overflow-hidden shadow-lg">
              <div className="absolute top-[-10%] right-[-10%] w-[20%] h-[50%] rounded-full bg-brand-600/20 blur-[50px] pointer-events-none" />
              <div className="flex gap-4 items-start relative z-10">
                <div className="p-3 bg-white/10 rounded-xl shrink-0 mt-0.5">
                  <Sparkles size={20} className="text-brand-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-brand-300">AI Executive Brief</h3>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">{summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* INSIGHTS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {insights.map((card, idx) => {
              const themeStyle = getTypeClasses(card.type);
              return (
                <div 
                  key={idx}
                  className={`bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 md:p-6 rounded-2xl flex flex-col justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 ${themeStyle.border} ${themeStyle.bg}`}
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="font-bold text-base tracking-tight leading-tight">{card.title}</h4>
                      <div className={`p-1.5 rounded-lg ${themeStyle.badge}`}>
                        {themeStyle.icon}
                      </div>
                    </div>

                    {/* Metric */}
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      Indicator: <span className="text-slate-800 dark:text-slate-200">{card.metric}</span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Recommendation footer */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-850">
                    <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                      <span className="text-[10px] font-extrabold uppercase bg-brand-600/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded tracking-wider shrink-0 mt-0.5">
                        Recommendation
                      </span>
                      <p className="text-xs font-semibold leading-normal">
                        {card.recommendation}
                      </p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* ACTIVITY FOOTER */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> Insights refreshed based on current database state.
            </span>
            <button 
              onClick={generateInsights}
              className="hover:underline flex items-center gap-1 font-bold text-brand-600"
            >
              Sync Data <ArrowRight size={12} />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
