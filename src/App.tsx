import React, { useState, useEffect, useCallback } from 'react';
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
} from './types';
import { HOT_STOCKS } from '../lib/sampleData';
import { formatPrice, formatVolume, formatAmount } from '../lib/stockCode';
import { generateTechnicalJudgment } from '../lib/judgment';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Sparkles, Activity } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'indicator' | 'image'>('indicator');
  const [currentCode, setCurrentCode] = useState<string>('600519');
  const [currentPeriod, setCurrentPeriod] = useState<KlinePeriod>('day');

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [klineData, setKlineData] = useState<KlinePoint[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexItem[]>([]);
  const [judgment, setJudgment] = useState<TechnicalJudgment | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    const interval = setInterval(loadMarketIndices, 30000); // 30s auto-refresh
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

  const isUp = (quote?.changePercent ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200">
      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onSelectStock={handleSelectStock}
        marketIndices={marketIndices}
        currentQuote={quote}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 space-y-4">
        {currentTab === 'indicator' ? (
          <>
            {/* Quick Stock Switcher Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-slate-400 font-medium whitespace-nowrap shrink-0 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span>精选自选:</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {HOT_STOCKS.map((stock) => (
                  <button
                    key={stock.code}
                    onClick={() => handleSelectStock(stock.code)}
                    className={`px-3 py-1.5 rounded-lg border transition font-medium cursor-pointer flex items-center gap-1.5 ${
                      currentCode === stock.code
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{stock.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{stock.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Stock Snapshot Card */}
            {quote && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Main Price & Stock Name */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">{quote.name}</h2>
                        <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {quote.fullCode || quote.code}
                        </span>
                        {quote.isIndex && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                            大盘指数
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>A股市场交易中</span>
                        <span>·</span>
                        <span>更新于 {new Date(quote.timestamp).toLocaleTimeString('zh-CN')}</span>
                      </div>
                    </div>

                    {/* Price and change badge */}
                    <div className="flex items-baseline gap-3 pl-2 sm:border-l sm:border-slate-800">
                      <div
                        className={`text-2xl sm:text-3xl font-black font-mono-num tracking-tight ${
                          isUp ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        ¥{formatPrice(quote.price)}
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm font-bold font-mono-num px-2.5 py-1 rounded-md ${
                          isUp
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{isUp ? '+' : ''}{quote.change.toFixed(2)}</span>
                        <span>({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Key Quote Financial Stats */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <div>
                      <div className="text-slate-400">今开</div>
                      <div className="font-mono-num font-semibold text-slate-200">{formatPrice(quote.open)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">最高</div>
                      <div className="font-mono-num font-semibold text-rose-400">{formatPrice(quote.high)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">最低</div>
                      <div className="font-mono-num font-semibold text-emerald-400">{formatPrice(quote.low)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">昨收</div>
                      <div className="font-mono-num font-semibold text-slate-200">{formatPrice(quote.prevClose)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">成交量</div>
                      <div className="font-mono-num font-semibold text-slate-200">{formatVolume(quote.volume)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">成交额</div>
                      <div className="font-mono-num font-semibold text-slate-200">{formatAmount(quote.turnover)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Candlestick Interactive Chart with MAs, BOLL, Support/Resistance & Sub-charts */}
            <KlineChart
              data={klineData}
              period={currentPeriod}
              onPeriodChange={handlePeriodChange}
              stockName={quote?.name}
              stockCode={quote?.code}
            />

            {/* Indicator Pulse Bar (5 Core Indicators) */}
            <IndicatorPulse judgment={judgment} />

            {/* Technical Judgment & AI Interpretation */}
            <JudgmentPanel
              judgment={judgment}
              quote={quote}
              period={currentPeriod}
              marketIndices={marketIndices}
            />
          </>
        ) : (
          /* Chart Vision AI Recognition Mode */
          <ImageAnalyzer />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-medium text-slate-400">
            读势 · TrendIQ - A股多周期技术分析与AI智能视觉形态研判系统
          </p>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto">
            免责声明：本终端所呈现的技术指标、形态识别及AI智能研判仅供量化技术研究与行情观察参考，不代表任何形式的投资建议或买卖依据。证券投资有风险，入市需谨慎。
          </p>
        </div>
      </footer>
    </div>
  );
}
