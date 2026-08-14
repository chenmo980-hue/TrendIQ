import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Camera, Activity, Clock, Flame } from 'lucide-react';
import { StockSearchResult, MarketIndexItem, StockQuote } from '../types';
import { HOT_STOCKS } from '../../lib/sampleData';

interface HeaderProps {
  currentTab: 'indicator' | 'image';
  onTabChange: (tab: 'indicator' | 'image') => void;
  onSelectStock: (code: string) => void;
  marketIndices: MarketIndexItem[];
  currentQuote: StockQuote | null;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onSelectStock,
  marketIndices,
  currentQuote,
  isLoading,
}) => {
  return (
    <header className="border-b border-[#1c242c] bg-[#0b0f14] px-6 py-3">
      <div className="max-w-[1680px] mx-auto flex items-center justify-between">
        {/* Left: Brand & Slogan matching screenshot */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-[#e5a93c] tracking-wider font-serif">读势</span>
          <span className="text-[11px] font-mono tracking-widest text-slate-500 uppercase">
            A-SHARE TECHNICAL READING TERMINAL
          </span>
        </div>

        {/* Right: Mode Switcher Tabs */}
        <div className="flex items-center bg-[#121820] p-1 rounded-lg border border-[#222c37]">
          <button
            onClick={() => onTabChange('indicator')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              currentTab === 'indicator'
                ? 'bg-[#1b2532] text-white border border-[#2e3c4d] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            指标分析
          </button>
          <button
            onClick={() => onTabChange('image')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              currentTab === 'image'
                ? 'bg-[#1b2532] text-white border border-[#2e3c4d] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            图表识别
          </button>
        </div>
      </div>
    </header>
  );
};
