import React from 'react';

export default function FinancialSummaryStrip({ metrics }) {
  const todaysCollection = metrics.todaysCollection || 28500;
  const todaysInterest = metrics.todaysInterest || 4200;
  const todaysCash = metrics.todaysCash || 45800;
  const activeVolume = metrics.activeVolume || 2850000;
  const overdueAmount = metrics.overdueAmount || 94000;

  return (
    <div className="bg-white border border-gray-200/90 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-xs h-[58px] text-xs font-sans">
      <div className="flex items-center space-x-6">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Today's Collection</span>
          <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
            ₹{todaysCollection.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Today's Interest</span>
          <span className="text-sm font-bold text-blue-700 font-mono tabular-nums">
            ₹{todaysInterest.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Today's Cash in Hand</span>
          <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
            ₹{todaysCash.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-6 border-l border-gray-200 pl-6">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Total Outstanding</span>
          <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
            ₹{activeVolume.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block leading-tight">Overdue Amount</span>
          <span className="text-sm font-bold text-red-700 font-mono tabular-nums">
            ₹{overdueAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
