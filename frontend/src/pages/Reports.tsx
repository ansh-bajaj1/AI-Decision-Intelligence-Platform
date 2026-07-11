import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Download, 
  Filter, 
  Info,
  Sparkles
} from 'lucide-react';
import api from '../services/api';

export const Reports: React.FC = () => {
  // Filter states
  const [region, setRegion] = useState('All');
  const [category, setCategory] = useState('All');
  const [salesRep, setSalesRep] = useState('All');

  // Filter options list
  const [filterOptions, setFilterOptions] = useState<{
    regions: string[];
    categories: string[];
    sales_reps: string[];
  }>({ regions: ['All'], categories: ['All'], sales_reps: ['All'] });

  const [downloading, setDownloading] = useState<'pdf' | 'excel' | 'csv' | null>(null);

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

  const handleDownload = async (format: 'pdf' | 'excel' | 'csv') => {
    setDownloading(format);
    try {
      const queryParams = new URLSearchParams({
        ...(region !== 'All' && { region }),
        ...(category !== 'All' && { category }),
        ...(salesRep !== 'All' && { sales_rep: salesRep })
      });
      
      const res = await api.get(`/reports/${format}?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link in browser
      const mimeType = format === 'pdf' 
        ? 'application/pdf' 
        : format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'text/csv';
          
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'excel' ? 'xlsx' : format;
      link.setAttribute('download', `insightiq_report_${new Date().toISOString().split('T')[0]}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error downloading ${format} report:`, err);
      alert('Failed to generate report file. Please verify database and server status.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Report Generator</h1>
        <p className="text-sm text-slate-400 mt-1">Export transaction databases, executive briefings, and forecasting timelines in industry formats.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FILTERS PANEL */}
        <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm self-start space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-850">
            <Filter size={16} className="text-brand-500" />
            <span className="font-bold text-sm">Scope Report Data</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase">Geographic Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {filterOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase">Sales Representative</label>
              <select
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-250 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {filterOptions.sales_reps.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-150/40 dark:border-slate-800/40 rounded-xl flex gap-2">
              <Info size={16} className="text-brand-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-normal">
                Applying scopes filters the raw records included in CSV/Excel sheets and updates the KPI and Forecast calculations printed on the PDF brief.
              </p>
            </div>
          </div>
        </div>

        {/* REPORTS DOWNLOAD CATALOG */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* PDF CARD */}
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0">
                <FileText size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm md:text-base">PDF Executive Briefing</h3>
                <p className="text-xs text-slate-400 max-w-md">Highly styled PDF formatted with company branding, KPI grids, Prophet forecasting summaries, and AI strategic recommendations.</p>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded">PDF v1.4</span>
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded">Ready to Print</span>
                  <span className="text-[9px] font-bold bg-indigo-500/10 text-brand-600 px-2 py-0.5 rounded flex items-center gap-0.5"><Sparkles size={8} /> AI Summary Included</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null}
              className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              {downloading === 'pdf' ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>

          {/* EXCEL CARD */}
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl shrink-0">
                <FileSpreadsheet size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm md:text-base">Excel Raw Worksheet</h3>
                <p className="text-xs text-slate-400 max-w-md">Comprehensive multi-sheet spreadsheet. Sheet 1 displays styled summaries and AI recommendation tables; Sheet 2 prints the filtered transaction items.</p>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded">Office OpenXML</span>
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded">Grid Lines Enabled</span>
                  <span className="text-[9px] font-bold bg-green-500/10 text-green-600 px-2 py-0.5 rounded">Styled Summaries</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleDownload('excel')}
              disabled={downloading !== null}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              {downloading === 'excel' ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download Excel</span>
                </>
              )}
            </button>
          </div>

          {/* CSV CARD */}
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-500/10 text-slate-500 dark:text-slate-450 rounded-2xl shrink-0">
                <FileCode size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm md:text-base">CSV Database Export</h3>
                <p className="text-xs text-slate-400 max-w-md">Comma-separated values text export. Optimized for quick database migrations, programming analytics scripts, or uploading to BI platforms.</p>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded">Comma Delimited</span>
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded">UTF-8 Encoded</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleDownload('csv')}
              disabled={downloading !== null}
              className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              {downloading === 'csv' ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
