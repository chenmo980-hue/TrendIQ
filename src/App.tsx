import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KlineChart } from './components/KlineChart';
import { IndicatorPulse } from './components/IndicatorPulse';
import { JudgmentPanel } from './components/JudgmentPanel';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { LimitUpBoard } from './components/LimitUpBoard';
import {
  KlinePoint,
  StockQuote,
  MarketIndexItem,
  KlinePeriod,
  TechnicalJudgment,
} from './types';
import { formatPrice } from '../lib/stockCode';
import { generateTechnicalJudgment } from '../lib/judgment';
import { Clock, RotateCcw, Flame } from 'lucide-react';

interface FrequentStock {
  code: string;
  name: string;
  count: number;
  lastViewed: number;
}

const DEFAULT_FREQUENT_STOCKS: FrequentStock[] = [
  { name: '贵州茅台', code: '600519', count: 10, lastViewed: Date.now() - 1000 },
  { name: '万丰奥威', code: '002085', count: 9, lastViewed: Date.now() - 1500 },
  { name: '中科曙光', code: '603019', count: 8, lastViewed: Date.now() - 2000 },
  { name: '宁德时代', code: '300750', count: 8, lastViewed: Date.now() - 2500 },
  { name: '东方财富', code: '300059', count: 6, lastViewed: Date.now() - 3000 },
  { name: '中芯国际', code: '688981', count: 4, lastViewed: Date.now() - 4000 },
  { name: '比亚迪',   code: '002594', count: 2, lastViewed: Date.now() - 5000 },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'indicator' | 'image' | 'limitUp'>('indicator');
  const [currentCode, setCurrentCode] = useState<string>('600519'); // Default to 贵州茅台
  const [currentPeriod, setCurrentPeriod] = useState<KlinePeriod>('day');

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [klineData, setKlineData] = useState<KlinePoint[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexItem[]>([]);
  const [judgment, setJudgment] = useState<TechnicalJudgment | null>(null);

  const [searchInput, setSearchInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic frequently viewed stocks stored in localStorage
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
    return DEFAULT_FREQUENT_STOCKS;
  });

  // Track stock visit count and timestamp dynamically
  const recordStockVisit = useCallback((code: string, name: string) => {
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
        };
      } else {
        list.push({
          code,
          name: name || code,
          count: 1,
          lastViewed: Date.now(),
        });
      }

      // Sort by frequency count (descending), and recency
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

  // 2. Fetch K-line and Real-time Quote for selected stock & period
  const loadStockData = useCallback(async (code: string, period: KlinePeriod) => {
    if (!code) {
      setQuote(null);
      setKlineData([]);
      setJudgment(null);
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

      setQuote(data.quote);
      setKlineData(data.klineData || []);

      // Record stock visit to dynamic frequently-viewed list
      if (data.quote) {
        recordStockVisit(data.quote.code, data.quote.name);
      }

      // Calculate rule-based technical judgment
      if (data.quote && data.klineData && data.klineData.length > 0) {
        const j = generateTechnicalJudgment(data.klineData, data.quote, period);
        setJudgment(j);
      }
    } catch (err: any) {
      console.error('Failed to load stock data:', err);
      setError(err.message || '加载行情失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentCode) {
      loadStockData(currentCode, currentPeriod);
    }
  }, [currentCode, currentPeriod, loadStockData]);

  const handleSelectStock = (code: string) => {
    setCurrentCode(code);
  };

  const handlePeriodChange = (p: KlinePeriod) => {
    setCurrentPeriod(p);
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;

    // Check if directly a 6-digit code
    const cleanDigits = q.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 6) {
      setCurrentCode(cleanDigits);
      return;
    }

    // Try search API
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          setCurrentCode(data.results[0].code);
          return;
        }
      }
    } catch {
      // fallback
    }

    setCurrentCode(q);
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
        onSelectStock={handleSelectStock}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-6 py-4 space-y-4">
        {currentTab === 'indicator' ? (
          <>
            {/* Top Search Input & Quick Switch Row */}
            <div className="space-y-2">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-lg">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="输入A股代码或中文名称，如 600519 / 贵州茅台"
                  className="flex-1 bg-[#10161f] border border-[#222d3a] focus:border-[#d4a038] rounded-md px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
                <button
                  type="submit"
                  className="bg-[#d4a038] hover:bg-[#c4932f] text-black font-bold text-xs px-5 py-2.5 rounded-md transition cursor-pointer shrink-0 shadow-sm"
                >
                  查询
                </button>
              </form>

              {/* Dynamic Frequently / Recently Viewed Stocks */}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                  <Clock className="w-3.5 h-3.5 text-[#d4a038]" />
                  <span>常看标的:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {frequentStocks.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectStock(s.code)}
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
                  {frequentStocks.length > 0 && (
                    <button
                      onClick={() => {
                        localStorage.removeItem('trendiq_frequent_stocks');
                        setFrequentStocks(DEFAULT_FREQUENT_STOCKS);
                      }}
                      title="重置常看记录"
                      className="p-1 hover:bg-[#151e2a] text-slate-500 hover:text-slate-300 rounded transition cursor-pointer ml-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}

                  {/* Fast Jump to Limit Up Board */}
                  <button
                    onClick={() => setCurrentTab('limitUp')}
                    className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-red-600/20 to-amber-600/20 hover:from-red-600/30 hover:to-amber-600/30 border border-red-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span>查看短线龙虎榜 & 连板天梯</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Display Either Main Terminal OR Empty Prompt */}
            {!currentCode || (!quote && !isLoading) ? (
              <div className="py-28 text-center text-slate-500 text-sm font-medium">
                输入股票代码开始分析，或点击上方快速查看示例
              </div>
            ) : (
              /* Two-Column Professional Split Layout: Left 67% Chart + Right 33% Technical Judgment */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Stock Price Bar + Period Tabs + 5 Indicators Row + K-Line Canvas Chart */}
                <div className="lg:col-span-8 xl:col-span-8 space-y-3">
                  {/* Stock Title & Period Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    {/* Stock Name & Price Badges */}
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-white tracking-wide">
                        {quote?.name || '东百集团'}
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
                            {formatPrice(quote.price)}
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

                  {/* 5 Core Indicator Pulse Matrix */}
                  <IndicatorPulse judgment={judgment} />

                  {/* Canvas K-Line Interactive Chart with MAs and Support/Resistance tags */}
                  <KlineChart
                    data={klineData}
                    period={currentPeriod}
                    onPeriodChange={handlePeriodChange}
                    stockName={quote?.name}
                    stockCode={quote?.code}
                  />
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
              handleSelectStock(selectedCode);
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
