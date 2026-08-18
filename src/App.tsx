import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { KlineChart } from './components/KlineChart';
import { IndicatorPulse } from './components/IndicatorPulse';
import { JudgmentPanel } from './components/JudgmentPanel';
import { StockDragonTigerPanel } from './components/StockDragonTigerPanel';
import { SectorPanel } from './components/SectorPanel';
import { FuturesPanel } from './components/FuturesPanel';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { LimitUpBoard } from './components/LimitUpBoard';
import {
  KlinePoint,
  StockQuote,
  MarketIndexItem,
  KlinePeriod,
  TechnicalJudgment,
  StockSearchResult,
  AssetType,
} from './types';
import { formatPrice } from '../lib/stockCode';
import { generateTechnicalJudgment } from '../lib/judgment';
import { Clock, RotateCcw, Flame, Layers, Compass, Search, TrendingUp, X } from 'lucide-react';

interface FrequentStock {
  code: string;
  name: string;
  count: number;
  lastViewed: number;
  assetType?: AssetType;
}

const POPULAR_SECTORS = [
  { code: 'BK_DKJJ', name: '低空经济', category: '核心题材' },
  { code: 'BK_SEMICONDUCTOR', name: '半导体芯片', category: '高景气制造' },
  { code: 'BK_AI_POWER', name: '算力与CPO', category: 'AI主线' },
  { code: 'BK_BATTERY', name: '固态电池', category: '新能源' },
  { code: 'BK_ROBOT', name: '人形机器人', category: '核心题材' },
  { code: 'BK_SECURITIES', name: '证券券商', category: '金融权重' },
  { code: 'BK_AEROSPACE', name: '商业航天', category: '前沿制造' },
];

const POPULAR_FUTURES = [
  { symbol: 'SC2609', name: '原油2609', subCategory: '能源化工' },
  { symbol: 'SC0', name: '原油连续', subCategory: '能源化工' },
  { symbol: 'RB0', name: '螺纹钢', subCategory: '黑色系' },
  { symbol: 'CU0', name: '沪铜', subCategory: '有色金属' },
  { symbol: 'AU0', name: '沪金', subCategory: '贵金属' },
  { symbol: 'IF0', name: 'IF沪深300', subCategory: '股指' },
  { symbol: 'IM0', name: 'IM中证1000', subCategory: '股指' },
  { symbol: 'hf_CL', name: 'WTI原油', subCategory: '外盘' },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'indicator' | 'image' | 'limitUp'>('indicator');
  const [currentCode, setCurrentCode] = useState<string>(''); // 不默认加载任何标的
  const [currentPeriod, setCurrentPeriod] = useState<KlinePeriod>('day');
  const [currentAssetType, setCurrentAssetType] = useState<AssetType>('stock');

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [klineData, setKlineData] = useState<KlinePoint[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexItem[]>([]);
  const [judgment, setJudgment] = useState<TechnicalJudgment | null>(null);
  const [sectorDetail, setSectorDetail] = useState<any | null>(null);
  const [futureInfo, setFutureInfo] = useState<any | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'stock' | 'sector' | 'futures'>('all');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic frequently viewed stocks/assets stored in localStorage
  const [frequentStocks, setFrequentStocks] = useState<FrequentStock[]>(() => {
    try {
      const saved = localStorage.getItem('trendiq_frequent_stocks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Track stock/asset visit count and timestamp dynamically
  const recordStockVisit = useCallback((code: string, name: string, type: AssetType = 'stock') => {
    if (!code) return;
    setFrequentStocks((prev) => {
      const list = [...prev];
      const idx = list.findIndex((item) => item.code === code);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          name: name && !name.startsWith('标的') ? name : list[idx].name,
          count: (list[idx].count || 0) + 1,
          lastViewed: Date.now(),
          assetType: type,
        };
      } else {
        list.push({
          code,
          name: name || code,
          count: 1,
          lastViewed: Date.now(),
          assetType: type,
        });
      }

      list.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.lastViewed - a.lastViewed;
      });

      const trimmed = list.slice(0, 8);
      try {
        localStorage.setItem('trendiq_frequent_stocks', JSON.stringify(trimmed));
      } catch {
        // ignore
      }
      return trimmed;
    });
  }, []);

  // 1. Fetch Market Overview Indices
  const loadMarketIndices = useCallback(async () => {
    try {
      const resp = await fetch('/api/market-context');
      if (resp.ok) {
        const data = await resp.json();
        setMarketIndices(data.indices || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadMarketIndices();
    const interval = setInterval(loadMarketIndices, 30000);
    return () => clearInterval(interval);
  }, [loadMarketIndices]);

  // Live search debounce
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await fetch(
          `/api/search?q=${encodeURIComponent(searchInput.trim())}&category=${searchCategory}`
        );
        if (resp.ok) {
          const data = await resp.json();
          setSearchResults(data.results || []);
          setShowSearchDropdown(true);
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchInput, searchCategory]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Fetch K-line and Real-time Quote for selected asset (Stock, Sector, or Futures)
  const loadAssetData = useCallback(async (code: string, period: KlinePeriod) => {
    if (!code) {
      setQuote(null);
      setKlineData([]);
      setJudgment(null);
      setSectorDetail(null);
      setFutureInfo(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/kline?code=${encodeURIComponent(code)}&period=${period}`);
      if (!resp.ok) {
        throw new Error(`无法获取该标的行情数据 (HTTP ${resp.status})`);
      }
      const data = await resp.json();

      const assetType: AssetType = data.assetType || 'stock';
      setCurrentAssetType(assetType);
      setQuote(data.quote);
      setKlineData(data.klineData || []);

      if (assetType === 'sector') {
        setSectorDetail({
          sector: data.sector,
          constituents: data.constituents || [],
        });
        setFutureInfo(null);
      } else if (assetType === 'futures') {
        setFutureInfo(data.futureInfo || null);
        setSectorDetail(null);
      } else {
        setSectorDetail(null);
        setFutureInfo(null);
      }

      // Record visit
      if (data.quote) {
        recordStockVisit(data.quote.code, data.quote.name, assetType);
      }

      // Calculate rule-based technical judgment
      if (data.quote && data.klineData && data.klineData.length > 0) {
        const j = generateTechnicalJudgment(data.klineData, data.quote, period);
        setJudgment(j);
      }
    } catch (err: any) {
      console.error('Failed to load asset data:', err);
      setError(err.message || '加载行情失败');
    } finally {
      setIsLoading(false);
    }
  }, [recordStockVisit]);

  useEffect(() => {
    if (currentCode) {
      loadAssetData(currentCode, currentPeriod);
    }
  }, [currentCode, currentPeriod, loadAssetData]);

  const handleSelectAsset = (code: string) => {
    setCurrentCode(code);
    setCurrentTab('indicator');
    setShowSearchDropdown(false);
    setSearchInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePeriodChange = (p: KlinePeriod) => {
    setCurrentPeriod(p);
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;

    setShowSearchDropdown(false);

    // Try search API
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}&category=${searchCategory}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          handleSelectAsset(data.results[0].code);
          return;
        }
      }
    } catch {
      // fallback
    }

    handleSelectAsset(q);
  };

  const isUp = (quote?.changePercent ?? 0) >= 0;

  const periods: { id: KlinePeriod; label: string }[] = [
    { id: 'day', label: '日线' },
    { id: '1m', label: '1分' },
    { id: '5m', label: '5分' },
    { id: '15m', label: '15分' },
    { id: '30m', label: '30分' },
    { id: '60m', label: '60分' },
    { id: '90m', label: '90分' },
    { id: '120m', label: '120分' },
  ];

  return (
    <div className="min-h-screen bg-[#070a0e] text-slate-100 flex flex-col font-sans selection:bg-[#d4a038]/30">
      {/* Top Header matching user screenshot */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onSelectStock={handleSelectAsset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-6 py-4 space-y-4">
        {currentTab === 'indicator' ? (
          <>
            {/* Top Multi-Asset Search Input & Filter System */}
            <div className="space-y-2.5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* Search Bar Container with Category Tabs */}
                <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 bg-[#10161f] border border-[#222d3a] focus-within:border-[#d4a038] rounded-md p-1 transition shadow-sm">
                    {/* Category Filter Dropdown Pills */}
                    <div className="flex items-center bg-[#16202c] rounded px-1 py-0.5 gap-0.5 shrink-0">
                      {[
                        { id: 'all', label: '全部' },
                        { id: 'stock', label: 'A股' },
                        { id: 'sector', label: '板块' },
                        { id: 'futures', label: '期货' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSearchCategory(cat.id as any)}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded transition cursor-pointer ${
                            searchCategory === cat.id
                              ? 'bg-[#d4a038] text-black font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={searchInput}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowSearchDropdown(true);
                      }}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="搜索A股代码/名称、板块题材(低空经济/芯片)、期货大宗(螺纹/沪铜/黄金/原油)"
                      className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                    />

                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          setSearchResults([]);
                          setShowSearchDropdown(false);
                        }}
                        className="text-slate-500 hover:text-slate-300 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="submit"
                      className="bg-[#d4a038] hover:bg-[#c4932f] text-black font-bold text-xs px-4 py-1.5 rounded transition cursor-pointer shrink-0"
                    >
                      查询
                    </button>
                  </form>

                  {/* Auto-suggest Search Results Dropdown */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0e141c] border border-[#222d3a] rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto divide-y divide-[#18202c]">
                      {searchResults.map((item) => {
                        const isSector = item.type?.includes('板块');
                        const isFuture = item.type?.includes('期货');
                        return (
                          <div
                            key={item.code}
                            onClick={() => handleSelectAsset(item.code)}
                            className="px-3.5 py-2.5 hover:bg-[#16202c] cursor-pointer flex items-center justify-between transition group"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isSector
                                    ? 'bg-amber-500/20 text-[#d4a038] border border-amber-500/30'
                                    : isFuture
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {item.type || item.market}
                              </span>
                              <span className="font-bold text-sm text-white group-hover:text-[#d4a038] transition">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-slate-400">{item.code}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Popular Sector & Futures Shortcuts */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#d4a038]" />
                    <span>热门题材:</span>
                  </span>
                  {POPULAR_SECTORS.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectAsset(s.code)}
                      className={`px-2.5 py-1 rounded border transition text-xs cursor-pointer ${
                        currentCode === s.code
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-[#10161f] border-[#1d2733] text-slate-300 hover:border-amber-500/50 hover:text-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Futures Shortcuts Row & Frequently Viewed */}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-0.5">
                {/* Popular Futures */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    <span>主力期货:</span>
                  </span>
                  {POPULAR_FUTURES.map((f) => (
                    <button
                      key={f.symbol}
                      onClick={() => handleSelectAsset(f.symbol)}
                      className={`px-2.5 py-1 rounded border transition text-xs cursor-pointer ${
                        currentCode === f.symbol
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                          : 'bg-[#10161f] border-[#1d2733] text-slate-300 hover:border-emerald-500/50 hover:text-white'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                {/* Fast Jump to Limit Up Board */}
                <button
                  onClick={() => setCurrentTab('limitUp')}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600/20 to-amber-600/20 hover:from-red-600/30 hover:to-amber-600/30 border border-red-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>短线龙虎榜 & 连板天梯</span>
                </button>
              </div>

              {/* Dynamic Frequently / Recently Viewed Assets */}
              {frequentStocks.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#d4a038]" />
                    <span>常看标的:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {frequentStocks.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => handleSelectAsset(s.code)}
                        title={`常看次数: ${s.count} 次 | 代码: ${s.code}`}
                        className={`px-3 py-1 rounded-full border transition text-xs cursor-pointer flex items-center gap-1.5 ${
                          currentCode === s.code
                            ? 'bg-[#1a2330] border-[#d4a038]/70 text-[#d4a038] font-semibold shadow-sm'
                            : 'bg-[#10161f] border-[#1d2733] text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="text-[10px] font-mono opacity-60">{s.code}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        localStorage.removeItem('trendiq_frequent_stocks');
                        setFrequentStocks([]);
                      }}
                      title="清空常看记录"
                      className="p-1 hover:bg-[#151e2a] text-slate-500 hover:text-slate-300 rounded transition cursor-pointer ml-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Display Either Main Terminal OR Empty Prompt */}
            {!currentCode || (!quote && !isLoading) ? (
              <div className="py-24 text-center text-slate-500 text-sm font-medium space-y-3">
                <div className="text-base text-slate-300">请输入股票代码/板块/期货名称开始分析</div>
                <div className="text-xs text-slate-500">
                  支持 A股个股（如 600519、002085）、板块题材（低空经济、半导体、固态电池）、期货大宗（螺纹钢、沪铜、黄金、原油、股指期指）
                </div>
              </div>
            ) : (
              /* Two-Column Professional Split Layout */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Asset Price Bar + Period Tabs + Specific Panels + K-Line Canvas Chart */}
                <div className="lg:col-span-8 xl:col-span-8 space-y-3">
                  {/* Asset Title & Period Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    {/* Asset Name & Price Badges */}
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                        <span>{quote?.name || currentCode}</span>
                        {currentAssetType === 'sector' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-[#d4a038] border border-amber-500/30">
                            板块题材
                          </span>
                        )}
                        {currentAssetType === 'futures' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            期货连续
                          </span>
                        )}
                      </h2>
                      <span className="font-mono text-xs text-slate-400">
                        {quote?.code || currentCode}
                      </span>
                      {quote && (
                        <div className="flex items-baseline gap-2 pl-2">
                          <span
                            className={`text-xl font-black font-mono tracking-tight ${
                              isUp ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {currentAssetType === 'futures'
                              ? quote.price.toFixed(quote.price > 1000 ? 1 : 2)
                              : formatPrice(quote.price)}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold ${
                              isUp ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}
                            {quote.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Period Switcher Tabs */}
                    <div className="flex items-center bg-[#10161f] p-0.5 rounded border border-[#1d2733] shrink-0">
                      {periods.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handlePeriodChange(p.id)}
                          className={`px-2.5 py-1 text-xs font-medium transition cursor-pointer rounded ${
                            currentPeriod === p.id
                              ? 'bg-[#1b2532] text-[#d4a038] font-semibold border border-[#2b394b]'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* If Sector: Render Sector Detail & Constituents */}
                  {currentAssetType === 'sector' && sectorDetail && (
                    <SectorPanel
                      sector={sectorDetail.sector}
                      quote={quote!}
                      constituents={sectorDetail.constituents}
                      onSelectStock={handleSelectAsset}
                    />
                  )}

                  {/* If Futures: Render Futures Detail & Linked A-Share Stocks */}
                  {currentAssetType === 'futures' && (
                    <FuturesPanel
                      quote={quote!}
                      futureInfo={futureInfo}
                      onSelectStock={handleSelectAsset}
                    />
                  )}

                  {/* If Stock: Render 5 Core Indicator Pulse Matrix */}
                  {currentAssetType === 'stock' && (
                    <IndicatorPulse judgment={judgment} />
                  )}

                  {/* Canvas K-Line Interactive Chart with MAs and Support/Resistance tags */}
                  <KlineChart
                    data={klineData}
                    period={currentPeriod}
                    onPeriodChange={handlePeriodChange}
                    stockName={quote?.name}
                    stockCode={quote?.code}
                  />

                  {/* If Stock: Render Dragon-Tiger Billboard Seat Breakdown Panel */}
                  {currentAssetType === 'stock' && (
                    <StockDragonTigerPanel
                      code={currentCode}
                      stockName={quote?.name}
                      quote={quote}
                    />
                  )}
                </div>

                {/* Right Column: Technical Judgment Panel with Zero-Failure AI Comprehensive Interpretation */}
                <div className="lg:col-span-4 xl:col-span-4 h-full">
                  <JudgmentPanel
                    judgment={judgment}
                    quote={quote}
                    period={currentPeriod}
                    marketIndices={marketIndices}
                  />
                </div>
              </div>
            )}
          </>
        ) : currentTab === 'limitUp' ? (
          /* Short-Term Limit-Up Ladder & Dragon-Tiger Board View */
          <LimitUpBoard
            onSelectStock={(selectedCode) => {
              handleSelectAsset(selectedCode);
              setCurrentTab('indicator');
            }}
          />
        ) : (
          /* Vision AI Chart Analysis Recognition Tab */
          <ImageAnalyzer />
        )}
      </main>
    </div>
  );
}
