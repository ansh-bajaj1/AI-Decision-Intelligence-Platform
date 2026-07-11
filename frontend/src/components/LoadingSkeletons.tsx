import React from 'react';

export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
  );
};

export const KPISkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between h-[115px] relative overflow-hidden">
          <div className="flex justify-between items-start">
            <Shimmer className="w-24 h-4" />
            <Shimmer className="w-8 h-8 rounded-lg" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <Shimmer className="w-32 h-7" />
            <Shimmer className="w-12 h-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-[300px]' }) => {
  return (
    <div className={`bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between ${height} relative overflow-hidden`}>
      <div className="flex justify-between items-center mb-4">
        <Shimmer className="w-48 h-5" />
        <Shimmer className="w-24 h-4" />
      </div>
      <div className="flex-1 flex items-end gap-3 px-2 pb-2 pt-6">
        {[20, 60, 45, 80, 50, 95, 30, 70, 40, 85, 55, 75].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div 
              style={{ height: `${h}%` }} 
              className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-t-lg animate-pulse" 
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-850">
        <Shimmer className="w-16 h-3" />
        <Shimmer className="w-16 h-3" />
        <Shimmer className="w-16 h-3" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between">
        <Shimmer className="w-36 h-5" />
        <Shimmer className="w-16 h-4" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Shimmer className="w-10 h-10 rounded-xl" />
              <div className="space-y-2 flex-1 max-w-[200px]">
                <Shimmer className="w-full h-4" />
                <Shimmer className="w-2/3 h-3" />
              </div>
            </div>
            <Shimmer className="w-24 h-4" />
            <Shimmer className="w-16 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const InsightsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl">
        <Shimmer className="w-48 h-6 mb-3" />
        <Shimmer className="w-full h-4 mb-2" />
        <Shimmer className="w-4/5 h-4" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-[#0e1420] border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl h-[180px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Shimmer className="w-40 h-5" />
                <Shimmer className="w-20 h-4" />
              </div>
              <Shimmer className="w-full h-4" />
              <Shimmer className="w-5/6 h-4" />
            </div>
            <Shimmer className="w-full h-8 rounded-lg mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
};
