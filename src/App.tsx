import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { KlineChart } from './components/KlineChart';
import { IndicatorPulse } from './components/IndicatorPulse';
import { JudgmentPanel } from './components/JudgmentPanel';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import {
  KlinePoint,
  StockQuote,
  MarketIndexItem,
  KlinePeriod,
  TechnicalJudgment,
  StockSearchResult,
} from './types';
import { HOT_STOCKS } from '../lib/sampleData';
import { formatPrice } from '../lib/stockCode';
import { generateTechnicalJudgment } from '../lib/judgment';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'indicator' | 'image'>('indicator');
  const [currentCode, setCurrentCode] = useState<string>('600693'); // Default to 东百集团 matching screenshot
  const [currentPeriod, setCurrentPeriod] = useState<KlinePeriod>('day');

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [klineData, setKlineData] = useState<KlinePoint[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexItem[]>([]);
  const [judgment, setJudgment] = useState<TechnicalJudgment | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick view stock list
  const quickStocks = [
    { name: '贵州茅台', code: '600519' },
    { name: '平安银行', code: '000001' },
    { name: '宁德时代', code: '300750' },
    { name: '中国平安', code: '601318' },
  ];

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

      // Calculate rule-based judgment
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
    loadStockData(currentCode, currentPeriod);
  }, [currentCode, currentPeriod, loadStockData]);

  const handleSelectStock = (code: string) => {
    setCurrentCode(code);
  };

  const handlePeriodChange = (p: KlinePeriod) => {
    setCurrentPeriod(p);
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Check if directly a 6-digit code
    const cleanDigits = q.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 6) {
      setCurrentCode(cleanDigits);
      return;
    }

    // Try online search
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

    // Fallback direct
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
    <div className="min-h-screen bg-[#070a0e] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onSelectStock={handleSelectStock}
        marketIndices={marketIndices}
        currentQuote={quote}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-6 py-4 space-y-4">
        {currentTab === 'indicator' ? (
          <>
            {/* Search Bar & Quick Switch Bar matching screenshot */}
            <div className="space-y-2">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={quote?.name || '输入股票名称/代码...'}
                  className="flex-1 bg-[#10161f] border border-[#222d3a] focus:border-[#d4a038] rounded-md px-3.5 py-2 text-sm text-white placeholder-slate-400 outline-none transition"
                />
                <button
                  type="submit"
                  className="bg-[#d4a038] hover:bg-[#c4932f] text-black font-semibold text-xs px-5 py-2.5 rounded-md transition cursor-pointer shrink-0"
                >
                  查询
                </button>
              </form>

              {/* Quick View list */}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5">
                <span>快速查看:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickStocks.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectStock(s.code)}
                      className={`px-2.5 py-1 rounded border transition text-xs cursor-pointer ${
                        currentCode === s.code
                          ? 'bg-[#1a2330] border-[#d4a038]/60 text-white'
                          : 'bg-[#10161f] border-[#1d2733] text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Terminal Layout: Left Chart Column (68%) + Right Technical Panel (32%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Stock Header + Period Tabs + Indicator Bar + K-Line Chart */}
              <div className="lg:col-span-8 xl:col-span-8 space-y-3">
                {/* Stock Title & Period Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Stock Info */}
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-wide">
                      {quote?.name || '东百集团'}
                    </h2>
                    <span className="font-mono text-xs text-slate-400">
                      {quote?.code || '600693'}
                    </span>
                    <div className="flex items-baseline gap-2 pl-2">
                      <span
                        className={`text-xl font-black font-mono tracking-tight ${
                          isUp ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {quote ? formatPrice(quote.price) : '9.45'}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          isUp ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {quote ? (isUp ? '+' : '') + quote.change.toFixed(2) : '-1.03'} (
                        {quote ? (isUp ? '+' : '') + quote.changePercent.toFixed(2) : '-9.83'}%)
                      </span>
                    </div>
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

                {/* 5 Indicator Pulse Row */}
                <IndicatorPulse judgment={judgment} />

                {/* Interactive K-Line Canvas Chart */}
                <KlineChart
                  data={klineData}
                  period={currentPeriod}
                  onPeriodChange={handlePeriodChange}
                  stockName={quote?.name}
                  stockCode={quote?.code}
                />
              </div>

              {/* Right Column: Technical Judgment & AI Analysis Panel */}
              <div className="lg:col-span-4 xl:col-span-4 h-full">
                <JudgmentPanel
                  judgment={judgment}
                  quote={quote}
                  period={currentPeriod}
                  marketIndices={marketIndices}
                />
              </div>
            </div>
          </>
        ) : (
          /* Chart Vision AI Recognition Mode */
          <ImageAnalyzer />
        )}
      </main>
    </div>
  );
}
