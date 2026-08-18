import React from 'react';
import { StockQuote } from '../types';
import { Compass, TrendingUp, DollarSign, ArrowRight, Activity, Link2, ShieldCheck } from 'lucide-react';

interface FutureItem {
  symbol: string;
  name: string;
  category: string;
  subCategory: string;
  exchange: string;
  unit: string;
  isGlobal?: boolean;
  relatedSectors: string[];
  relatedStocks: { code: string; name: string }[];
}

interface FuturesPanelProps {
  quote: StockQuote;
  futureInfo?: FutureItem | null;
  onSelectStock: (code: string) => void;
}

export const FuturesPanel: React.FC<FuturesPanelProps> = ({
  quote,
  futureInfo,
  onSelectStock,
}) => {
  const isUp = quote.changePercent >= 0;

  return (
    <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-5 space-y-4">
      {/* Header & Futures Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#18202c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-wide">{quote.name}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {futureInfo?.exchange || '期货交易所'}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {futureInfo?.subCategory || futureInfo?.category || '期货合约'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#16202c] border border-slate-800">
                {quote.code}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>计价单位: <strong className="text-slate-200">{futureInfo?.unit || '元/吨'}</strong></span>
              <span>•</span>
              <span>品种性质: <strong className="text-slate-200">{futureInfo?.isGlobal ? '全球国际外盘' : '境内主力连续合约'}</strong></span>
            </div>
          </div>
        </div>

        {/* Real-time Pricing Bar */}
        <div className="flex items-center gap-4 bg-[#121924] px-4 py-2.5 rounded-lg border border-[#222d3a]">
          <div>
            <div className="text-[11px] text-slate-400">最新成交价</div>
            <div className={`text-xl font-bold font-mono ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
              {quote.price.toFixed(quote.price > 1000 ? 1 : 2)}
            </div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <div className="text-[11px] text-slate-400">日内涨跌幅</div>
            <div className={`text-base font-bold font-mono ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
              {isUp ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* 期现联动 & 产业映射 A股标的 */}
      {futureInfo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#d4a038]" />
              <h3 className="text-sm font-bold text-white">期现联动 · A股关联板块与核心映射标的</h3>
            </div>
            <span className="text-[11px] text-slate-500">大宗/期指异动往往领先于A股现货产业链传导</span>
          </div>

          {/* Related Sectors Chips */}
          {futureInfo.relatedSectors && futureInfo.relatedSectors.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">关联产业链:</span>
              {futureInfo.relatedSectors.map((sec, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-[#141d28] border border-slate-700/80 text-xs font-medium text-amber-300"
                >
                  {sec}
                </span>
              ))}
            </div>
          )}

          {/* Linked A-share Stocks */}
          {futureInfo.relatedStocks && futureInfo.relatedStocks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {futureInfo.relatedStocks.map((stock) => (
                <div
                  key={stock.code}
                  onClick={() => onSelectStock(stock.code)}
                  className="bg-[#121924] hover:bg-[#16202e] border border-[#222d3a] hover:border-[#d4a038]/60 p-3 rounded-lg transition cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-[#d4a038] transition">
                      {stock.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">{stock.code}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-[#d4a038] transition">
                    <span>研判</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
