import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Percent, 
  Filter, 
  Star, 
  Bookmark, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../services/api';
import { KPISkeleton, ChartSkeleton, TableSkeleton } from '../components/LoadingSkeletons';

// Custom colors for charts
const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

interface KPICardData {
  value: number;
  change_pct: number;
  label: string;
}

interface DashboardKPIs {
  total_sales: KPICardData;
  total_profit: KPICardData;
  orders_count: KPICardData;
  average_order_value: KPICardData;
}

interface MonthlySalesPoint {
  month: string;
  sales: number;
  profit: number;
  anomaly_count: number;
}

interface RegionalSalesPoint {
  region: string;
  sales: number;
  profit: number;
}

interface CategoryDistributionPoint {
  category: string;
  sales: number;
  profit: number;
  percentage: number;
}

interface ProfitMarginPoint {
  category: string;
  margin: number;
}

interface TopProductPoint {
  product: string;
  sales: number;
  profit: number;
  quantity: number;
}

interface TopCustomerPoint {
  customer: string;
  sales: number;
  profit: number;
}

interface DashboardCharts {
  monthly_sales: MonthlySalesPoint[];
  regional_sales: RegionalSalesPoint[];
  category_distribution: CategoryDistributionPoint[];
  profit_margins: ProfitMarginPoint[];
  top_products: TopProductPoint[];
  top_customers: TopCustomerPoint[];
}

interface OrderRecord {
  id: number;
  order_id: string;
  date: string;
  region: string;
  city: string;
  product: string;
  category: string;
  quantity: number;
  price: number;
  discount: number;
  sales: number;
  profit: number;
  customer_segment: string;
  sales_rep: string;
  is_anomaly: boolean;
}

export const Dashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const searchOrderHighlight = searchParams.get('search');

  // Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1); // 1 year ago by default
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [region, setRegion] = useState('All');
  const [category, setCategory] = useState('All');
  const [salesRep, setSalesRep] = useState('All');

  // Filter options list
  const [filterOptions, setFilterOptions] = useState<{
    regions: string[];
    categories: string[];
    sales_reps: string[];
  }>({ regions: ['All'], categories: ['All'], sales_reps: ['All'] });

  // Data State
  const [kpis, setKPIs] = useState<DashboardKPIs | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedFilters, setSavedFilters] = useState<{ name: string; filters: any }[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  // Fetch filter dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/dashboard/filter-options');
        setFilterOptions(res.data);
      } catch (err) {
        console.error('Error fetching filter options', err);
      }
    };
    fetchOptions();
    
    // Load saved filters from localStorage
    const saved = localStorage.getItem('insightiq_saved_filters');
    if (saved) setSavedFilters(JSON.parse(saved));
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const query = `start_date=${startDate}&end_date=${endDate}&region=${region}&category=${category}&sales_rep=${salesRep}`;
      
      const [kpiRes, chartRes, orderRes] = await Promise.all([
        api.get(`/dashboard/kpis?${query}`),
        api.get(`/dashboard/charts?${query}`),
        api.get(`/dashboard/recent-orders?${query}&limit=12`)
      ]);

      setKPIs(kpiRes.data);
      setCharts(chartRes.data);
      setRecentOrders(orderRes.data);
    } catch (err) {
      console.error('Error fetching dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, region, category, salesRep]);

  // Handle highlighted search order
  useEffect(() => {
    if (searchOrderHighlight) {
      const focusOnOrder = async () => {
        try {
          const res = await api.get(`/orders/${searchOrderHighlight}`);
          // Add the searched order to the top of recent orders
          setRecentOrders(prev => {
            const exists = prev.some(o => o.order_id === res.data.order_id);
            if (exists) return prev;
            return [res.data, ...prev];
          });
        } catch (err) {
          console.error('Error fetching searched order detail', err);
        }
      };
      focusOnOrder();
    }
  }, [searchOrderHighlight]);

  // Check if dashboard is favorited
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const res = await api.get('/auth/favorites');
        const fav = res.data.find((f: any) => f.dashboard_name === 'Main Dashboard');
        if (fav) {
          setIsFavorited(true);
          setFavoriteId(fav.id);
        } else {
          setIsFavorited(false);
          setFavoriteId(null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkFavorite();
  }, []);

  const handleFavoriteToggle = async () => {
    try {
      if (isFavorited && favoriteId) {
        await api.delete(`/auth/favorites/${favoriteId}`);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        const res = await api.post('/auth/favorites', { dashboard_name: 'Main Dashboard' });
        setIsFavorited(true);
        setFavoriteId(res.data.id);
      }
    } catch (err) {
      console.error('Error toggling favorite', err);
    }
  };

  const handleSaveFilter = () => {
    const filterName = prompt('Enter a name to save these filters:');
    if (!filterName) return;

    const newFilter = {
      name: filterName,
      filters: { startDate, endDate, region, category, salesRep }
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('insightiq_saved_filters', JSON.stringify(updated));
  };

  const applySavedFilter = (f: any) => {
    setStartDate(f.startDate);
    setEndDate(f.endDate);
    setRegion(f.region);
    setCategory(f.category);
    setSalesRep(f.salesRep);
  };

  const handleResetFilters = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setRegion('All');
    setCategory('All');
    setSalesRep('All');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const renderKPICard = (kpi: KPICardData, icon: React.ReactNode, prefix = '') => {
    const isPositive = kpi.change_pct >= 0;
    return (
      <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between hover:shadow-lg dark:hover:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform duration-300 -z-0" />
        <div className="flex justify-between items-start relative z-10">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{kpi.label}</span>
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between relative z-10">
          <h3 className="text-2xl font-bold tracking-tight">
            {prefix}{kpi.value.toLocaleString(undefined, { maximumFractionDigits: kpi.value % 1 === 0 ? 0 : 2 })}
          </h3>
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
          }`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}{kpi.change_pct}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time business performance metrics, anomaly logs, and AI decisions.</p>
        </div>
        
        {/* TOP BAR ACTIONS */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleFavoriteToggle}
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
              isFavorited 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Star size={15} fill={isFavorited ? 'currentColor' : 'none'} />
            <span>{isFavorited ? 'Favorited' : 'Favorite Dashboard'}</span>
          </button>

          <button 
            onClick={handleSaveFilter}
            className="p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <Bookmark size={15} />
            <span>Save Current Filters</span>
          </button>
        </div>
      </div>

      {/* SAVED FILTERS CHIPS */}
      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 uppercase mr-1">
            <Bookmark size={12} /> Saved:
          </span>
          {savedFilters.map((sf, idx) => (
            <button
              key={idx}
              onClick={() => applySavedFilter(sf.filters)}
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2.5 py-1 rounded-xl font-medium hover:border-brand-500 transition-colors"
            >
              {sf.name}
            </button>
          ))}
          <button
            onClick={() => {
              localStorage.removeItem('insightiq_saved_filters');
              setSavedFilters([]);
            }}
            className="text-[10px] text-red-500 hover:underline font-semibold ml-auto"
          >
            Clear All
          </button>
        </div>
      )}

      {/* FILTERS CONTROL PANEL */}
      <div className="p-4 md:p-5 bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-brand-500" />
            <span className="font-bold text-sm">Dashboard Filters</span>
          </div>
          <button 
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-brand-600 flex items-center gap-1.5 font-medium transition-colors"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
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

      {/* DYNAMIC VIEW LOADER */}
      {loading ? (
        <>
          <KPISkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2"><ChartSkeleton /></div>
            <div><ChartSkeleton /></div>
          </div>
          <TableSkeleton />
        </>
      ) : (
        <>
          {/* KPI CARDS GRID */}
          {kpis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderKPICard(kpis.total_sales, <DollarSign size={20} />, '$')}
              {renderKPICard(kpis.total_profit, <Percent size={20} />, '$')}
              {renderKPICard(kpis.orders_count, <ShoppingBag size={20} />)}
              {renderKPICard(kpis.average_order_value, <Users size={20} />, '$')}
            </div>
          )}

          {/* CHARTS CONTAINER SECTION */}
          {charts && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Monthly Sales Area Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="font-bold text-base">Monthly Revenue Trend</h2>
                    <span className="text-xs text-slate-400">Aggregated monthly sales volume vs profit</span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.monthly_sales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" name="Sales" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                      <Area type="monotone" name="Profit" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Regional Sales Bar Chart */}
              <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
                <div className="mb-4">
                  <h2 className="font-bold text-base">Revenue by Region</h2>
                  <span className="text-xs text-slate-400">Total sales contribution per region</span>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.regional_sales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="region" tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar name="Sales" dataKey="sales" fill="#6366f1" radius={[8, 8, 0, 0]}>
                        {charts.regional_sales.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Pie Chart */}
              <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
                <div className="mb-4">
                  <h2 className="font-bold text-base">Category Distribution</h2>
                  <span className="text-xs text-slate-400">Sales share by product category</span>
                </div>
                <div className="h-[280px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.category_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="sales"
                        nameKey="category"
                      >
                        {charts.category_distribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Profit Margin Trend line chart */}
              <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
                <div className="mb-4">
                  <h2 className="font-bold text-base">Category Margin Efficiency</h2>
                  <span className="text-xs text-slate-400">Net Profit Margin % per category</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.profit_margins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="category" tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} tick={{ fontSize: 11 }} label={{ value: 'Margin (%)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Margin']} />
                      <Bar dataKey="margin" fill="#10b981" radius={[8, 8, 0, 0]}>
                        {charts.profit_margins.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Products Horizontal Bars */}
              <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
                <div className="mb-4">
                  <h2 className="font-bold text-base">Top Performing Products</h2>
                  <span className="text-xs text-slate-400">Products with highest revenue generation</span>
                </div>
                <div className="space-y-4">
                  {charts.top_products.map((p, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate max-w-[220px]">{p.product}</span>
                        <span>{formatCurrency(p.sales)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-500 h-full rounded-full" 
                          style={{ width: `${(p.sales / charts.top_products[0].sales) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{p.quantity} units sold • Profit: {formatCurrency(p.profit)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* RECENT ORDERS TABLE */}
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-base">Recent Transactions & Outlier Log</h2>
                <span className="text-xs text-slate-400">Order audit entries flagged with dynamic isolation forest</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Region</th>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Sales Representative</th>
                    <th className="p-4 text-right">Discount</th>
                    <th className="p-4 text-right">Sales</th>
                    <th className="p-4 text-right">Profit</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentOrders.map((o) => {
                    const isSearchMatch = searchOrderHighlight && o.order_id === searchOrderHighlight;
                    return (
                      <tr 
                        key={o.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors ${
                          isSearchMatch 
                            ? 'bg-amber-500/10 dark:bg-amber-500/5 border-l-4 border-l-amber-500 font-semibold' 
                            : o.is_anomaly 
                              ? 'bg-red-500/5 dark:bg-red-500/[0.02] border-l-4 border-l-red-500' 
                              : ''
                        }`}
                      >
                        <td className="p-4 font-semibold text-brand-600 dark:text-brand-400">{o.order_id}</td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">{o.date}</td>
                        <td className="p-4 text-slate-500">{o.region}</td>
                        <td className="p-4 font-medium truncate max-w-[200px]" title={o.product}>{o.product}</td>
                        <td className="p-4 text-slate-500">{o.sales_rep}</td>
                        <td className="p-4 text-right text-slate-500">{Math.round(o.discount * 100)}%</td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(o.sales)}</td>
                        <td className={`p-4 text-right font-semibold ${o.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {o.profit >= 0 ? '+' : ''}{formatCurrency(o.profit)}
                        </td>
                        <td className="p-4 text-center">
                          {o.is_anomaly ? (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full pulse-red">
                              <AlertTriangle size={11} /> Outlier
                            </span>
                          ) : (
                            <span className="inline-flex bg-green-500/10 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
