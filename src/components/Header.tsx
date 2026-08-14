import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Camera, Sparkles, Activity, Clock, Flame } from 'lucide-react';
import { StockSearchResult, MarketIndexItem, StockQuote } from '../types';
import { HOT_STOCKS } from '../../lib/sampleData';
import { formatPrice } from '../../lib/stockCode';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>(HOT_STOCKS);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [recentSearches, setRecentSearches] = useState<StockSearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trendiq_recent_stocks');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(HOT_STOCKS);
      setSelectedIndex(-1);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (resp.ok) {
          const data = await resp.json();
          const list = data.results || [];
          setSearchResults(list);
          setSelectedIndex(list.length > 0 ? 0 : -1);
        }
      } catch (e) {
        // Fallback local match
        const q = searchQuery.toLowerCase();
        const filtered = HOT_STOCKS.filter(
          (s) =>
            s.code.includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.pinyin.toLowerCase().includes(q)
        );
        setSearchResults(filtered);
        setSelectedIndex(filtered.length > 0 ? 0 : -1);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStockClick = (item: StockSearchResult) => {
    onSelectStock(item.code);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);

    // Save to recents
    const updated = [item, ...recentSearches.filter((r) => r.code !== item.code)].slice(0, 8);
    setRecentSearches(updated);
    try {
      localStorage.setItem('trendiq_recent_stocks', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleInstantSubmit = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    // 1. If an item is highlighted or matching in current searchResults, select it
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      handleStockClick(searchResults[selectedIndex]);
      return;
    }

    if (searchResults.length > 0) {
      handleStockClick(searchResults[0]);
      return;
    }

    // 2. If it is already a 6-digit code or starts with sh/sz/bj
    const cleanDigits = query.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 6) {
      onSelectStock(cleanDigits);
      setIsSearchOpen(false);
      setSearchQuery('');
      return;
    }

    // 3. Fallback: try an immediate online search
    try {
      setIsSearchingOnline(true);
      const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          handleStockClick(data.results[0]);
          return;
        }
      }
    } catch {
      // fallback
    } finally {
      setIsSearchingOnline(false);
    }

    // 4. Ultimate fallback: pass query directly
    onSelectStock(query);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isSearchOpen) setIsSearchOpen(true);
      if (searchResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1 >= searchResults.length ? 0 : prev + 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isSearchOpen) setIsSearchOpen(true);
      if (searchResults.length > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleInstantSubmit();
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Market Indices Ticker Bar */}
      <div className="border-b border-slate-800/50 bg-slate-950/60 px-4 py-1.5 overflow-x-auto text-xs flex items-center gap-6 scrollbar-none">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium whitespace-nowrap shrink-0">
          <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>大盘核心环境</span>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          {marketIndices.map((idx) => {
            const isUp = idx.changePercent >= 0;
            return (
              <button
                key={idx.code}
                onClick={() => onSelectStock(idx.code)}
                className="flex items-center gap-2 hover:bg-slate-800/50 px-2 py-0.5 rounded transition cursor-pointer"
                title={`点击查看 ${idx.name}`}
              >
                <span className="text-slate-300 font-medium">{idx.name}</span>
                <span className="font-mono-num font-semibold text-slate-100">
                  {formatPrice(idx.price)}
                </span>
                <span
                  className={`font-mono-num font-semibold ${
                    isUp ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isUp ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-md shadow-rose-500/20 text-white font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                读势 <span className="text-xs font-mono font-normal text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded bg-rose-500/10">TrendIQ</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">A股多周期技术分析与AI视觉终端</p>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="输入代码 / 中文简称 / 拼音 (如 600519 / GZMT / 茅台)..."
              className="w-full bg-slate-950/80 border border-slate-700/70 focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/30 rounded-lg pl-9 pr-16 py-1.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {(isLoading || isSearchingOnline) ? (
                <div className="w-3.5 h-3.5 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mr-1" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={handleInstantSubmit}
                  className="text-[11px] bg-rose-600/80 hover:bg-rose-600 text-white font-medium px-2 py-0.5 rounded transition cursor-pointer"
                  title="点击或按回车确认"
                >
                  跳转
                </button>
              ) : null}
            </div>
          </div>

          {/* Autocomplete dropdown */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              {/* Quick Hot Suggestions */}
              {searchQuery === '' && (
                <div className="p-2 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5 px-1 font-medium">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>热门标的推荐</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {HOT_STOCKS.slice(0, 8).map((s) => (
                      <button
                        key={s.code}
                        onClick={() => handleStockClick(s)}
                        className="text-xs bg-slate-800/80 hover:bg-slate-700 hover:text-rose-300 text-slate-300 px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{s.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{s.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent searches */}
              {searchQuery === '' && recentSearches.length > 0 && (
                <div className="p-2 border-b border-slate-800">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1 px-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>最近搜索</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => handleStockClick(s)}
                        className="text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition flex items-center gap-1"
                      >
                        <span>{s.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{s.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results List */}
              <div className="py-1">
                <div className="px-3 py-1 text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>{searchQuery ? `匹配结果 (${searchResults.length})` : '全市场精选标的'}</span>
                  {searchQuery && <span className="text-[10px] text-slate-500">按 ↑↓ 切换，回车确认</span>}
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    <p>未找到完全匹配标的</p>
                    <button
                      onClick={handleInstantSubmit}
                      className="mt-2 text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                    >
                      尝试直接按代码 &quot;{searchQuery}&quot; 查询行情
                    </button>
                  </div>
                ) : (
                  searchResults.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.code}
                        onClick={() => handleStockClick(item)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-sm transition group cursor-pointer ${
                          isSelected ? 'bg-rose-500/20 text-rose-200 border-l-2 border-rose-500' : 'hover:bg-slate-800/70 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold transition ${isSelected ? 'text-rose-300' : 'group-hover:text-rose-400'}`}>
                            {item.name}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {item.code}
                          </span>
                          {item.type && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {item.type}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono uppercase text-slate-400">
                          {item.market.toUpperCase()}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => onTabChange('indicator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              currentTab === 'indicator'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>指标分析模式</span>
          </button>
          <button
            onClick={() => onTabChange('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              currentTab === 'image'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>图表识别模式</span>
            <span className="text-[9px] bg-amber-400/20 text-amber-300 font-mono px-1 rounded ml-0.5">AI</span>
          </button>
        </div>
      </div>
    </header>
  );
};
