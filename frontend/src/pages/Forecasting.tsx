import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { ChartSkeleton } from '../components/LoadingSkeletons';

interface ForecastPoint {
  date: string;
  historical: number | null;
  forecast: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  is_forecast: boolean;
}

interface ForecastSummary {
  horizon_days: number;
  projected_sales: number;
  projected_profit: number;
  average_daily_sales: number;
  growth_trend_direction: string;
  confidence_level: number;
}

export const Forecasting: React.FC = () => {
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  
  // Filters state
  const [region, setRegion] = useState('All');
  const [category, setCategory] = useState('All');
  const [salesRep, setSalesRep] = useState('All');

  // Filter options list
  const [filterOptions, setFilterOptions] = useState<{
    regions: string[];
    categories: string[];
    sales_reps: string[];
  }>({ regions: ['All'], categories: ['All'], sales_reps: ['All'] });

  // Data states
  const [points, setPoints] = useState<ForecastPoint[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/dashboard/filter-options');
        setFilterOptions(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOptions();
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        horizon: horizon.toString(),
        ...(region !== 'All' && { region }),
        ...(category !== 'All' && { category }),
        ...(salesRep !== 'All' && { sales_rep: salesRep })
      });
      
      const res = await api.get(`/forecast?${queryParams.toString()}`);
      setPoints(res.data.points);
      setSummary(res.data.summary);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [horizon, region, category, salesRep]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Sales Forecasting</h1>
        <p className="text-sm text-slate-400 mt-1">Machine Learning predictive modeling utilizing Meta Prophet seasonal analysis.</p>
      </div>

      {/* CONTROLS BAR (HORIZON + FILTERS) */}
      <div className="p-5 bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm space-y-4">
        
        {/* TOP LEVEL ACTION: HORIZON SELECTOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders size={17} className="text-brand-500" />
            <span className="font-bold text-sm">Forecast Horizon (Days)</span>
          </div>
          
          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl flex gap-1 self-start md:self-auto">
            {([30, 60, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setHorizon(days)}
                className={`text-xs px-4 py-2 rounded-lg font-bold cursor-pointer transition-all ${
                  horizon === days 
                    ? 'bg-brand-600 text-white shadow shadow-brand-500/10' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {days} Days Out
              </button>
            ))}
          </div>
        </div>

        {/* DIMENSIONAL FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {filterOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Sales Rep</label>
            <select
              value={salesRep}
              onChange={(e) => setSalesRep(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {filterOptions.sales_reps.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

      </div>

      {/* ERROR HANDLING PANEL */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm">
          <Info size={18} />
          <span>{errorMsg}</span>
          <button 
            onClick={fetchForecast} 
            className="ml-auto flex items-center gap-1 hover:underline text-xs font-bold"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* MAIN VIEW */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="h-[120px] bg-white dark:bg-[#0e1420] animate-pulse rounded-2xl" />
            <div className="h-[120px] bg-white dark:bg-[#0e1420] animate-pulse rounded-2xl" />
            <div className="h-[120px] bg-white dark:bg-[#0e1420] animate-pulse rounded-2xl" />
          </div>
          <ChartSkeleton height="h-[360px]" />
        </div>
      ) : (
        points.length > 0 && (
          <div className="space-y-6">
            
            {/* FORECAST SUMMARY CARDS */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Projected Total Sales */}
                <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Projected Revenue</span>
                  <div className="mt-3">
                    <h3 className="text-2xl font-bold tracking-tight text-brand-600 dark:text-brand-400">{formatCurrency(summary.projected_sales)}</h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">Cumulative forecast for {horizon} days</span>
                  </div>
                </div>

                {/* Projected Total Profit */}
                <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Projected Profit</span>
                  <div className="mt-3">
                    <h3 className="text-2xl font-bold tracking-tight text-green-500">{formatCurrency(summary.projected_profit)}</h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">Expected margin return of {(summary.projected_profit / summary.projected_sales * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Average Daily Revenue */}
                <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Projected Daily Average</span>
                  <div className="mt-3">
                    <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(summary.average_daily_sales)}</h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">Mean revenue per forecast day</span>
                  </div>
                </div>

                {/* Growth Trend Direction */}
                <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Trend Direction</span>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-wide leading-tight">{summary.growth_trend_direction}</h3>
                      <span className="text-[10px] text-slate-400 mt-1 block">Model confidence level: {summary.confidence_level * 100}%</span>
                    </div>
                    <div className={`p-2 rounded-xl ${
                      summary.growth_trend_direction === 'UPWARD' 
                        ? 'bg-green-500/10 text-green-600' 
                        : summary.growth_trend_direction === 'DOWNWARD' 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {summary.growth_trend_direction === 'UPWARD' ? <ArrowUpRight size={22} /> : 
                       summary.growth_trend_direction === 'DOWNWARD' ? <ArrowDownRight size={22} /> : <TrendingUp size={22} />}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* FORECAST COMPOSITE CHART */}
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 md:p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-brand-500" />
                    Predictive Forecasting & Confidence corridor
                  </h2>
                  <span className="text-xs text-slate-400">Historical daily values leading into {horizon}-day Prophet predicted boundary envelopes</span>
                </div>
              </div>

              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 9 }} minTickGap={25} />
                    <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any, name: string) => [formatCurrency(value), name]} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    
                    {/* Historical Series (Standard Line) */}
                    <Area 
                      type="monotone" 
                      name="Historical Sales" 
                      dataKey="historical" 
                      stroke="#4f46e5" 
                      strokeWidth={2} 
                      fill="none" 
                    />
                    
                    {/* Upper confidence bound */}
                    <Line 
                      type="monotone" 
                      name="Upper Bound (95%)" 
                      dataKey="upper_bound" 
                      stroke="#818cf8" 
                      strokeDasharray="3 3" 
                      dot={false} 
                    />
                    
                    {/* Lower confidence bound */}
                    <Line 
                      type="monotone" 
                      name="Lower Bound (95%)" 
                      dataKey="lower_bound" 
                      stroke="#818cf8" 
                      strokeDasharray="3 3" 
                      dot={false} 
                    />
                    
                    {/* Forecast Model predicted line (yhat) */}
                    <Line 
                      type="monotone" 
                      name="Forecast Line" 
                      dataKey="forecast" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4" 
                      dot={false} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MODEL SPECIFICATIONS FOOTER */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
              <Info className="text-brand-500 shrink-0 mt-0.5" size={17} />
              <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-300">Prophet Predictive Model Parameters</p>
                <p>The system evaluates seasonal adjustments by training a standard additive regression model. Weekly seasonality detects shopping pattern cycles (weekdays vs weekends), and yearly seasonality incorporates end-of-year holiday spikes. Anomaly data points identified via Isolation Forest are preserved during model training to account for pricing irregularities while maintaining prediction stability.</p>
              </div>
            </div>

          </div>
        )
      )}

    </div>
  );
};
