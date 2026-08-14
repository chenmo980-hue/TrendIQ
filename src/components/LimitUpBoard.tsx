import React, { useState, useEffect, useMemo } from 'react';
import {
  LimitUpStock,
  SectorLimitUpGroup,
  DragonTigerSeat,
  LimitUpLadderSummary,
} from '../types';
import {
  Flame,
  TrendingUp,
  Layers,
  Award,
  Search,
  RotateCw,
  Zap,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface LimitUpBoardProps {
  onSelectStock: (code: string) => void;
}

type ActiveViewTab = 'ladder' | 'sectors' | 'dragonTiger';

export const LimitUpBoard: React.FC<LimitUpBoardProps> = ({ onSelectStock }) => {
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('ladder');
  const [summary, setSummary] = useState<LimitUpLadderSummary | null>(null);
  const [stocks, setStocks] = useState<LimitUpStock[]>([]);
  const [sectors, setSectors] = useState<SectorLimitUpGroup[]>([]);
  const [dragonTiger, setDragonTiger] = useState<DragonTigerSeat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filters
  const [selectedBoards, setSelectedBoards] = useState<number>(0); // 0 = all, 4 = >=4, 3 = 3, 2 = 2, 1 = 1
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto refresh timer
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number>(30);

  const fetchLimitUpData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const resp = await fetch('/api/limit-up-board');
      if (resp.ok) {
        const data = await resp.json();
        setSummary(data.summary || null);
        setStocks(data.stocks || []);
        setSectors(data.sectors || []);
        setDragonTiger(data.dragonTiger || []);
        const now = new Date();
        setLastUpdated(
          `${now.getHours().toString().padStart(2, '0')}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        );
      }
    } catch (err) {
      console.error('Failed to fetch limit-up data:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLimitUpData(true);
  }, []);

  // 30s auto polling
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchLimitUpData(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtered stocks list
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      // Board filter
      if (selectedBoards === 99 && s.consecutiveBoards < 2) return false;
      if (selectedBoards === 4 && s.consecutiveBoards < 4) return false;
      if (selectedBoards > 0 && selectedBoards < 4 && s.consecutiveBoards !== selectedBoards)
        return false;

      // Sector filter
      if (selectedSector !== 'all' && s.sector !== selectedSector) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = s.code.includes(q);
        const matchName = s.name.toLowerCase().includes(q);
        const matchSector = s.sector.toLowerCase().includes(q);
        const matchConcepts = s.subConcepts.some((c) => c.toLowerCase().includes(q));
        const matchReason = s.reason.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchSector && !matchConcepts && !matchReason) {
          return false;
        }
      }
      return true;
    });
  }, [stocks, selectedBoards, selectedSector, searchQuery]);

  // STRICT REQUIREMENT: Only sectors with 2 or more (>= 2) limit-up/consecutive board companies
  const validSectors = useMemo(() => {
    return (sectors || [])
      .filter((s) => (s.stocks?.length ?? 0) >= 2 || (s.limitUpCount ?? 0) >= 2)
      .map((s) => ({
        ...s,
        limitUpCount: Math.max(s.stocks?.length ?? 0, s.limitUpCount ?? 0),
      }));
  }, [sectors]);

  // Group stocks by consecutive board count for Ladder view
  const ladderGroups = useMemo(() => {
    const map = new Map<number, LimitUpStock[]>();
    // Sort stocks descending by consecutiveBoards, then by sealAmount
    const sorted = [...filteredStocks].sort((a, b) => {
      if (b.consecutiveBoards !== a.consecutiveBoards) {
        return b.consecutiveBoards - a.consecutiveBoards;
      }
      return b.sealAmount - a.sealAmount;
    });

    for (const stock of sorted) {
      const b = stock.consecutiveBoards >= 4 ? 4 : stock.consecutiveBoards;
      const list = map.get(b) || [];
      list.push(stock);
      map.set(b, list);
    }
    return map;
  }, [filteredStocks]);

  // Helper formatting numbers in Chinese financial style
  const formatMoney = (num: number) => {
    if (!num) return '0';
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(2)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(0)}万`;
    }
    return num.toLocaleString();
  };

  const getBoardBadgeColor = (boards: number) => {
    if (boards >= 7) {
      return 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white border-amber-400/50 shadow-red-500/20';
    }
    if (boards >= 5) {
      return 'bg-red-600 text-white border-red-400 shadow-red-500/10';
    }
    if (boards >= 4) {
      return 'bg-red-700 text-rose-100 border-red-500';
    }
    if (boards === 3) {
      return 'bg-orange-600 text-white border-orange-400';
    }
    if (boards === 2) {
      return 'bg-amber-600 text-white border-amber-400';
    }
    return 'bg-[#1e293b] text-blue-300 border-blue-500/40';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070a0e] text-slate-100 overflow-y-auto custom-scrollbar">
      {/* 1. Market Sentiment & Limit-Up Dashboard Banner */}
      <div className="p-5 border-b border-[#18202c] bg-[#0c1118]">
        <div className="max-w-7xl mx-auto">
          {/* Header title & Auto-refresh status */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-amber-500/10 border border-red-500/30 text-red-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    短线连板龙虎榜
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                    A股连板天梯 & 题材主线
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  全市场连板高度梯队 · 核心题材主线板块 · 机构游资席位动向
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-[#070a0e] px-3 py-1.5 rounded border border-[#1e293b]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>更新时间: {lastUpdated || '加载中...'}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">
                  {autoRefreshCountdown}s 后刷新
                </span>
              </div>
              <button
                onClick={() => fetchLimitUpData(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e293b] hover:bg-[#283548] text-slate-200 text-xs font-medium transition cursor-pointer border border-slate-700/60"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>手动刷新</span>
              </button>
            </div>
          </div>

          {/* Key Sentiment Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. 情绪阶段 */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-[#121824] rounded-lg p-3 border border-[#232f42] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  短线情绪周期
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {summary?.sentimentScore || 88} 分
                </span>
              </div>
              <div className="text-sm font-bold text-amber-300 truncate">
                {summary?.sentimentPhase || '主升共振发酵期 🔥'}
              </div>
              <div className="mt-2 w-full bg-[#080d14] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full"
                  style={{ width: `${summary?.sentimentScore || 88}%` }}
                ></div>
              </div>
            </div>

            {/* 2. 封板率 */}
            <div className="bg-[#121824] rounded-lg p-3 border border-[#232f42]">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>封板成功率</span>
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {summary?.sealSuccessRate || 86.0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                炸板: {summary?.brokenCount || 7} 家
              </div>
            </div>

            {/* 3. 涨停家数 */}
            <div className="bg-[#121824] rounded-lg p-3 border border-[#232f42]">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>涨停总数</span>
                <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-lg font-bold font-mono text-red-400">
                {summary?.totalLimitUp || stocks.length || 43} 家
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                跌停: {summary?.totalLimitDown || 2} 家
              </div>
            </div>

            {/* 4. 昨日连板今日溢价 */}
            <div className="bg-[#121824] rounded-lg p-3 border border-[#232f42]">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>昨连板溢价</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold font-mono text-red-400">
                +{summary?.yesterdayPremium || 4.85}%
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">赚钱效应活跃</div>
            </div>

            {/* 5. 空间高度板 */}
            <div className="bg-[#121824] rounded-lg p-3 border border-red-500/30 bg-gradient-to-br from-[#181318] to-[#121824]">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>最高空间板</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-300">
                {summary?.maxConsecutiveBoards || 5} 连板
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {summary?.topDragonStock || (stocks[0] ? `${stocks[0].name} (${stocks[0].sector})` : '空间领涨龙头')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Tabs & Filter Bar */}
      <div className="px-5 py-3 border-b border-[#18202c] bg-[#090d13] sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Main View Switcher Tabs */}
          <div className="flex items-center bg-[#101622] p-1 rounded-lg border border-[#1e293b]">
            <button
              onClick={() => setActiveTab('ladder')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'ladder'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>连板天梯梯队 ({stocks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sectors')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'sectors'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>板块连板题材 ({validSectors.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dragonTiger')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dragonTiger'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>龙虎榜游资机构 ({dragonTiger.length})</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Consecutive boards filter pills */}
            {activeTab === 'ladder' && (
              <div className="flex items-center bg-[#101622] p-0.5 rounded-md border border-[#1e293b] text-xs">
                {[
                  { label: `全部 (${stocks.length})`, val: 0 },
                  { label: `🔥 连板股 (${stocks.filter((s) => s.consecutiveBoards >= 2).length})`, val: 99 },
                  { label: `高标≥4板 (${stocks.filter((s) => s.consecutiveBoards >= 4).length})`, val: 4 },
                  { label: `3板 (${stocks.filter((s) => s.consecutiveBoards === 3).length})`, val: 3 },
                  { label: `2板 (${stocks.filter((s) => s.consecutiveBoards === 2).length})`, val: 2 },
                  { label: `首板 (${stocks.filter((s) => s.consecutiveBoards === 1).length})`, val: 1 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedBoards(item.val)}
                    className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                      selectedBoards === item.val
                        ? 'bg-[#1e293b] text-amber-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sector Selector */}
            <div className="flex items-center gap-1.5 bg-[#101622] px-2.5 py-1 rounded-md border border-[#1e293b] text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-[#101622] text-slate-200">
                  全部板块题材
                </option>
                {sectors.map((sec) => (
                  <option
                    key={sec.sectorName}
                    value={sec.sectorName}
                    className="bg-[#101622] text-slate-200"
                  >
                    {sec.sectorName} ({sec.limitUpCount}家)
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索股票 / 代码 / 题材..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 sm:w-56 bg-[#101622] border border-[#1e293b] rounded-md px-2.5 py-1 pl-7 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tab Contents */}
      <div className="p-5 flex-1">
        <div className="max-w-7xl mx-auto">
          {/* ================= TAB 1: 连板天梯梯队 (Ladder View) ================= */}
          {activeTab === 'ladder' && (
            <div className="space-y-6">
              {/* If no results found */}
              {filteredStocks.length === 0 && (
                <div className="p-12 text-center text-slate-500 bg-[#0c1118] rounded-xl border border-[#18202c]">
                  未找到符合筛选条件的连板股票
                </div>
              )}

              {/* Render Ladder Levels */}
              {[4, 3, 2, 1].map((level) => {
                const groupStocks = ladderGroups.get(level) || [];
                if (groupStocks.length === 0) return null;

                const levelTitle =
                  level === 4
                    ? '🏆 高标空间梯队 (≥4连板 龙头总决选)'
                    : level === 3
                    ? '🔥 3连板 强势加速梯队 (中位晋级)'
                    : level === 2
                    ? '⚡ 2连板 题材发酵梯队 (强弱分化)'
                    : '🌱 1板 首板先锋挖掘 (新催化启动)';

                return (
                  <div key={level} className="space-y-3">
                    {/* Level Section Header */}
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            level === 4
                              ? 'bg-red-500 animate-ping'
                              : level === 3
                              ? 'bg-orange-500'
                              : level === 2
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        ></span>
                        <h3 className="text-sm font-bold text-slate-200 tracking-wide">
                          {levelTitle}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-[#121824] px-2 py-0.5 rounded border border-[#1e293b]">
                        共 {groupStocks.length} 家
                      </span>
                    </div>

                    {/* Stock Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {groupStocks.map((stock) => (
                        <div
                          key={stock.code}
                          onClick={() => onSelectStock(stock.code)}
                          className="bg-[#0e141d] hover:bg-[#141d2a] border border-[#1d2737] hover:border-amber-500/50 rounded-xl p-4 transition-all duration-150 cursor-pointer group shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top: Stock Name, Code, Board Badge, Price & Change */}
                            <div className="flex items-start justify-between gap-2 mb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition flex items-center gap-1.5">
                                    {stock.name}
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition" />
                                  </h4>
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${getBoardBadgeColor(
                                      stock.consecutiveBoards
                                    )}`}
                                  >
                                    {stock.boardText}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                                  <span>{stock.code}</span>
                                  <span>·</span>
                                  <span className="text-slate-300 font-medium bg-[#16202e] px-1.5 py-0.2 rounded">
                                    {stock.sector}
                                  </span>
                                </div>
                              </div>

                              {/* Price & Change% */}
                              <div className="text-right">
                                <div className="text-base font-bold font-mono text-red-400">
                                  ¥{stock.price.toFixed(2)}
                                </div>
                                <div className="text-xs font-bold font-mono text-red-500">
                                  +{stock.changePercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>

                            {/* Sub concepts chips */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {stock.subConcepts.map((concept, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#16202e] text-slate-300 border border-slate-700/50"
                                >
                                  {concept}
                                </span>
                              ))}
                            </div>

                            {/* Limit-Up Details Grid */}
                            <div className="grid grid-cols-3 gap-2 bg-[#090d14] rounded-lg p-2.5 mb-3 border border-[#16202e] text-xs font-mono">
                              <div>
                                <div className="text-[10px] text-slate-500">封单金额</div>
                                <div className="text-amber-300 font-semibold truncate">
                                  {formatMoney(stock.sealAmount)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">换手率</div>
                                <div className="text-slate-300 font-semibold">
                                  {stock.turnoverRate.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">首次封板</div>
                                <div className="text-slate-300 font-semibold truncate">
                                  {stock.firstTime}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">成交额</div>
                                <div className="text-slate-300 truncate">
                                  {formatMoney(stock.turnover)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">流通市值</div>
                                <div className="text-slate-300 truncate">
                                  {formatMoney(stock.marketCap)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">开板状态</div>
                                <div
                                  className={`text-[11px] font-sans font-medium ${
                                    stock.isBroken ? 'text-amber-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {stock.isBroken ? `烂板 (${stock.openCount}次)` : '一封到底'}
                                </div>
                              </div>
                            </div>

                            {/* Limit-up logic reason */}
                            <div className="text-xs text-slate-300 bg-[#121924]/60 p-2 rounded border border-[#1a2536] line-clamp-2 leading-relaxed">
                              <span className="text-amber-400 font-medium">驱动逻辑: </span>
                              {stock.reason}
                            </div>
                          </div>

                          {/* Card Footer: Dragon Tiger seats & action hint */}
                          <div className="mt-3 pt-2.5 border-t border-[#182230] flex items-center justify-between text-xs text-slate-400">
                            <span className="text-[11px] truncate max-w-[200px] text-slate-400">
                              席位: {stock.dragonTigerType || '游资合力抢筹'}
                            </span>
                            <span className="text-amber-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition text-[11px]">
                              <span>图表研判</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= TAB 2: 板块连板题材 (Sector Matrix) ================= */}
          {activeTab === 'sectors' && (
            <div className="space-y-4">
              {/* Filter Notice Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-amber-500/20 px-4 py-2.5 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="font-semibold text-amber-400">板块连板聚焦机制：</span>
                  <span className="text-slate-400">
                    已自动过滤 0~1 家零散标的，当前仅展示 <span className="text-white font-bold font-mono">{validSectors.length}</span> 个拥有 <span className="text-amber-300 font-bold">2家及以上</span> 涨停/连板个股的主线共振板块
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  共振主线共计 <span className="text-red-400 font-bold">{validSectors.reduce((acc, s) => acc + s.limitUpCount, 0)}</span> 只核心涨停标的
                </div>
              </div>

              {validSectors.length === 0 ? (
                <div className="bg-[#0e141d] border border-[#1e293b] rounded-xl p-12 text-center">
                  <div className="text-3xl mb-3">🔍</div>
                  <div className="text-sm font-bold text-slate-300">暂无 2 家及以上连板的共振板块</div>
                  <div className="text-xs text-slate-500 mt-1">当前市场个股处于分散轮动阶段，未形成2家以上涨停抱团的主线题材</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {validSectors.map((sec) => (
                    <div
                      key={sec.sectorName}
                      className="bg-[#0e141d] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-4 hover:border-[#2a384e] transition"
                    >
                      {/* Sector Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-[#182230] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white tracking-wide">
                              {sec.sectorName}
                            </h3>
                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                              +{sec.sectorChangePercent.toFixed(2)}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {sec.catalyst}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs text-slate-500">板块连板/涨停</div>
                          <div className="text-lg font-bold font-mono text-amber-400">
                            {sec.limitUpCount} <span className="text-xs font-normal">家</span>
                          </div>
                        </div>
                      </div>

                      {/* Sector Leader Highlight */}
                      <div className="bg-[#121924] rounded-lg p-3 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded bg-amber-500/20 text-amber-400 text-xs">
                            👑
                          </span>
                          <div>
                            <div className="text-xs text-slate-400">板块龙头领涨股</div>
                            <div className="text-sm font-bold text-amber-300">
                              {sec.leaderStock.name}{' '}
                              <span className="font-mono text-xs text-slate-400 font-normal">
                                ({sec.leaderStock.code})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getBoardBadgeColor(
                              sec.leaderStock.consecutiveBoards
                            )}`}
                          >
                            {sec.leaderStock.boardText}
                          </span>
                          <button
                            onClick={() => onSelectStock(sec.leaderStock.code)}
                            className="px-2.5 py-1 bg-[#1e293b] hover:bg-amber-600 text-white rounded text-xs font-medium transition cursor-pointer"
                          >
                            分析龙头
                          </button>
                        </div>
                      </div>

                      {/* Sector Stocks Chips List */}
                      <div>
                        <div className="text-xs text-slate-400 mb-2 font-medium flex items-center justify-between">
                          <span>板块内共振涨停股票池 ({sec.stocks.length}家):</span>
                          <span className="text-[11px] text-slate-500">点击卡片切换个股</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sec.stocks.map((stk) => (
                            <div
                              key={stk.code}
                              onClick={() => onSelectStock(stk.code)}
                              className="bg-[#090d14] hover:bg-[#16202e] border border-[#182230] hover:border-amber-500/50 rounded-lg p-2.5 transition cursor-pointer flex items-center justify-between group"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">
                                    {stk.name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${getBoardBadgeColor(
                                      stk.consecutiveBoards
                                    )}`}
                                  >
                                    {stk.boardText}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {stk.code} · 封单 {formatMoney(stk.sealAmount)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold font-mono text-red-400">
                                  ¥{stk.price.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-red-500 font-mono">
                                  +{stk.changePercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: 龙虎榜游资机构 (Dragon & Tiger Seats) ================= */}
          {activeTab === 'dragonTiger' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dragonTiger.map((seat, sIdx) => (
                  <div
                    key={sIdx}
                    className="bg-[#0e141d] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-4"
                  >
                    {/* Seat Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#182230] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              seat.seatType === 'institution'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {seat.seatType === 'institution' ? '机构席位' : '顶级游资'}
                          </span>
                          <h3 className="text-base font-bold text-white">
                            {seat.seatName}
                          </h3>
                        </div>
                        {seat.winRate30d && (
                          <div className="text-xs text-slate-400 mt-1">
                            近30日跟风胜率: <span className="font-mono text-emerald-400 font-bold">{seat.winRate30d}%</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-500">今日上榜净买额</div>
                        <div className="text-base font-bold font-mono text-red-400">
                          {((seat.netBuyTotal ?? seat.netBuyAmount ?? 0) >= 0 ? '+' : '') +
                            formatMoney(seat.netBuyTotal ?? seat.netBuyAmount ?? 0)}
                        </div>
                      </div>
                    </div>

                    {/* Traded Stocks Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-500 border-b border-[#182230]">
                            <th className="pb-2 font-medium">标的</th>
                            <th className="pb-2 font-medium">连板高度</th>
                            <th className="pb-2 font-medium text-right">买入/成交额</th>
                            <th className="pb-2 font-medium text-right">净买额</th>
                            <th className="pb-2 font-medium text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#182230]">
                          {(seat.stocksTraded && seat.stocksTraded.length > 0
                            ? seat.stocksTraded
                            : seat.code
                            ? [
                                {
                                  code: seat.code,
                                  name: seat.name || `标的${seat.code}`,
                                  buyAmount: seat.totalAmount || seat.netBuyAmount || 0,
                                  sellAmount: 0,
                                  netAmount: seat.netBuyAmount || 0,
                                  consecutiveBoards: seat.consecutiveBoards || 1,
                                  boardText: seat.boardText || '上榜',
                                },
                              ]
                            : []
                          ).map((stk) => (
                            <tr key={stk.code} className="hover:bg-[#121924]">
                              <td className="py-2.5">
                                <div className="font-bold text-slate-200">
                                  {stk.name}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500">
                                  {stk.code}
                                </div>
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getBoardBadgeColor(
                                    stk.consecutiveBoards
                                  )}`}
                                >
                                  {stk.boardText}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono text-slate-300">
                                {formatMoney(stk.buyAmount)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-red-400">
                                +{formatMoney(stk.netAmount)}
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() => onSelectStock(stk.code)}
                                  className="px-2 py-1 bg-[#1e293b] hover:bg-amber-600 text-white rounded text-[11px] transition cursor-pointer"
                                >
                                  研判
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
