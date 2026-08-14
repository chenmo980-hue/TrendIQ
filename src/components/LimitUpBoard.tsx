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
  UserCheck,
  Building2,
  Globe2,
  TrendingDown,
  Info,
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
  const [selectedBoards, setSelectedBoards] = useState<number>(0); // 0 = all, 99 = >=2, 4 = >=4, 3 = 3, 2 = 2, 1 = 1
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dragonTigerFilter, setDragonTigerFilter] = useState<'all' | 'institution' | 'hot_money' | 'northbound'>('all');

  // Auto refresh timer
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number>(30);

  const fetchLimitUpData = async (showLoading = true) => {
    if (showLoading && stocks.length === 0) setIsLoading(true);
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
      setIsLoading(false);
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
      if (selectedBoards >= 5 && s.consecutiveBoards < selectedBoards) return false;
      if (selectedBoards > 0 && selectedBoards < 5 && s.consecutiveBoards !== selectedBoards)
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

  // Filtered Dragon Tiger list
  const filteredDragonTiger = useMemo(() => {
    return dragonTiger.filter((seat) => {
      if (dragonTigerFilter !== 'all' && seat.seatType !== dragonTigerFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (seat.seatName || '').toLowerCase().includes(q);
        const matchDept = (seat.rawDeptName || '').toLowerCase().includes(q);
        const matchTag = (seat.hotMoneyTag || '').toLowerCase().includes(q);
        const matchStock = (seat.stocksTraded || []).some(
          (stk) => stk.name.toLowerCase().includes(q) || stk.code.includes(q)
        );
        if (!matchName && !matchDept && !matchTag && !matchStock) return false;
      }
      return true;
    });
  }, [dragonTiger, dragonTigerFilter, searchQuery]);

  // Distinct ladder levels present in filtered stocks
  const distinctBoardLevels = useMemo(() => {
    const levels = new Set<number>();
    for (const stock of filteredStocks) {
      levels.add(stock.consecutiveBoards);
    }
    return Array.from(levels).sort((a, b) => b - a);
  }, [filteredStocks]);

  // Group stocks by exact consecutive board count for Ladder view
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
      const b = stock.consecutiveBoards;
      const list = map.get(b) || [];
      list.push(stock);
      map.set(b, list);
    }
    return map;
  }, [filteredStocks]);

  // Helper formatting numbers in Chinese financial style
  const formatMoney = (num: number) => {
    if (!num) return '0';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 100000000) {
      return `${sign}${(abs / 100000000).toFixed(2)}亿`;
    }
    if (abs >= 10000) {
      return `${sign}${(abs / 10000).toFixed(0)}万`;
    }
    return `${sign}${abs.toLocaleString()}`;
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
                    A股连板天梯 · 主线题材 · 机构游资席位
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  连板高度天梯梯队 · 核心题材主线板块 · 顶级游资与机构真实上榜画像
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-[#070a0e] px-3 py-1.5 rounded border border-[#1e293b]">
                <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></span>
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
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
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
                <span>涨停封板率</span>
                <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-lg font-bold font-mono text-red-400">
                {summary?.sealSuccessRate || 92.5}%
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                日内炸板 {summary?.brokenCount || 4} 家
              </div>
            </div>

            {/* 3. 涨停数量 */}
            <div className="bg-[#121824] rounded-lg p-3 border border-[#232f42]">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>涨停家数</span>
                <Flame className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {summary?.totalLimitUp || stocks.length} 家
              </div>
              <div className="text-[11px] text-emerald-400 truncate mt-0.5">
                跌停仅 {summary?.totalLimitDown || 2} 家
              </div>
            </div>

            {/* 4. 昨日溢价率 */}
            <div className="bg-[#121824] rounded-lg p-3 border border-[#232f42]">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>昨日连板溢价</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold font-mono text-red-400">
                +{summary?.yesterdayPremium || 4.2}%
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                隔夜开盘赚钱效应好
              </div>
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
            {/* Consecutive boards filter pills for Ladder */}
            {activeTab === 'ladder' && (
              <div className="flex items-center bg-[#101622] p-0.5 rounded-md border border-[#1e293b] text-xs overflow-x-auto">
                {[
                  { label: `全部 (${stocks.length})`, val: 0 },
                  { label: `🔥 连板股 (${stocks.filter((s) => s.consecutiveBoards >= 2).length})`, val: 99 },
                  { label: `高标≥5板 (${stocks.filter((s) => s.consecutiveBoards >= 5).length})`, val: 5 },
                  { label: `4板 (${stocks.filter((s) => s.consecutiveBoards === 4).length})`, val: 4 },
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

            {/* Dragon Tiger Seat Type filter pills */}
            {activeTab === 'dragonTiger' && (
              <div className="flex items-center bg-[#101622] p-0.5 rounded-md border border-[#1e293b] text-xs">
                {[
                  { label: `全部席位 (${dragonTiger.length})`, val: 'all' },
                  { label: `🏛️ 机构专用 (${dragonTiger.filter((s) => s.seatType === 'institution').length})`, val: 'institution' },
                  { label: `⚡ 顶级游资 (${dragonTiger.filter((s) => s.seatType === 'hot_money').length})`, val: 'hot_money' },
                  { label: `🌐 北向外资 (${dragonTiger.filter((s) => s.seatType === 'northbound').length})`, val: 'northbound' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setDragonTigerFilter(item.val as any)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                      dragonTigerFilter === item.val
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
            {activeTab !== 'dragonTiger' && (
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
                  {validSectors.map((sec) => (
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
            )}

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder={activeTab === 'dragonTiger' ? '搜索游资大师 / 营业部 / 标的...' : '搜索股票 / 代码 / 题材...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 bg-[#101622] border border-[#1e293b] rounded-md px-2.5 py-1 pl-7 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tab Contents */}
      <div className="p-5 flex-1">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton loading overlay when initial data is loading */}
          {isLoading && stocks.length === 0 ? (
            <div className="space-y-6 animate-pulse">
              <div className="flex items-center justify-center p-12 bg-[#0c1118] border border-[#18202c] rounded-xl text-center">
                <div className="space-y-3">
                  <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div className="text-sm font-semibold text-white">
                    正在实时同步 A 股全市场连板天梯与龙虎榜席位数据...
                  </div>
                  <div className="text-xs text-slate-500">
                    智能解析连板高度梯队 · 筛选主线连板板块 · 深度穿透游资与机构交易画像
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-44 bg-[#0e141d] border border-[#1e293b] rounded-xl p-4"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* ================= TAB 1: 连板天梯梯队 (Ladder View) ================= */}
              {activeTab === 'ladder' && (
                <div className="space-y-6">
                  {/* If no results found */}
                  {filteredStocks.length === 0 && (
                    <div className="p-12 text-center text-slate-500 bg-[#0c1118] rounded-xl border border-[#18202c]">
                      未找到符合筛选条件的连板股票
                    </div>
                  )}

                  {/* Render Ladder Levels Dynamically */}
                  {distinctBoardLevels.map((level) => {
                    const groupStocks = ladderGroups.get(level) || [];
                    if (groupStocks.length === 0) return null;

                    const levelTitle =
                      level >= 5
                        ? `👑 ${level}连板 · 空间高度总龙 (全市场空间标杆)`
                        : level === 4
                        ? '🏆 4连板 · 高标龙头梯队 (核心主升突破)'
                        : level === 3
                        ? '🔥 3连板 · 强势加速梯队 (中位晋级加速)'
                        : level === 2
                        ? '⚡ 2连板 · 题材接力梯队 (强弱分化确认)'
                        : '🌱 1板 · 首板先锋挖掘 (日内新催化启动)';

                    return (
                      <div key={level} className="space-y-3">
                        {/* Level Section Header */}
                        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                level >= 5
                                  ? 'bg-red-500 animate-ping'
                                  : level === 4
                                  ? 'bg-rose-500'
                                  : level === 3
                                  ? 'bg-orange-500'
                                  : level === 2
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            ></span>
                            <h3 className="text-base font-bold text-white tracking-wide">
                              {levelTitle}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#182230] text-slate-300 font-mono">
                              共 {groupStocks.length} 家
                            </span>
                          </div>
                        </div>

                        {/* Stocks Grid for this level */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupStocks.map((stock) => (
                            <div
                              key={stock.code}
                              className={`bg-[#0e141d] border rounded-xl p-4 transition-all duration-200 hover:border-[#d4a038]/60 hover:shadow-lg hover:shadow-black/40 flex flex-col justify-between space-y-3 relative group ${
                                stock.consecutiveBoards >= 5
                                  ? 'border-red-500/60 bg-gradient-to-br from-[#221016] via-[#140e15] to-[#0e141d] shadow-md shadow-red-950/40'
                                  : stock.consecutiveBoards === 4
                                  ? 'border-rose-500/40 bg-gradient-to-br from-[#181115] to-[#0e141d]'
                                  : stock.consecutiveBoards === 3
                                  ? 'border-orange-500/30'
                                  : stock.consecutiveBoards === 2
                                  ? 'border-amber-500/30'
                                  : 'border-[#1e293b]'
                              }`}
                            >
                              {/* Top Bar: Stock Name, Code, Board Badge, Price */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                                      {stock.name}
                                    </h4>
                                    <span className="text-xs font-mono text-slate-400">
                                      {stock.code}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${getBoardBadgeColor(
                                        stock.consecutiveBoards
                                      )}`}
                                    >
                                      {stock.boardText}
                                    </span>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#182230] text-slate-300">
                                      {stock.sector}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-base font-bold font-mono text-red-400">
                                    ¥{stock.price.toFixed(2)}
                                  </div>
                                  <div className="text-xs font-mono font-semibold text-red-500">
                                    +{stock.changePercent.toFixed(2)}%
                                  </div>
                                </div>
                              </div>

                              {/* Middle: Turnover, Seal Amount, Turnover Rate */}
                              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#080c12] rounded-lg border border-[#141b25] text-xs">
                                <div>
                                  <div className="text-[10px] text-slate-500">封单金额</div>
                                  <div className="font-mono font-semibold text-amber-300">
                                    {formatMoney(stock.sealAmount)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-500">今日成交</div>
                                  <div className="font-mono font-semibold text-slate-200">
                                    {formatMoney(stock.turnover)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-500">换手率</div>
                                  <div className="font-mono font-semibold text-slate-200">
                                    {stock.turnoverRate.toFixed(2)}%
                                  </div>
                                </div>
                              </div>

                              {/* Reason Catalyst Text */}
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                <span className="text-amber-400/90 font-medium">【题材催化】</span>
                                {stock.reason}
                              </p>

                              {/* Action Footer */}
                              <div className="flex items-center justify-between pt-1 border-t border-[#182230]">
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {stock.dragonTigerType || '游资深度参与'}
                                </span>
                                <button
                                  onClick={() => onSelectStock(stock.code)}
                                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
                                >
                                  <span>量化研判</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================= TAB 2: 板块连板题材 (Sector Limit Up Groups) ================= */}
              {activeTab === 'sectors' && (
                <div className="space-y-6">
                  {validSectors.length === 0 && (
                    <div className="p-12 text-center text-slate-500 bg-[#0c1118] rounded-xl border border-[#18202c]">
                      暂无 ≥2 家连板/涨停公司的主线板块数据
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {validSectors.map((sector, idx) => (
                      <div
                        key={sector.sectorId || sector.sectorName || idx}
                        className="bg-[#0e141d] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-4 hover:border-amber-500/40 transition"
                      >
                        {/* Sector Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-[#182230] pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                              <h3 className="text-lg font-bold text-white">
                                {sector.sectorName}
                              </h3>
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                                {sector.limitUpCount} 家涨停/连板
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {sector.catalyst || '板块日内多股涨停，资金聚集形成主线效应。'}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs text-slate-500">板块涨幅</div>
                            <div
                              className={`text-base font-bold font-mono ${
                                sector.sectorChangePercent >= 0 ? 'text-red-400' : 'text-emerald-400'
                              }`}
                            >
                              {sector.sectorChangePercent >= 0 ? '+' : ''}
                              {sector.sectorChangePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* Leader Stock Spotlight */}
                        {sector.leaderStock && (
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-950/30 to-[#101722] rounded-lg border border-red-500/20">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                板块空间龙头
                              </span>
                              <span className="text-sm font-bold text-white">
                                {sector.leaderStock.name}
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                {sector.leaderStock.code}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${getBoardBadgeColor(
                                  sector.leaderStock.consecutiveBoards
                                )}`}
                              >
                                {sector.leaderStock.boardText}
                              </span>
                            </div>

                            <button
                              onClick={() => onSelectStock(sector.leaderStock.code)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black rounded text-xs font-semibold transition cursor-pointer"
                            >
                              查看龙头
                            </button>
                          </div>
                        )}

                        {/* Stocks in this sector */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                            <span>板块涨停梯队标的</span>
                            <span className="font-mono text-slate-500">
                              共 {sector.stocks?.length || sector.limitUpCount} 标的
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(sector.stocks || []).map((stk) => (
                              <div
                                key={stk.code}
                                onClick={() => onSelectStock(stk.code)}
                                className="flex items-center justify-between p-2.5 bg-[#080d14] hover:bg-[#131b26] border border-[#141b25] hover:border-slate-700 rounded-lg cursor-pointer transition group"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-200 group-hover:text-amber-400 transition">
                                      {stk.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {stk.code}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span
                                      className={`text-[9px] font-bold px-1 py-0.2 rounded ${getBoardBadgeColor(
                                        stk.consecutiveBoards
                                      )}`}
                                    >
                                      {stk.boardText}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      封单 {formatMoney(stk.sealAmount)}
                                    </span>
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
                </div>
              )}

              {/* ================= TAB 3: 龙虎榜游资机构 (Dragon & Tiger Seats) ================= */}
              {activeTab === 'dragonTiger' && (
                <div className="space-y-6">
                  {filteredDragonTiger.length === 0 && (
                    <div className="p-12 text-center text-slate-500 bg-[#0c1118] rounded-xl border border-[#18202c]">
                      暂无符合条件的龙虎榜席位数据
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredDragonTiger.map((seat, sIdx) => {
                      const isInst = seat.seatType === 'institution';
                      const isNorth = seat.seatType === 'northbound';

                      return (
                        <div
                          key={sIdx}
                          className={`bg-[#0e141d] border rounded-xl p-5 shadow-sm space-y-4 hover:border-[#d4a038]/60 transition ${
                            isInst
                              ? 'border-purple-500/30 bg-gradient-to-br from-[#120f1c] to-[#0e141d]'
                              : isNorth
                              ? 'border-cyan-500/30 bg-gradient-to-br from-[#0c161d] to-[#0e141d]'
                              : 'border-[#1e293b] bg-gradient-to-br from-[#16120e] to-[#0e141d]'
                          }`}
                        >
                          {/* Seat Header with Mastermind Name, Tag, Description */}
                          <div className="flex items-start justify-between gap-3 border-b border-[#182230] pb-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Type Badge */}
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                                    isInst
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                      : isNorth
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  {isInst ? (
                                    <>
                                      <Building2 className="w-3 h-3" />
                                      <span>机构专用席位</span>
                                    </>
                                  ) : isNorth ? (
                                    <>
                                      <Globe2 className="w-3 h-3" />
                                      <span>北向外资通道</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3" />
                                      <span>顶级知名游资</span>
                                    </>
                                  )}
                                </span>

                                {/* Mastermind Person/Group Tag */}
                                {seat.hotMoneyTag && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-[#182230] text-amber-300 font-bold border border-amber-500/30">
                                    {seat.hotMoneyTag}
                                  </span>
                                )}
                              </div>

                              {/* Prominent Full Seat & Master Name */}
                              <h3 className="text-base font-bold text-white tracking-wide leading-snug">
                                {seat.seatName}
                              </h3>

                              {/* Master Trader Style Description */}
                              {seat.description && (
                                <p className="text-xs text-slate-400 leading-relaxed">
                                  {seat.description}
                                </p>
                              )}

                              {/* Win rate indicator */}
                              {seat.winRate30d && (
                                <div className="text-xs text-slate-400 pt-0.5 flex items-center gap-2">
                                  <span>近30日跟风胜率:</span>
                                  <span className="font-mono text-emerald-400 font-bold">
                                    {seat.winRate30d}%
                                  </span>
                                  <span className="text-slate-600">|</span>
                                  <span>上榜标的数:</span>
                                  <span className="font-mono text-slate-200 font-bold">
                                    {seat.stocksTraded?.length || 1} 只
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Total Buy / Net Amount */}
                            <div className="text-right shrink-0 bg-[#080d14] px-3 py-2 rounded-lg border border-[#141b25]">
                              <div className="text-[11px] text-slate-500">今日上榜买入总额</div>
                              <div className="text-base font-bold font-mono text-red-400">
                                {formatMoney(seat.totalBuy || seat.netBuyTotal || 0)}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                净买入:{' '}
                                <span
                                  className={
                                    (seat.netBuyTotal || 0) >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'
                                  }
                                >
                                  {formatMoney(seat.netBuyTotal || 0)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Traded Stocks Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-slate-500 border-b border-[#182230]">
                                  <th className="pb-2 font-medium">重仓标的</th>
                                  <th className="pb-2 font-medium">连板状态</th>
                                  <th className="pb-2 font-medium text-right">买入金额</th>
                                  <th className="pb-2 font-medium text-right">净买额</th>
                                  <th className="pb-2 font-medium text-center">量化研判</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#182230]">
                                {(seat.stocksTraded || []).map((stk) => (
                                  <tr key={stk.code} className="hover:bg-[#121924] transition">
                                    <td className="py-2.5">
                                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                        <span>{stk.name}</span>
                                        {stk.changePercent !== undefined && (
                                          <span
                                            className={`text-[10px] font-mono font-semibold ${
                                              stk.changePercent >= 0 ? 'text-red-400' : 'text-emerald-400'
                                            }`}
                                          >
                                            {stk.changePercent >= 0 ? '+' : ''}
                                            {stk.changePercent.toFixed(2)}%
                                          </span>
                                        )}
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
                                    <td className="py-2.5 text-right font-mono text-slate-300 font-medium">
                                      {formatMoney(stk.buyAmount)}
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-bold">
                                      <span className={stk.netAmount >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                                        {formatMoney(stk.netAmount)}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <button
                                        onClick={() => onSelectStock(stk.code)}
                                        className="px-2.5 py-1 bg-[#1e293b] hover:bg-amber-600 hover:text-black text-slate-200 rounded text-[11px] font-medium transition cursor-pointer"
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
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
