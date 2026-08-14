import React from 'react';
import { StockSearchResult, MarketIndexItem, StockQuote } from '../types';

interface HeaderProps {
  currentTab: 'indicator' | 'image';
  onTabChange: (tab: 'indicator' | 'image') => void;
  onSelectStock: (code: string) => void;
  marketIndices?: MarketIndexItem[];
  currentQuote?: StockQuote | null;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <header className="border-b border-[#18202c] bg-[#070a0e] px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo & Slogan matching screenshot */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-wider text-white font-serif italic">
          读势
        </h1>
        <span className="text-[11px] font-mono tracking-widest text-slate-400 font-semibold uppercase">
          A-SHARE TECHNICAL READING TERMINAL
        </span>
      </div>

      {/* Mode Switch Tabs matching screenshot */}
      <div className="flex items-center bg-[#0e141c] p-1 rounded-md border border-[#1e293b]">
        <button
          onClick={() => onTabChange('indicator')}
          className={`px-4 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
            currentTab === 'indicator'
              ? 'bg-[#1a2330] text-[#d4a038] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          指标分析
        </button>
        <button
          onClick={() => onTabChange('image')}
          className={`px-4 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
            currentTab === 'image'
              ? 'bg-[#1a2330] text-[#d4a038] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          图表识别
        </button>
      </div>
    </header>
  );
};
