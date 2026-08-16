import React, { useState, useEffect } from 'react';
import {
  StockDragonTigerDetail,
  StockDragonTigerSeatItem,
  StockQuote,
} from '../types';
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Flame,
  Award,
  Sparkles,
  Zap,
  Info,
  RefreshCw,
  Layers,
  Percent,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface StockDragonTigerPanelProps {
  code: string;
  stockName?: string;
  quote?: StockQuote | null;
}

export const StockDragonTigerPanel: React.FC<StockDragonTigerPanelProps> = ({
  code,
  stockName,
  quote,
}) => {
  const [data, setData] = useState<StockDragonTigerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'buyers' | 'sellers' | 'verdict'>('buyers');
  const [selectedSeat, setSelectedSeat] = useState<StockDragonTigerSeatItem | null>(null);

  const fetchDragonTiger = async (stockCode: string) => {
    if (!stockCode) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/stock-dragon-tiger?code=${encodeURIComponent(stockCode)}`);
      if (resp.ok) {
        const json: StockDragonTigerDetail = await resp.json();
        setData(json);
        if (json.buySeats && json.buySeats.length > 0) {
          setSelectedSeat(json.buySeats[0]);
        } else {
          setSelectedSeat(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stock dragon tiger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDragonTiger(code);
  }, [code]);

  const formatAmount = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '¥0.00';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : val > 0 ? '+' : '';
    if (abs >= 100000000) {
      return `${sign}¥${(abs / 100000000).toFixed(2)} 亿`;
    }
    if (abs >= 10000) {
      return `${sign}¥${(abs / 10000).toFixed(1)} 万`;
    }
    return `${sign}¥${abs.toFixed(0)}`;
  };

  const formatPureAmount = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '¥0.00';
    const abs = Math.abs(val);
    if (abs >= 100000000) {
      return `¥${(abs / 100000000).toFixed(2)} 亿`;
    }
    if (abs >= 10000) {
      return `¥${(abs / 10000).toFixed(1)} 万`;
    }
    return `¥${abs.toFixed(0)}`;
  };

  const getSeatBadgeColor = (type: string) => {
    switch (type) {
      case 'institution':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'northbound':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'retail':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'hot_money':
      default:
        return 'bg-amber-950/80 text-amber-300 border-amber-600/60';
    }
  };

  const getRankBadge = (rank: number, isBuy: boolean) => {
    const bgClass = isBuy
      ? rank === 1
        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow-sm'
        : rank === 2
        ? 'bg-rose-700/80 text-white font-bold'
        : rank === 3
        ? 'bg-orange-700/80 text-white font-bold'
        : 'bg-[#1e293b] text-slate-300 font-medium'
      : rank === 1
      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-sm'
      : rank === 2
      ? 'bg-emerald-700/80 text-white font-bold'
      : rank === 3
      ? 'bg-teal-700/80 text-white font-bold'
      : 'bg-[#1e293b] text-slate-300 font-medium';

    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] shrink-0 ${bgClass}`}
      >
        {isBuy ? `买 ${rank}` : `卖 ${rank}`}
      </span>
    );
  };

  return (
    <div className="bg-[#0b1017] border border-[#1d2733] rounded-lg overflow-hidden shadow-lg transition">
      {/* Top Main Banner Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#111823] via-[#0f1722] to-[#141d2a] border-b border-[#1d2733] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-lg bg-[#d4a038]/10 border border-[#d4a038]/30 text-[#d4a038] shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-wide">
                龙虎榜席位深度透视
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {stockName || data?.name || ''} ({code})
              </span>

              {data?.hasDragonTiger ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                  当日/最新已登龙虎榜
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  当日未登龙虎榜
                </span>
              )}

              {data?.tradeDate && (
                <span className="text-xs text-slate-400 font-mono bg-[#141b24] px-2 py-0.5 rounded border border-[#222e3e]">
                  披露日期: {data.tradeDate}
                </span>
              )}
            </div>

            {data?.reason && (
              <p className="text-xs text-amber-300/90 mt-0.5 font-medium flex items-center gap-1">
                <span className="text-slate-400">上榜原因:</span> {data.reason}
              </p>
            )}
          </div>
        </div>

        {/* Refresh button & Switch Tabs */}
        <div className="flex items-center gap-2">
          {data?.hasDragonTiger && (
            <div className="flex items-center bg-[#10161f] p-1 rounded-md border border-[#222e3e]">
              <button
                onClick={() => setActiveTab('buyers')}
                className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'buyers'
                    ? 'bg-rose-900/40 text-rose-300 border border-rose-600/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>买五席位明细</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300">
                  {data.buySeats.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('sellers')}
                className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'sellers'
                    ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>卖五席位明细</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300">
                  {data.sellSeats.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('verdict')}
                className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'verdict'
                    ? 'bg-amber-900/40 text-amber-300 border border-amber-600/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>多空主力博弈解读</span>
              </button>
            </div>
          )}

          <button
            onClick={() => fetchDragonTiger(code)}
            disabled={loading}
            title="刷新龙虎榜席位数据"
            className="p-1.5 rounded bg-[#151d27] hover:bg-[#1f2b3a] text-slate-400 hover:text-white border border-[#232f3f] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d4a038]' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#d4a038]" />
          <span>正在精准穿透龙虎榜实时营业部席位与游资机构动向...</span>
        </div>
      ) : data?.hasDragonTiger ? (
        <div className="p-5 space-y-5">
          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#101620] border border-[#1e2938] rounded-lg p-3">
              <span className="text-[11px] text-slate-400 block mb-1">龙虎榜主力净买入</span>
              <span
                className={`text-base font-black font-mono tracking-tight ${
                  data.netBuyTotal >= 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatAmount(data.netBuyTotal)}
              </span>
            </div>

            <div className="bg-[#101620] border border-[#1e2938] rounded-lg p-3">
              <span className="text-[11px] text-slate-400 block mb-1">买五席位买入合计</span>
              <span className="text-base font-bold font-mono text-rose-400">
                {formatPureAmount(data.totalBuy5)}
              </span>
            </div>

            <div className="bg-[#101620] border border-[#1e2938] rounded-lg p-3">
              <span className="text-[11px] text-slate-400 block mb-1">卖五席位卖出合计</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {formatPureAmount(data.totalSell5)}
              </span>
            </div>

            <div className="bg-[#101620] border border-[#1e2938] rounded-lg p-3">
              <span className="text-[11px] text-purple-300/80 block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-purple-400" />
                机构专用席位净额
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  data.institutionNetTotal >= 0 ? 'text-purple-300' : 'text-emerald-400'
                }`}
              >
                {formatAmount(data.institutionNetTotal)}
              </span>
            </div>

            <div className="bg-[#101620] border border-[#1e2938] rounded-lg p-3">
              <span className="text-[11px] text-amber-300/80 block mb-1 flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                顶级游资净买入
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  data.hotMoneyNetTotal >= 0 ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {formatAmount(data.hotMoneyNetTotal)}
              </span>
            </div>

            <div className="bg-[#101620] border border-[#1e2938] rounded-lg p-3">
              <span className="text-[11px] text-cyan-300/80 block mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                北向外资净买入
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  data.northboundNetTotal >= 0 ? 'text-cyan-300' : 'text-emerald-400'
                }`}
              >
                {formatAmount(data.northboundNetTotal)}
              </span>
            </div>
          </div>

          {/* Tab 1: Buyers Details (买五席位明细) */}
          {activeTab === 'buyers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  买入金额最大的前五名营业部（买一 ~ 买五）
                </h4>
                <span className="text-[11px] text-slate-400">
                  点击席位卡片可查看游资操盘画像与投资风格
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {data.buySeats.map((seat) => {
                  const isSelected = selectedSeat?.rawDeptName === seat.rawDeptName;
                  return (
                    <div
                      key={seat.rank + seat.rawDeptName}
                      onClick={() => setSelectedSeat(seat)}
                      className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#161f2b] border-[#d4a038]/60 shadow-md'
                          : 'bg-[#10161f] border-[#1c2633] hover:border-slate-600 hover:bg-[#131b26]'
                      }`}
                    >
                      {/* Left: Rank + Department Name + Hot Money Tag */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getRankBadge(seat.rank, true)}
                          <span className="text-sm font-bold text-white truncate max-w-md">
                            {seat.seatName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] border font-semibold ${getSeatBadgeColor(
                              seat.seatType
                            )}`}
                          >
                            {seat.hotMoneyTag}
                          </span>
                          {seat.winRate30d > 0 && (
                            <span className="text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                              30日胜率: {seat.winRate30d}%
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {seat.hotMoneyDesc}
                        </p>
                      </div>

                      {/* Right: Numbers Grid (Buy, Sell, Net, Ratio) */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#1d2733]">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">买入金额</span>
                          <span className="text-sm font-bold font-mono text-rose-400">
                            {formatPureAmount(seat.buyAmount)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">卖出金额</span>
                          <span className="text-xs font-medium font-mono text-slate-300">
                            {formatPureAmount(seat.sellAmount)}
                          </span>
                        </div>

                        <div className="text-right min-w-[75px]">
                          <span className="text-[10px] text-slate-400 block">净买入额</span>
                          <span
                            className={`text-sm font-black font-mono ${
                              seat.netAmount >= 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatAmount(seat.netAmount)}
                          </span>
                        </div>

                        <div className="text-right min-w-[55px]">
                          <span className="text-[10px] text-slate-400 block">占总成交</span>
                          <span className="text-xs font-bold font-mono text-slate-200">
                            {seat.ratio.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Seat Detailed Dossier */}
              {selectedSeat && (
                <div className="p-4 rounded-lg bg-[#141c28] border border-[#d4a038]/30 space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#d4a038]">
                    <Award className="w-4 h-4" />
                    <span>【{selectedSeat.seatName}】席位操盘画像与历史风格</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedSeat.hotMoneyDesc}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>
                      营业部全称: <strong className="text-slate-200">{selectedSeat.rawDeptName}</strong>
                    </span>
                    <span>
                      席位性质: <strong className="text-amber-300">{selectedSeat.hotMoneyTag}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Sellers Details (卖五席位明细) */}
          {activeTab === 'sellers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  卖出金额最大的前五名营业部（卖一 ~ 卖五）
                </h4>
                <span className="text-[11px] text-slate-400">
                  出货席位分布，防范主力砸盘抛压
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {data.sellSeats.map((seat) => (
                  <div
                    key={seat.rank + seat.rawDeptName}
                    className="p-3.5 rounded-lg border bg-[#10161f] border-[#1c2633] flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Left: Rank + Department Name + Hot Money Tag */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRankBadge(seat.rank, false)}
                        <span className="text-sm font-bold text-white truncate max-w-md">
                          {seat.seatName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] border font-semibold ${getSeatBadgeColor(
                            seat.seatType
                          )}`}
                        >
                          {seat.hotMoneyTag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{seat.hotMoneyDesc}</p>
                    </div>

                    {/* Right: Numbers Grid (Sell, Buy, Net, Ratio) */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#1d2733]">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">卖出金额</span>
                        <span className="text-sm font-bold font-mono text-emerald-400">
                          {formatPureAmount(seat.sellAmount)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">买入金额</span>
                        <span className="text-xs font-medium font-mono text-slate-300">
                          {formatPureAmount(seat.buyAmount)}
                        </span>
                      </div>

                      <div className="text-right min-w-[75px]">
                        <span className="text-[10px] text-slate-400 block">净买入额</span>
                        <span
                          className={`text-sm font-black font-mono ${
                            seat.netAmount >= 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatAmount(seat.netAmount)}
                        </span>
                      </div>

                      <div className="text-right min-w-[55px]">
                        <span className="text-[10px] text-slate-400 block">占总成交</span>
                        <span className="text-xs font-bold font-mono text-slate-200">
                          {seat.ratio.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Verdict & Tactical Analysis (多空主力博弈解读) */}
          {activeTab === 'verdict' && data.verdictAnalysis && (
            <div className="p-4 rounded-lg bg-[#101722] border border-[#202c3c] space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  多空主力席位博弈综合研判与次日接力推演
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-md bg-[#131b26] border border-[#222f40]">
                  <span className="text-xs font-bold text-amber-300 block mb-1">
                    🔥 龙虎榜情绪定性
                  </span>
                  <p className="text-xs text-slate-200 font-semibold">
                    {data.verdictAnalysis.dragonTigerSentiment}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-[#131b26] border border-[#222f40]">
                  <span className="text-xs font-bold text-rose-300 block mb-1">
                    ⚡ 顶级游资买入动向
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {data.verdictAnalysis.hotMoneySummary}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-[#131b26] border border-[#222f40]">
                  <span className="text-xs font-bold text-purple-300 block mb-1">
                    🏛️ 机构专用席位动向
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {data.verdictAnalysis.institutionSummary}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-md bg-[#18212e] border border-[#d4a038]/30">
                <span className="text-xs font-bold text-[#d4a038] flex items-center gap-1 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  次日盘口与接力实战策略建议
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {data.verdictAnalysis.tacticalAdvice}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Zero-Failure Fallback: Stock is NOT on Dragon Tiger Board Today */
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-[#111721] p-4 rounded-lg border border-[#1e2938]">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-200">
                当前标的【{stockName || data?.name || code}】当日未达交易所龙虎榜异动披露标准
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {data?.notOnBoardReason ||
                  '沪深北交易所龙虎榜披露规则：仅披露日涨跌幅偏离值达±7%、日振幅达15%、日换手率达20%或连续3个交易日偏离值累计达20%等异动条件的标的。'}
              </p>
            </div>
          </div>

          {/* If Limit Up Stock, show live limit-up capital inference */}
          {data?.limitUpInference?.isLimitUp && (
            <div className="bg-[#121924] border border-amber-600/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Flame className="w-4 h-4 text-red-400" />
                <span>连板涨停盘口量化分析与主力封单推演</span>
                <span className="px-2 py-0.5 rounded bg-red-900/40 border border-red-600/40 text-red-300 text-[11px]">
                  {data.limitUpInference.boardText}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#161f2c] p-2.5 rounded border border-[#222e3e]">
                  <span className="text-slate-400 block text-[11px]">所属主线板块</span>
                  <span className="text-white font-bold">{data.limitUpInference.sector}</span>
                </div>
                <div className="bg-[#161f2c] p-2.5 rounded border border-[#222e3e]">
                  <span className="text-slate-400 block text-[11px]">封单金额</span>
                  <span className="text-rose-400 font-bold font-mono">
                    {formatPureAmount(data.limitUpInference.sealAmount)}
                  </span>
                </div>
                <div className="bg-[#161f2c] p-2.5 rounded border border-[#222e3e]">
                  <span className="text-slate-400 block text-[11px]">日成交额</span>
                  <span className="text-white font-bold font-mono">
                    {formatPureAmount(data.limitUpInference.turnover)}
                  </span>
                </div>
                <div className="bg-[#161f2c] p-2.5 rounded border border-[#222e3e]">
                  <span className="text-slate-400 block text-[11px]">连板梯队</span>
                  <span className="text-amber-300 font-bold font-mono">
                    第 {data.limitUpInference.consecutiveBoards} 阶梯
                  </span>
                </div>
              </div>

              {data.limitUpInference.reason && (
                <p className="text-xs text-slate-300 bg-[#161f2c] p-2.5 rounded border border-[#222e3e]">
                  <strong className="text-amber-300">涨停题材驱动: </strong>
                  {data.limitUpInference.reason}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
