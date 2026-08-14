import React from 'react';
import { IndicatorSummary, TechnicalJudgment } from '../types';
import { ShieldAlert, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

interface IndicatorPulseProps {
  judgment: TechnicalJudgment | null;
}

export const IndicatorPulse: React.FC<IndicatorPulseProps> = ({ judgment }) => {
  if (!judgment) return null;

  const { indicatorsSummary, score, direction } = judgment;

  // Bullish / Bearish color styles
  const getBadgeStyle = (status: 'bullish' | 'bearish' | 'neutral') => {
    if (status === 'bullish') {
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
        dot: 'bg-rose-500 shadow-rose-500/50',
        label: '偏多',
      };
    }
    if (status === 'bearish') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        dot: 'bg-emerald-500 shadow-emerald-500/50',
        label: '偏空',
      };
    }
    return {
      bg: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
      dot: 'bg-slate-400',
      label: '中性',
    };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              指标脉冲读数带
              <span className="text-[11px] font-normal text-slate-400">
                (5大技术维度多空共振实时监测)
              </span>
            </h3>
          </div>
        </div>

        {/* Aggregate technical score pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">综合技术评分:</span>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              score >= 60
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : score <= 40
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}
          >
            {score >= 60 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : score <= 40 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            <span className="font-mono text-sm">{score}</span>
            <span>{direction}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar of Bull vs Bear Resonance */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
          <span className="text-emerald-400">空方动能 (0)</span>
          <span className="text-slate-400">多空平衡 (50)</span>
          <span className="text-rose-400">多方动能 (100)</span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex relative">
          {/* Middle mark */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 z-10 -translate-x-1/2" />
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* 5 Indicator Pulse Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {indicatorsSummary.map((ind, i) => {
          const badge = getBadgeStyle(ind.status);
          return (
            <div
              key={i}
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-semibold text-slate-200">{ind.name}</span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mb-1.5">
                {ind.text}
              </p>
              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900 truncate">
                {ind.valueDisplay}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
