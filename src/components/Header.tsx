import React from 'react';
import { StockSearchResult, MarketIndexItem, StockQuote } from '../types';
import { Flame, Layers, Camera, LineChart } from 'lucide-react';

interface HeaderProps {
  currentTab: 'indicator' | 'image' | 'limitUp';
  onTabChange: (tab: 'indicator' | 'image' | 'limitUp') => void;
  onSelectStock?: (code: string) => void;
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
        <h1 className="text-2xl font-bold tracking-wider text-white font-serif italic flex items-center gap-1.5">
          <span>读势</span>
        </h1>
        <span className="text-[11px] font-mono tracking-widest text-slate-400 font-semibold uppercase hidden sm:inline">
          A-SHARE TECHNICAL READING TERMINAL
        </span>
      </div>

      {/* Mode Switch Tabs matching screenshot */}
      <div className="flex items-center bg-[#0e141c] p-1 rounded-md border border-[#1e293b] gap-1">
        <button
          onClick={() => onTabChange('indicator')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
            currentTab === 'indicator'
              ? 'bg-[#1a2330] text-[#d4a038] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>指标分析</span>
        </button>

        <button
          onClick={() => onTabChange('limitUp')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer relative ${
            currentTab === 'limitUp'
              ? 'bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>短线龙虎榜</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
        </button>

        <button
          onClick={() => onTabChange('image')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
            currentTab === 'image'
              ? 'bg-[#1a2330] text-[#d4a038] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>图表识别</span>
        </button>
      </div>
    </header>
  );
};

