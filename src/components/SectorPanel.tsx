import React from 'react';
import { StockQuote } from '../types';
import { Layers, TrendingUp, Sparkles, ArrowRight, Zap, Target } from 'lucide-react';

interface SectorConstituent {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  turnover: number;
  isLeader?: boolean;
}

interface SectorInfo {
  code: string;
  name: string;
  category: string;
  description: string;
  leadStockCode: string;
  leadStockName: string;
  catalyst: string;
}

interface SectorPanelProps {
  sector: SectorInfo;
  quote: StockQuote;
  constituents?: SectorConstituent[];
  onSelectStock: (code: string) => void;
}

export const SectorPanel: React.FC<SectorPanelProps> = ({
  sector,
  quote,
  constituents = [],
  onSelectStock,
}) => {
  const isUp = quote.changePercent >= 0;

  return (
    <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-5 space-y-4">
      {/* Header & Sector Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#18202c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#d4a038]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">{sector.name}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-[#d4a038] border border-amber-500/30">
                {sector.category}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#16202c] border border-slate-800">
                {sector.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{sector.description}</p>
          </div>
        </div>

        {/* Sector Snapshot */}
        <div className="flex items-center gap-4 bg-[#121924] px-4 py-2.5 rounded-lg border border-[#222d3a]">
          <div>
            <div className="text-[11px] text-slate-400">板块基准指数</div>
            <div className={`text-lg font-bold font-mono ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
              {quote.price.toFixed(2)}
            </div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <div className="text-[11px] text-slate-400">板块平均涨幅</div>
            <div className={`text-base font-bold font-mono ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
              {isUp ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Catalyst Box */}
      {sector.catalyst && (
        <div className="bg-[#141b24] border border-amber-500/20 rounded-md p-3.5 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#d4a038] shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-amber-300 mr-2">【驱动逻辑与政策催化】</span>
            <span className="text-xs text-slate-300 leading-relaxed">{sector.catalyst}</span>
          </div>
        </div>
      )}

      {/* Constituents & Leader Stock Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#d4a038]" />
            <h3 className="text-sm font-bold text-white">板块核心成分股 & 领涨标的</h3>
            <span className="text-[11px] text-slate-400">（共 {constituents.length} 支精选龙头）</span>
          </div>
          <span className="text-[11px] text-slate-500">点击任意标的可穿梭至其专属K线研判</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {constituents.map((item) => {
            const stockUp = item.changePercent >= 0;
            return (
              <div
                key={item.code}
                onClick={() => onSelectStock(item.code)}
                className={`p-3 rounded-lg border transition cursor-pointer hover:scale-[1.01] flex flex-col justify-between ${
                  item.isLeader
                    ? 'bg-gradient-to-br from-amber-500/10 to-[#121924] border-amber-500/40 hover:border-amber-400'
                    : 'bg-[#121924] border-[#222d3a] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{item.name}</span>
                    {item.isLeader && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 rounded">
                        板块龙头
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{item.code}</span>
                </div>

                <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-base font-bold font-mono ${stockUp ? 'text-red-400' : 'text-emerald-400'}`}>
                      ¥{item.price.toFixed(2)}
                    </span>
                    <span className={`text-xs font-semibold font-mono ${stockUp ? 'text-red-400' : 'text-emerald-400'}`}>
                      {stockUp ? `+${item.changePercent.toFixed(2)}%` : `${item.changePercent.toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#d4a038] font-medium">
                    <span>研判</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
