import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Package, 
  Map, 
  Filter,
  Users
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import api from '../services/api';
import { ChartSkeleton, TableSkeleton } from '../components/LoadingSkeletons';

interface MonthlyGrowthPoint {
  month: string;
  sales: number;
  profit: number;
  sales_growth: number;
  profit_growth: number;
}

interface QuarterlyGrowthPoint {
  quarter: string;
  sales: number;
  profit: number;
  sales_growth: number;
}

interface DailyTrendPoint {
  date: string;
  sales: number;
  profit: number;
  moving_avg_7: number;
  moving_avg_30: number;
}

interface ProductPerformance {
  product: string;
  category: string;
  sales: number;
  profit: number;
  quantity: number;
  margin: number;
}

interface SegmentPerformance {
  segment: string;
  sales: number;
  profit: number;
  discount: number;
  margin: number;
}

interface RegionPerformance {
  region: string;
  sales: number;
  profit: number;
  discount: number;
  margin: number;
}

export const Analytics: React.FC = () => {
  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [region, setRegion] = useState('All');
  const [category, setCategory] = useState('All');
  const [salesRep, setSalesRep] = useState('All');
  
  // Options state
  const [filterOptions, setFilterOptions] = useState<{
    regions: string[];
    categories: string[];
    sales_reps: string[];
  }>({ regions: ['All'], categories: ['All'], sales_reps: ['All'] });

  // Data states
  const [trends, setTrends] = useState<{
    daily_trends: DailyTrendPoint[];
    monthly_growth: MonthlyGrowthPoint[];
    quarterly_growth: QuarterlyGrowthPoint[];
  } | null>(null);

  const [products, setProducts] = useState<{
    top_performing: ProductPerformance[];
    worst_performing: ProductPerformance[];
  } | null>(null);

  const [segments, setSegments] = useState<{
    segments: SegmentPerformance[];
    regions: RegionPerformance[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeProductTab, setActiveProductTab] = useState<'top' | 'worst'>('top');

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

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const query = `start_date=${startDate}&end_date=${endDate}&region=${region}&category=${category}&sales_rep=${salesRep}`;
      
      const [trendRes, prodRes, segRes] = await Promise.all([
        api.get(`/analytics/trends?${query}`),
        api.get(`/analytics/products?${query}`),
        api.get(`/analytics/segments?${query}`)
      ]);

      setTrends(trendRes.data);
      setProducts(prodRes.data);
      setSegments(segRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [startDate, endDate, region, category, salesRep]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Advanced Business Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Deep-dive analysis of growth rates, rolling averages, product catalogs, and segment margins.</p>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="p-4 md:p-5 bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-850">
          <Filter size={16} className="text-brand-500" />
          <span className="font-bold text-sm">Analytics Filter View</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

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

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton /><ChartSkeleton />
          <TableSkeleton /><TableSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SALES TRENDS & ROLLING AVERAGES */}
          {trends && (
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-brand-500" />
                    Sales Trend & Moving Averages
                  </h2>
                  <span className="text-xs text-slate-400">Daily sales sum mapped against 7-day and 30-day rolling averages</span>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends.daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" name="Daily Sales" dataKey="sales" fill="#818cf8" stroke="none" fillOpacity={0.15} />
                    <Line type="monotone" name="7-Day Rolling Avg" dataKey="moving_avg_7" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" name="30-Day Rolling Avg" dataKey="moving_avg_30" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* MONTH-OVER-MONTH GROWTH RATE */}
          {trends && (
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <BarChart3 size={18} className="text-purple-500" />
                  Month-over-Month (MoM) Growth Comparison
                </h2>
                <span className="text-xs text-slate-400">Monthly percentage growth for Sales vs Profit</span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends.monthly_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} tick={{ fontSize: 10 }} label={{ value: 'Growth (%)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Growth']} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar name="Sales Growth" dataKey="sales_growth" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar name="Profit Growth" dataKey="profit_growth" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* QUARTER-OVER-QUARTER SALES */}
          {trends && (
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Layers size={18} className="text-pink-500" />
                  Quarterly Performance Summary
                </h2>
                <span className="text-xs text-slate-400">Absolute quarterly revenues with QoQ change rate overlay</span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends.quarterly_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="quarter" tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any, name: string) => name === 'QoQ Growth' ? [`${value.toFixed(1)}%`, name] : [formatCurrency(value), name]} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar yAxisId="left" name="Quarterly Sales" dataKey="sales" fill="#a855f7" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" name="QoQ Growth" dataKey="sales_growth" stroke="#f59e0b" strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* PRODUCT PERFORMANCE CATALOG TABLE */}
          {products && (
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Package size={18} className="text-brand-500" />
                    Product Catalog Breakdown
                  </h2>
                  <span className="text-xs text-slate-400">Comparing highest sales vs lowest profits</span>
                </div>
                
                {/* Tabs toggle */}
                <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex">
                  <button 
                    onClick={() => setActiveProductTab('top')}
                    className={`text-xs px-3 py-1.5 rounded-md font-bold cursor-pointer transition-colors ${
                      activeProductTab === 'top' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-500'
                    }`}
                  >
                    Top Performers
                  </button>
                  <button 
                    onClick={() => setActiveProductTab('worst')}
                    className={`text-xs px-3 py-1.5 rounded-md font-bold cursor-pointer transition-colors ${
                      activeProductTab === 'worst' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-500'
                    }`}
                  >
                    Underperformers
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Units Sold</th>
                      <th className="p-3 text-right">Sales</th>
                      <th className="p-3 text-right">Profit</th>
                      <th className="p-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {(activeProductTab === 'top' ? products.top_performing : products.worst_performing).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-medium truncate max-w-[160px]">{p.product}</td>
                        <td className="p-3 text-slate-500 text-xs">{p.category}</td>
                        <td className="p-3 text-right text-slate-500">{p.quantity}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(p.sales)}</td>
                        <td className={`p-3 text-right font-semibold ${p.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {p.profit >= 0 ? '+' : ''}{formatCurrency(p.profit)}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            p.margin >= 30 
                              ? 'bg-green-500/10 text-green-600' 
                              : p.margin >= 10 
                                ? 'bg-indigo-500/10 text-brand-600' 
                                : 'bg-red-500/10 text-red-500'
                          }`}>
                            {p.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CUSTOMER SEGMENTATION METRICS */}
          {segments && (
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Users size={18} className="text-brand-500" />
                  Customer Segment Contribution
                </h2>
                <span className="text-xs text-slate-400">Profit contribution vs average discounts offered</span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segments.segments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="segment" tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any, name: string) => name === 'Avg Discount' ? [`${value}%`, name] : [formatCurrency(value), name]} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar yAxisId="left" name="Segment Profit" dataKey="profit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" name="Avg Discount" dataKey="discount" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* REGIONAL PERFORMANCE SUMMARY TABLE */}
          {segments && (
            <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm lg:col-span-2">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Map size={18} className="text-brand-500" />
                  Regional Profitability Comparative Analysis
                </h2>
                <span className="text-xs text-slate-400">Deep-dive margin comparison across all geographical territories</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-4">Geographic Region</th>
                      <th className="p-4 text-right">Gross Sales</th>
                      <th className="p-4 text-right">Net Profit</th>
                      <th className="p-4 text-right">Avg Discount</th>
                      <th className="p-4 text-right">Profit Margin</th>
                      <th className="p-4">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {segments.regions.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{reg.region}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(reg.sales)}</td>
                        <td className={`p-4 text-right font-medium ${reg.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(reg.profit)}
                        </td>
                        <td className="p-4 text-right text-slate-500">{reg.discount}%</td>
                        <td className="p-4 text-right font-bold text-brand-600 dark:text-brand-400">{reg.margin}%</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            reg.margin >= 20 
                              ? 'bg-green-500/10 text-green-600' 
                              : reg.margin >= 10 
                                ? 'bg-yellow-500/10 text-yellow-600' 
                                : 'bg-red-500/10 text-red-500'
                          }`}>
                            {reg.margin >= 20 ? 'Highly Profitable' : reg.margin >= 10 ? 'Healthy' : 'Auditing Needed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
