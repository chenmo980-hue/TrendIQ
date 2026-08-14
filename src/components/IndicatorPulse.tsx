import React from 'react';
import { TechnicalJudgment } from '../types';

interface IndicatorPulseProps {
  judgment: TechnicalJudgment | null;
}

export const IndicatorPulse: React.FC<IndicatorPulseProps> = ({ judgment }) => {
  if (!judgment) return null;

  const { indicatorsSummary } = judgment;

  const getDotColor = (status: 'bullish' | 'bearish' | 'neutral') => {
    if (status === 'bullish') return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
    if (status === 'bearish') return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
    return 'bg-slate-400';
  };

  const getTextColor = (status: 'bullish' | 'bearish' | 'neutral') => {
    if (status === 'bullish') return 'text-rose-400';
    if (status === 'bearish') return 'text-emerald-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-[#0e1319] border border-[#1d2631] rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
      {/* 1. MA */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(indicatorsSummary.ma.status)}`} />
        <span className="text-xs text-slate-400 font-medium">MA</span>
        <span className={`text-xs font-medium truncate ${getTextColor(indicatorsSummary.ma.status)}`}>
          {indicatorsSummary.ma.shortLabel || indicatorsSummary.ma.desc}
        </span>
      </div>

      {/* 2. MACD */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(indicatorsSummary.macd.status)}`} />
        <span className="text-xs text-slate-400 font-medium">MACD</span>
        <span className={`text-xs font-medium truncate ${getTextColor(indicatorsSummary.macd.status)}`}>
          {indicatorsSummary.macd.shortLabel || indicatorsSummary.macd.desc}
        </span>
      </div>

      {/* 3. RSI */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(indicatorsSummary.rsi.status)}`} />
        <span className="text-xs text-slate-400 font-medium">RSI</span>
        <span className={`text-xs font-medium truncate ${getTextColor(indicatorsSummary.rsi.status)}`}>
          {indicatorsSummary.rsi.shortLabel || indicatorsSummary.rsi.desc}
        </span>
      </div>

      {/* 4. KDJ */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(indicatorsSummary.kdj.status)}`} />
        <span className="text-xs text-slate-400 font-medium">KDJ</span>
        <span className={`text-xs font-medium truncate ${getTextColor(indicatorsSummary.kdj.status)}`}>
          {indicatorsSummary.kdj.shortLabel || indicatorsSummary.kdj.desc}
        </span>
      </div>

      {/* 5. BOLL */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(indicatorsSummary.boll.status)}`} />
        <span className="text-xs text-slate-400 font-medium">BOLL</span>
        <span className={`text-xs font-medium truncate ${getTextColor(indicatorsSummary.boll.status)}`}>
          {indicatorsSummary.boll.shortLabel || indicatorsSummary.boll.desc}
        </span>
      </div>
    </div>
  );
};
