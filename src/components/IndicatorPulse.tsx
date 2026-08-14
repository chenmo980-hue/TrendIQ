import React from 'react';
import { TechnicalJudgment } from '../types';

interface IndicatorPulseProps {
  judgment: TechnicalJudgment | null;
}

export const IndicatorPulse: React.FC<IndicatorPulseProps> = ({ judgment }) => {
  if (!judgment || !judgment.indicatorsSummary || !Array.isArray(judgment.indicatorsSummary)) {
    return null;
  }

  const items = judgment.indicatorsSummary;
  const maItem = items.find((i) => i.name.includes('MA'));
  const macdItem = items.find((i) => i.name.includes('MACD'));
  const rsiItem = items.find((i) => i.name.includes('RSI'));
  const kdjItem = items.find((i) => i.name.includes('KDJ'));
  const bollItem = items.find((i) => i.name.includes('BOLL'));

  const getDotColor = (status?: 'bullish' | 'bearish' | 'neutral') => {
    if (status === 'bullish') return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
    if (status === 'bearish') return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
    return 'bg-slate-400';
  };

  const getTextColor = (status?: 'bullish' | 'bearish' | 'neutral') => {
    if (status === 'bullish') return 'text-rose-400';
    if (status === 'bearish') return 'text-emerald-400';
    return 'text-slate-400';
  };

  // Extract concise tag label
  const getShortText = (item?: { text: string; status: string }) => {
    if (!item || !item.text) return '中性';
    const t = item.text;
    if (t.includes('多头排列')) return '多头排列';
    if (t.includes('空头排列')) return '空头排列';
    if (t.includes('站上20日') || t.includes('短均线上穿')) return '短均线上穿';
    if (t.includes('承压20日') || t.includes('死叉')) return '死叉';
    if (t.includes('金叉')) return '金叉';
    if (t.includes('红柱')) return '红柱';
    if (t.includes('绿柱')) return '绿柱';
    if (t.includes('超买')) return '超买';
    if (t.includes('超卖')) return '超卖';
    if (t.includes('中轨上方') || t.includes('多头通道')) return '中轨上方';
    if (t.includes('中轨下方') || t.includes('中轨压制')) return '中轨下方';
    if (t.includes('触及布林上轨')) return '触及上轨';
    if (t.includes('触及布林下轨')) return '触及下轨';
    return t.length > 8 ? t.slice(0, 8) : t;
  };

  const list = [
    { label: 'MA', item: maItem },
    { label: 'MACD', item: macdItem },
    { label: 'RSI', item: rsiItem },
    { label: 'KDJ', item: kdjItem },
    { label: 'BOLL', item: bollItem },
  ];

  return (
    <div className="bg-[#0e1319] border border-[#1d2631] rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
      {list.map(({ label, item }) => {
        const status = item?.status || 'neutral';
        const text = getShortText(item);
        return (
          <div key={label} className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(status)}`} />
            <span className="text-xs text-slate-400 font-medium shrink-0">{label}</span>
            <span className={`text-xs font-medium truncate ${getTextColor(status)}`}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
};
