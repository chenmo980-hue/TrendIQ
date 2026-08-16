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
  FileText,
  Clock,
  Timer,
} from 'lucide-react';

interface LimitUpBoardProps {
  onSelectStock: (code: string) => void;
}

type ActiveViewTab = 'ladder' | 'sectors' | 'dragonTiger';
type LadderLayoutMode = 'vertical' | 'table' | 'dualSplit' | 'columns';

// Global client memory cache to ensure instant smooth re-entry without blank flashes
let _clientCachedSummary: LimitUpLadderSummary | null = null;
let _clientCachedStocks: LimitUpStock[] = [];
let _clientCachedSectors: SectorLimitUpGroup[] = [];
let _clientCachedDragonTiger: DragonTigerSeat[] = [];
let _clientCachedLastUpdated: string = '';

export const LimitUpBoard: React.FC<LimitUpBoardProps> = ({ onSelectStock }) => {
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('ladder');
  const [ladderLayout, setLadderLayout] = useState<LadderLayoutMode>('vertical');
  const [firstBoardView, setFirstBoardView] = useState<'cards' | 'table'>('cards');
  const [summary, setSummary] = useState<LimitUpLadderSummary | null>(_clientCachedSummary);
  const [stocks, setStocks] = useState<LimitUpStock[]>(_clientCachedStocks);
  const [sectors, setSectors] = useState<SectorLimitUpGroup[]>(_clientCachedSectors);
  const [dragonTiger, setDragonTiger] = useState<DragonTigerSeat[]>(_clientCachedDragonTiger);
  const [isLoading, setIsLoading] = useState<boolean>(_clientCachedStocks.length === 0);
  const [lastUpdated, setLastUpdated] = useState<string>(_clientCachedLastUpdated);

  // Filters
  const [selectedBoards, setSelectedBoards] = useState<number>(0); // 0 = all, 99 = >=2, 5 = 5, 4 = 4, 3 = 3, 2 = 2, 1 = 1
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dragonTigerFilter, setDragonTigerFilter] = useState<'all' | 'institution' | 'hot_money' | 'northbound'>('all');

  // Auto refresh timer
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number>(30);

  const fetchLimitUpData = async (showLoading = true) => {
    if (showLoading && _clientCachedStocks.length === 0) setIsLoading(true);
    try {
      const resp = await fetch('/api/limit-up-board');
      if (resp.ok) {
        const data = await resp.json();
        const nextSummary = data.summary || null;
        const nextStocks = data.stocks || [];
        const nextSectors = data.sectors || [];
        const nextDragonTiger = data.dragonTiger || [];

        _clientCachedSummary = nextSummary;
        _clientCachedStocks = nextStocks;
        _clientCachedSectors = nextSectors;
        _clientCachedDragonTiger = nextDragonTiger;

        setSummary(nextSummary);
        setStocks(nextStocks);
        setSectors(nextSectors);
        setDragonTiger(nextDragonTiger);

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        _clientCachedLastUpdated = timeStr;
        setLastUpdated(timeStr);
      }
    } catch (err) {
      console.error('Failed to fetch limit-up data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLimitUpData(stocks.length === 0);
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
                  { label: `🔥 连板高标 (${stocks.filter((s) => s.consecutiveBoards >= 2).length})`, val: 99 },
                  { label: `👑 5板·总龙 (${stocks.filter((s) => s.consecutiveBoards >= 5).length})`, val: 5 },
                  { label: `🔥 3板·加速 (${stocks.filter((s) => s.consecutiveBoards === 3).length})`, val: 3 },
                  { label: `⚡ 2板·接力 (${stocks.filter((s) => s.consecutiveBoards === 2).length})`, val: 2 },
                  { label: `🌱 1板·首板 (${stocks.filter((s) => s.consecutiveBoards === 1).length})`, val: 1 },
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

                  {/* Top Dragon Spotlight Banner if consecutive boards >= 2 exists */}
                  {stocks.some((s) => s.consecutiveBoards >= 2) && (
                    <div className="bg-gradient-to-r from-[#2a1016] via-[#1a0f16] to-[#0c121c] border-2 border-red-500/50 rounded-2xl p-5 shadow-xl shadow-red-950/30 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none"></div>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                        {/* Left: Dragon Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-xs font-bold shadow-md shadow-red-600/30 animate-pulse">
                              <Award className="w-3.5 h-3.5" />
                              全市场最高空间总龙
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-500/40 font-mono font-semibold">
                              创业板 20cm 空间标杆
                            </span>
                          </div>

                          {(() => {
                            const topDragon = [...stocks].sort((a, b) => b.consecutiveBoards - a.consecutiveBoards)[0];
                            if (!topDragon) return null;
                            return (
                              <div className="flex flex-wrap items-baseline gap-3">
                                <h3 className="text-2xl font-black text-white tracking-wide">
                                  {topDragon.name}
                                </h3>
                                <span className="text-sm font-mono text-slate-400 font-semibold">
                                  {topDragon.code}
                                </span>
                                <span className="text-sm font-bold font-mono px-2.5 py-0.5 rounded bg-red-600 text-white shadow-sm">
                                  {topDragon.consecutiveBoards} 连板 ({topDragon.boardText})
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-[#1e293b] text-amber-300 font-medium">
                                  {topDragon.sector}
                                </span>
                              </div>
                            );
                          })()}

                          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                            {(() => {
                              const topDragon = [...stocks].sort((a, b) => b.consecutiveBoards - a.consecutiveBoards)[0];
                              return topDragon?.reason || '市场核心高标空间总龙，获主力游资与机构资金强力顶板锁仓，主升浪开拓全市场短线高度！';
                            })()}
                          </p>
                        </div>

                        {/* Right: Key Metrics & Action Button */}
                        {(() => {
                          const topDragon = [...stocks].sort((a, b) => b.consecutiveBoards - a.consecutiveBoards)[0];
                          if (!topDragon) return null;
                          return (
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#080d14]/80 p-3 rounded-xl border border-red-500/20 text-center">
                                <div>
                                  <div className="text-[10px] text-slate-400">现价/涨幅</div>
                                  <div className="text-sm font-bold font-mono text-red-400">
                                    ¥{topDragon.price.toFixed(2)}
                                  </div>
                                  <div className="text-[11px] font-bold font-mono text-red-500">
                                    +{topDragon.changePercent.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="border-l sm:border-x border-slate-800 px-2">
                                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>最后封板</span>
                                  </div>
                                  <div className="text-sm font-bold font-mono text-amber-300">
                                    {topDragon.lastTime || topDragon.firstTime || '09:25:00'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    首封 {topDragon.firstTime || '09:25:00'}
                                  </div>
                                </div>
                                <div className="border-r sm:border-r border-slate-800 px-2">
                                  <div className="text-[10px] text-slate-400">封单资金</div>
                                  <div className="text-sm font-bold font-mono text-amber-400">
                                    {formatMoney(topDragon.sealAmount)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">换手 {topDragon.turnoverRate.toFixed(1)}%</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400">今日成交</div>
                                  <div className="text-sm font-bold font-mono text-slate-200">
                                    {formatMoney(topDragon.turnover)}
                                  </div>
                                  <div className="text-[10px] text-emerald-400">
                                    {topDragon.openCount && topDragon.openCount > 0 ? `炸板${topDragon.openCount}次回封` : '封死未开'}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => onSelectStock(topDragon.code)}
                                className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
                              >
                                <span>深度研判总龙</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Ladder Layout Switcher Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0c1118] p-3 rounded-xl border border-[#18202c]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">浏览排版模式:</span>
                      <div className="flex flex-wrap items-center bg-[#070a0e] p-1 rounded-lg border border-[#1e293b] text-xs">
                        <button
                          onClick={() => setLadderLayout('vertical')}
                          className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            ladderLayout === 'vertical'
                              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>📱 竖版天梯瀑布流 (推荐 · 纵向逐级浏览)</span>
                        </button>
                        <button
                          onClick={() => setLadderLayout('table')}
                          className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            ladderLayout === 'table'
                              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>📋 全市场涨停明细表</span>
                        </button>
                        <button
                          onClick={() => setLadderLayout('dualSplit')}
                          className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            ladderLayout === 'dualSplit'
                              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>⚡ 连板股 vs 首板股</span>
                        </button>
                        <button
                          onClick={() => setLadderLayout('columns')}
                          className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            ladderLayout === 'columns'
                              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>📊 横向多列看板</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        连板高标: <strong className="text-red-400 font-mono">{stocks.filter((s) => s.consecutiveBoards >= 2).length}</strong> 家
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        首板先锋: <strong className="text-blue-400 font-mono">{stocks.filter((s) => s.consecutiveBoards === 1).length}</strong> 家
                      </span>
                    </div>
                  </div>

                  {/* ================= PRIMARY LAYOUT: 竖版天梯瀑布流 (Vertical Ladder Waterfall) ================= */}
                  {ladderLayout === 'vertical' && (
                    <div className="space-y-6">
                      {/* Fast Anchor Navigation Bar */}
                      <div className="flex flex-wrap items-center gap-2 bg-[#090e15] p-2.5 rounded-xl border border-[#1a2332] text-xs">
                        <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                          <Filter className="w-3.5 h-3.5 text-amber-400" />
                          <span>梯队直达:</span>
                        </span>
                        {[
                          { level: 5, label: '👑 5 连板 · 空间总龙', count: stocks.filter((s) => s.consecutiveBoards >= 5).length, bg: 'hover:border-red-500 text-red-300 bg-red-950/40' },
                          { level: 3, label: '🔥 3 连板 · 强势加速', count: stocks.filter((s) => s.consecutiveBoards === 3).length, bg: 'hover:border-orange-500 text-orange-300 bg-orange-950/40' },
                          { level: 2, label: '⚡ 2 连板 · 题材接力', count: stocks.filter((s) => s.consecutiveBoards === 2).length, bg: 'hover:border-amber-500 text-amber-300 bg-amber-950/40' },
                          { level: 1, label: '🌱 1 板 · 首板先锋', count: stocks.filter((s) => s.consecutiveBoards === 1).length, bg: 'hover:border-blue-500 text-blue-300 bg-blue-950/40' },
                        ].map((tier) => (
                          <button
                            key={tier.level}
                            onClick={() => {
                              const el = document.getElementById(`tier-section-${tier.level}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className={`px-3 py-1 rounded-lg border border-[#233144] font-semibold transition cursor-pointer flex items-center gap-1.5 ${tier.bg}`}
                          >
                            <span>{tier.label}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-black/40 font-mono text-[11px]">
                              {tier.count}只
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Tiered Sections Rendered Vertically */}
                      {[5, 4, 3, 2, 1].map((level) => {
                        const groupStocks = ladderGroups.get(level) || [];

                        // 4-board empty status
                        if (level === 4 && groupStocks.length === 0) {
                          return (
                            <div
                              key={level}
                              id={`tier-section-${level}`}
                              className="py-2.5 px-4 rounded-xl bg-[#0a0f16]/80 border border-dashed border-rose-900/40 flex items-center justify-between text-xs text-slate-500"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-800"></span>
                                <span className="font-semibold text-slate-400">4 连板 · 梯队断层</span>
                                <span>(日内无 4 连板标的，空间高度由 3 连板直接向上进攻 5 连板)</span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-600">断层跳空</span>
                            </div>
                          );
                        }

                        if (groupStocks.length === 0) return null;

                        const levelTitle =
                          level >= 5
                            ? `👑 ${level} 连板 · 空间高度总龙`
                            : level === 4
                            ? '🏆 4 连板 · 高标核心突破'
                            : level === 3
                            ? '🔥 3 连板 · 强势加速梯队'
                            : level === 2
                            ? '⚡ 2 连板 · 题材接力梯队'
                            : '🌱 1 板 · 首板先锋挖掘';

                        const levelSubtitle =
                          level >= 5
                            ? '全市场最高连板高度标杆 · 顶级游资机构合力顶板'
                            : level === 3
                            ? '中位分水岭强势晋级 · 承接主线题材核心放量'
                            : level === 2
                            ? '题材主线确认与分化接力 · 二板定龙头'
                            : '日内首发涨停标的 · 挖掘潜在二板晋级先锋';

                        return (
                          <div
                            key={level}
                            id={`tier-section-${level}`}
                            className={`rounded-2xl border p-5 space-y-4 transition ${
                              level >= 5
                                ? 'bg-gradient-to-b from-[#241016] via-[#140e15] to-[#0a0f16] border-red-500/60 shadow-xl shadow-red-950/30'
                                : level === 3
                                ? 'bg-gradient-to-b from-[#1e1210] via-[#130f13] to-[#0a0f16] border-orange-500/40'
                                : level === 2
                                ? 'bg-gradient-to-b from-[#1a150e] to-[#0a0f16] border-amber-500/30'
                                : 'bg-[#0a0f16] border-[#1c2636]'
                            }`}
                          >
                            {/* Tier Header Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222f42] pb-3.5">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-3 h-3 rounded-full ${
                                    level >= 5
                                      ? 'bg-red-500 animate-ping'
                                      : level === 3
                                      ? 'bg-orange-500'
                                      : level === 2
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                  }`}
                                ></span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white tracking-wide">
                                      {levelTitle}
                                    </h3>
                                    <span
                                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                                        level >= 2
                                          ? 'bg-red-600 text-white shadow-sm'
                                          : 'bg-[#1e293b] text-blue-300'
                                      }`}
                                    >
                                      共 {groupStocks.length} 家
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {levelSubtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                <div>
                                  <span>总封单: </span>
                                  <strong className="font-mono text-amber-300">
                                    {formatMoney(groupStocks.reduce((acc, cur) => acc + cur.sealAmount, 0))}
                                  </strong>
                                </div>
                                <span className="text-slate-700">|</span>
                                <div>
                                  <span>总成交: </span>
                                  <strong className="font-mono text-slate-200">
                                    {formatMoney(groupStocks.reduce((acc, cur) => acc + cur.turnover, 0))}
                                  </strong>
                                </div>
                                {level === 1 && (
                                  <div className="flex items-center bg-[#101724] p-1 rounded-lg border border-[#233144] ml-2">
                                    <button
                                      onClick={() => setFirstBoardView('cards')}
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                                        firstBoardView === 'cards'
                                          ? 'bg-amber-500 text-black'
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      卡片网格
                                    </button>
                                    <button
                                      onClick={() => setFirstBoardView('table')}
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                                        firstBoardView === 'table'
                                          ? 'bg-amber-500 text-black'
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      极速表格
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* First Board Table View if toggled */}
                            {level === 1 && firstBoardView === 'table' ? (
                              <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-[#101724] text-slate-400 border-b border-[#1e293b]">
                                      <th className="py-2.5 px-3 font-semibold">股票代码/名称</th>
                                      <th className="py-2.5 px-3 font-semibold">最新价</th>
                                      <th className="py-2.5 px-3 font-semibold">涨跌幅</th>
                                      <th className="py-2.5 px-3 font-semibold text-amber-400">最后封板时间</th>
                                      <th className="py-2.5 px-3 font-semibold">首次封板</th>
                                      <th className="py-2.5 px-3 font-semibold">封单金额</th>
                                      <th className="py-2.5 px-3 font-semibold">今日成交</th>
                                      <th className="py-2.5 px-3 font-semibold">换手率</th>
                                      <th className="py-2.5 px-3 font-semibold">封板状态</th>
                                      <th className="py-2.5 px-3 font-semibold">所属板块 / 题材</th>
                                      <th className="py-2.5 px-3 font-semibold">首板涨停驱动逻辑</th>
                                      <th className="py-2.5 px-3 font-semibold text-right">研判</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#182232] bg-[#0c1119]">
                                    {groupStocks.map((stock) => (
                                      <tr
                                        key={stock.code}
                                        className="hover:bg-[#141d2c] transition group cursor-pointer"
                                        onClick={() => onSelectStock(stock.code)}
                                      >
                                        <td className="py-2.5 px-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-white group-hover:text-amber-400 transition">
                                              {stock.name}
                                            </span>
                                            <span className="font-mono text-slate-400 text-[11px]">
                                              {stock.code}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-red-400">
                                          ¥{stock.price.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-red-500">
                                          +{stock.changePercent.toFixed(2)}%
                                        </td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                            <span>{stock.lastTime || stock.firstTime || '--:--:--'}</span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-400">
                                          {stock.firstTime || '--:--:--'}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                                          {formatMoney(stock.sealAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-200">
                                          {formatMoney(stock.turnover)}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-300">
                                          {stock.turnoverRate.toFixed(2)}%
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {stock.openCount && stock.openCount > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-600/40 text-[10px] font-semibold">
                                              炸板{stock.openCount}次
                                            </span>
                                          ) : stock.firstTime === '09:25:00' ? (
                                            <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-600/40 text-[10px] font-semibold">
                                              一字封死
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[10px] font-semibold">
                                              封死
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="px-2 py-0.5 rounded bg-[#182232] text-slate-300 text-[11px]">
                                            {stock.sector}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 max-w-xs text-slate-400 truncate">
                                          {stock.reason}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectStock(stock.code);
                                            }}
                                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-semibold text-[11px] transition cursor-pointer"
                                          >
                                            K线研判
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* Card Grid Layout for this tier */
                              <div
                                className={`grid gap-4 ${
                                  level >= 5
                                    ? 'grid-cols-1 lg:grid-cols-2'
                                    : level >= 2
                                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                }`}
                              >
                                {groupStocks.map((stock) => (
                                  <div
                                    key={stock.code}
                                    className={`bg-[#0d131c] border rounded-xl p-4 transition-all duration-200 hover:border-amber-400 hover:shadow-xl hover:shadow-black/50 flex flex-col justify-between space-y-3 relative group ${
                                      stock.consecutiveBoards >= 5
                                        ? 'border-red-500/70 bg-gradient-to-br from-[#261017] via-[#140e15] to-[#0d131c] shadow-lg shadow-red-950/40 ring-1 ring-red-500/50'
                                        : stock.consecutiveBoards === 3
                                        ? 'border-orange-500/40 bg-gradient-to-br from-[#1e1210] to-[#0d131c]'
                                        : stock.consecutiveBoards === 2
                                        ? 'border-amber-500/30 bg-gradient-to-br from-[#17130e] to-[#0d131c]'
                                        : 'border-[#1e293b]'
                                    }`}
                                  >
                                    {/* Stock Name, Code, Board badge & Price */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-base font-black text-white group-hover:text-amber-400 transition tracking-wide">
                                            {stock.name}
                                          </h4>
                                          <span className="text-xs font-mono text-slate-400 font-semibold">
                                            {stock.code}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                          <span
                                            className={`text-xs font-bold px-2 py-0.5 rounded shadow-sm ${getBoardBadgeColor(
                                              stock.consecutiveBoards
                                            )}`}
                                          >
                                            {stock.boardText}
                                          </span>
                                          <span className="text-xs px-2 py-0.5 rounded bg-[#182332] text-amber-300 font-medium">
                                            {stock.sector}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <div className="text-lg font-black font-mono text-red-400">
                                          ¥{stock.price.toFixed(2)}
                                        </div>
                                        <div className="text-xs font-bold font-mono text-red-500">
                                          +{stock.changePercent.toFixed(2)}%
                                        </div>
                                      </div>
                                    </div>

                                    {/* 封板时间与封板状态条 (Seal Timing & Status) */}
                                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#060a0f] rounded-lg border border-[#16202e] text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className="text-slate-400 text-[11px]">最后封板:</span>
                                        <span className="font-mono font-bold text-amber-300">
                                          {stock.lastTime || stock.firstTime || '--:--:--'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[11px]">
                                        <span className="text-slate-500 font-mono">
                                          首封 {stock.firstTime || '--:--:--'}
                                        </span>
                                        {stock.openCount && stock.openCount > 0 ? (
                                          <span className="px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-400 border border-amber-600/40 text-[10px] font-semibold">
                                            炸板{stock.openCount}次
                                          </span>
                                        ) : stock.firstTime === '09:25:00' ? (
                                          <span className="px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-600/40 text-[10px] font-semibold">
                                            一字秒封
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[10px] font-semibold">
                                            封死
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#060a0f] rounded-lg border border-[#151e2b] text-xs">
                                      <div>
                                        <div className="text-[10px] text-slate-500 font-medium">封单金额</div>
                                        <div className="font-mono font-bold text-amber-300 text-sm">
                                          {formatMoney(stock.sealAmount)}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-slate-500 font-medium">今日成交</div>
                                        <div className="font-mono font-semibold text-slate-200">
                                          {formatMoney(stock.turnover)}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-[10px] text-slate-500 font-medium">换手率</div>
                                        <div className="font-mono font-semibold text-slate-200">
                                          {stock.turnoverRate.toFixed(2)}%
                                        </div>
                                      </div>
                                    </div>

                                    {/* Catalyst Reason Box */}
                                    <div className="bg-[#080d15] p-2.5 rounded-lg border border-[#151e2c]">
                                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                                        <strong className="text-amber-400 font-semibold">【题材催化】</strong>
                                        {stock.reason}
                                      </p>
                                    </div>

                                    {/* Dragon Tiger Seat Tag & Action */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[#182332]">
                                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">
                                        {stock.dragonTigerType || '主力游资活跃'}
                                      </span>
                                      <button
                                        onClick={() => onSelectStock(stock.code)}
                                        className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                                      >
                                        <span>量化K线研判</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ================= LAYOUT 2: 全市场涨停明细表 (Full Table View) ================= */}
                  {ladderLayout === 'table' && (
                    <div className="bg-[#0c1118] border border-[#18202c] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-400" />
                          <h3 className="text-base font-bold text-white">
                            全市场涨停与连板股票明细表 (共 {filteredStocks.length} 家)
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          点击任意股票可直接进行量化研判
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
                        <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                          <thead>
                            <tr className="bg-[#101724] text-slate-400 border-b border-[#1e293b]">
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[90px] w-[90px]">梯队位阶</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[150px]">股票代码/名称</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[80px]">最新价</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[80px]">涨跌幅</th>
                              <th className="py-3 px-3.5 font-semibold text-amber-400 whitespace-nowrap min-w-[130px]">最后封板时间</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[95px]">首次封板</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[105px]">封单金额</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[105px]">今日成交</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[75px]">换手率</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[110px]">封板状态</th>
                              <th className="py-3 px-3.5 font-semibold whitespace-nowrap min-w-[140px]">所属板块 / 题材</th>
                              <th className="py-3 px-3.5 font-semibold min-w-[280px]">涨停逻辑与驱动分析</th>
                              <th className="py-3 px-3.5 font-semibold text-right whitespace-nowrap min-w-[75px]">深度研判</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#182232] bg-[#0a0f16]">
                            {filteredStocks.map((stock) => (
                              <tr
                                key={stock.code}
                                className="hover:bg-[#141d2c] transition group cursor-pointer"
                                onClick={() => onSelectStock(stock.code)}
                              >
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span
                                    className={`text-xs font-bold px-2.5 py-1 rounded whitespace-nowrap inline-flex items-center justify-center shadow-sm ${getBoardBadgeColor(
                                      stock.consecutiveBoards
                                    )}`}
                                  >
                                    {stock.boardText}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white group-hover:text-amber-400 transition text-sm">
                                      {stock.name}
                                    </span>
                                    <span className="font-mono text-slate-400 text-xs">
                                      {stock.code}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-red-400 whitespace-nowrap text-sm">
                                  ¥{stock.price.toFixed(2)}
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-red-500 whitespace-nowrap text-sm">
                                  +{stock.changePercent.toFixed(2)}%
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-amber-300 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 bg-[#0a1018] px-2.5 py-1 rounded border border-amber-500/30 w-fit">
                                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="text-amber-300 font-bold">{stock.lastTime || stock.firstTime || '--:--:--'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3.5 font-mono text-slate-400 whitespace-nowrap">
                                  {stock.firstTime || '--:--:--'}
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-amber-300 whitespace-nowrap">
                                  {formatMoney(stock.sealAmount)}
                                </td>
                                <td className="py-3 px-3.5 font-mono text-slate-200 whitespace-nowrap">
                                  {formatMoney(stock.turnover)}
                                </td>
                                <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                                  {stock.turnoverRate.toFixed(2)}%
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {stock.openCount && stock.openCount > 0 ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-600/40 text-[11px] font-semibold whitespace-nowrap">
                                      炸板{stock.openCount}次回封
                                    </span>
                                  ) : stock.firstTime === '09:25:00' ? (
                                    <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-600/40 text-[11px] font-semibold whitespace-nowrap">
                                      一字秒封
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[11px] font-semibold whitespace-nowrap">
                                      封死未开
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className="px-2.5 py-0.5 rounded bg-[#182232] text-slate-300 text-xs whitespace-nowrap inline-block">
                                    {stock.sector}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 max-w-sm text-slate-300 text-xs">
                                  {stock.reason}
                                </td>
                                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectStock(stock.code);
                                    }}
                                    className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs transition cursor-pointer"
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
                  )}

                  {/* ================= LAYOUT 2: 连板股 vs 首板股 (Dual Split View) ================= */}
                  {ladderLayout === 'dualSplit' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Left Column: 连板核心高标专栏 (≥2板) */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="flex items-center justify-between bg-gradient-to-r from-red-950/80 to-[#121926] p-3.5 rounded-xl border border-red-500/40">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                            <div>
                              <h4 className="text-base font-bold text-white flex items-center gap-2">
                                🔥 连板核心高标专栏 (≥2板)
                              </h4>
                              <p className="text-xs text-red-300/80 mt-0.5">
                                全市场连板接力与空间总龙核心梯队
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-red-600 text-white shadow-md">
                            {stocks.filter((s) => s.consecutiveBoards >= 2).length} 家
                          </span>
                        </div>

                        {stocks.filter((s) => s.consecutiveBoards >= 2).length === 0 ? (
                          <div className="p-8 text-center bg-[#0c1118] border border-[#1e293b] rounded-xl text-slate-500 text-xs">
                            当前市场暂无 ≥2 连板标的
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {stocks
                              .filter((s) => s.consecutiveBoards >= 2)
                              .sort((a, b) => b.consecutiveBoards - a.consecutiveBoards || b.sealAmount - a.sealAmount)
                              .map((stock) => (
                                <div
                                  key={stock.code}
                                  className="bg-gradient-to-br from-[#241016] via-[#140e14] to-[#0e141d] border-2 border-red-500/60 rounded-xl p-4 shadow-lg shadow-red-950/40 space-y-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-black text-white">
                                          {stock.name}
                                        </h4>
                                        <span className="text-xs font-mono text-slate-400">
                                          {stock.code}
                                        </span>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                                          {stock.boardText}
                                        </span>
                                      </div>
                                      <div className="text-xs text-amber-300 mt-1 font-medium">
                                        板块: {stock.sector} · {stock.subConcepts.join(' · ')}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-black font-mono text-red-400">
                                        ¥{stock.price.toFixed(2)}
                                      </div>
                                      <div className="text-xs font-bold font-mono text-red-500">
                                        +{stock.changePercent.toFixed(2)}%
                                      </div>
                                    </div>
                                  </div>

                                  {/* 封板时间与封板状态条 (Seal Timing & Status) */}
                                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#060a0f] rounded-lg border border-[#16202e] text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span className="text-slate-400 text-[11px]">最后封板:</span>
                                      <span className="font-mono font-bold text-amber-300">
                                        {stock.lastTime || stock.firstTime || '--:--:--'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="text-slate-500 font-mono">
                                        首封 {stock.firstTime || '--:--:--'}
                                      </span>
                                      {stock.openCount && stock.openCount > 0 ? (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-400 border border-amber-600/40 text-[10px] font-semibold">
                                          炸板{stock.openCount}次
                                        </span>
                                      ) : stock.firstTime === '09:25:00' ? (
                                        <span className="px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-600/40 text-[10px] font-semibold">
                                          一字秒封
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[10px] font-semibold">
                                          封死
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#060a0f] rounded-lg border border-[#182230] text-xs">
                                    <div>
                                      <div className="text-[10px] text-slate-500">封单金额</div>
                                      <div className="font-mono font-bold text-amber-300">
                                        {formatMoney(stock.sealAmount)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-slate-500">今日成交</div>
                                      <div className="font-mono font-bold text-slate-200">
                                        {formatMoney(stock.turnover)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[10px] text-slate-500">换手率</div>
                                      <div className="font-mono font-bold text-slate-200">
                                        {stock.turnoverRate.toFixed(2)}%
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    <strong className="text-red-400">【核心逻辑】</strong> {stock.reason}
                                  </p>

                                  <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                                    <span className="text-xs text-slate-400 font-mono">
                                      席位: {stock.dragonTigerType}
                                    </span>
                                    <button
                                      onClick={() => onSelectStock(stock.code)}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                    >
                                      <span>查看量化K线研判</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Right Column: 全市场首板挖掘专栏 (1板) */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between bg-[#0e141f] p-3.5 rounded-xl border border-[#1e293b]">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <div>
                              <h4 className="text-base font-bold text-white">
                                🌱 首板先锋挖掘池 (1板 · 题材首发)
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                日内首板启动标的，按封单金额与成交换手排序
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#1e293b] text-blue-300 border border-blue-500/30">
                            {stocks.filter((s) => s.consecutiveBoards === 1).length} 家
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[750px] overflow-y-auto pr-1 custom-scrollbar">
                          {stocks
                            .filter((s) => s.consecutiveBoards === 1)
                            .sort((a, b) => b.sealAmount - a.sealAmount)
                            .map((stock) => (
                              <div
                                key={stock.code}
                                className="bg-[#0e141d] border border-[#1e293b] hover:border-blue-500/50 rounded-xl p-3.5 space-y-2 transition flex flex-col justify-between"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-sm font-bold text-white">
                                        {stock.name}
                                      </h5>
                                      <span className="text-xs font-mono text-slate-400">
                                        {stock.code}
                                      </span>
                                    </div>
                                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#182230] text-slate-300 mt-1 inline-block">
                                      {stock.sector}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold font-mono text-red-400">
                                      ¥{stock.price.toFixed(2)}
                                    </div>
                                    <div className="text-[11px] font-mono text-red-500 font-semibold">
                                      +{stock.changePercent.toFixed(2)}%
                                    </div>
                                  </div>
                                </div>

                                {/* 封板时间条 */}
                                <div className="flex items-center justify-between px-2 py-1 bg-[#060a0f] rounded border border-[#141b25] text-[10px]">
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>末封:</span>
                                    <span className="font-mono font-bold text-amber-300">
                                      {stock.lastTime || stock.firstTime || '--:--:--'}
                                    </span>
                                  </div>
                                  <span className="font-mono text-slate-500">
                                    首封 {stock.firstTime || '--:--:--'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 py-1.5 px-2 bg-[#060a0f] rounded border border-[#141b25] text-[11px]">
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">封单</span>
                                    <span className="font-mono text-amber-300 font-bold">
                                      {formatMoney(stock.sealAmount)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">成交</span>
                                    <span className="font-mono text-slate-300 font-medium">
                                      {formatMoney(stock.turnover)}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {stock.reason}
                                </p>

                                <div className="flex items-center justify-between pt-1 border-t border-[#182230]">
                                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                                    {stock.subConcepts[0] || '首板启动'}
                                  </span>
                                  <button
                                    onClick={() => onSelectStock(stock.code)}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer flex items-center gap-0.5"
                                  >
                                    <span>研判</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= LAYOUT 4: 横向多列连板看板 (Columns Kanban View) ================= */}
                  {ladderLayout === 'columns' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-[#0c1118] p-4 rounded-xl border border-[#18202c]">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <h3 className="text-base font-bold text-white">
                            横向梯队多列看板 (按连板高度分栏排布)
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          向右滑动查看更多梯队 · 支持点击卡片进入深度K线研判
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
                        {[
                          { title: '空间总龙 (≥4板)', min: 4, max: 99, color: 'from-red-950/80 to-[#120d14]', border: 'border-red-500/60', badge: 'bg-red-600' },
                          { title: '中位加速 (3板)', min: 3, max: 3, color: 'from-orange-950/70 to-[#121012]', border: 'border-orange-500/50', badge: 'bg-orange-600' },
                          { title: '接力确认 (2板)', min: 2, max: 2, color: 'from-amber-950/60 to-[#121214]', border: 'border-amber-500/40', badge: 'bg-amber-600' },
                          { title: '首板精选 (1板)', min: 1, max: 1, color: 'from-blue-950/50 to-[#0e141f]', border: 'border-blue-500/30', badge: 'bg-blue-600' },
                        ].map((col) => {
                          const colStocks = filteredStocks
                            .filter((s) => s.consecutiveBoards >= col.min && s.consecutiveBoards <= col.max)
                            .sort((a, b) => b.consecutiveBoards - a.consecutiveBoards || b.sealAmount - a.sealAmount);

                          return (
                            <div
                              key={col.title}
                              className={`bg-gradient-to-b ${col.color} border ${col.border} rounded-xl p-3.5 space-y-3 flex flex-col min-h-[500px]`}
                            >
                              {/* Column Header */}
                              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
                                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <span>{col.title}</span>
                                </span>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded text-white ${col.badge}`}>
                                  {colStocks.length} 家
                                </span>
                              </div>

                              {/* Column Cards */}
                              <div className="space-y-3 overflow-y-auto max-h-[650px] pr-1 custom-scrollbar flex-1">
                                {colStocks.length === 0 ? (
                                  <div className="p-8 text-center text-slate-500 text-xs">
                                    暂无符合条件的股票
                                  </div>
                                ) : (
                                  colStocks.map((stock) => (
                                    <div
                                      key={stock.code}
                                      className="bg-[#0b1017] border border-[#192433] hover:border-amber-400 rounded-lg p-3 space-y-2.5 transition group cursor-pointer"
                                      onClick={() => onSelectStock(stock.code)}
                                    >
                                      {/* Header */}
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <h5 className="text-sm font-black text-white group-hover:text-amber-400 transition">
                                              {stock.name}
                                            </h5>
                                            <span className="text-[11px] font-mono text-slate-400">
                                              {stock.code}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 mt-1">
                                            <span
                                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${getBoardBadgeColor(
                                                stock.consecutiveBoards
                                              )}`}
                                            >
                                              {stock.boardText}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#16202c] text-slate-300 truncate max-w-[100px]">
                                              {stock.sector}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <div className="text-sm font-black font-mono text-red-400">
                                            ¥{stock.price.toFixed(2)}
                                          </div>
                                          <div className="text-[10px] font-bold font-mono text-red-500">
                                            +{stock.changePercent.toFixed(2)}%
                                          </div>
                                        </div>
                                      </div>

                                      {/* 最后封板时间突出呈现 */}
                                      <div className="flex items-center justify-between px-2 py-1 bg-[#060a0f] rounded border border-[#16202e] text-[11px]">
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                          <span className="text-slate-400 text-[10px]">最后封板:</span>
                                          <span className="font-mono font-bold text-amber-300">
                                            {stock.lastTime || stock.firstTime || '--:--:--'}
                                          </span>
                                        </div>
                                        <span className="font-mono text-slate-500 text-[10px]">
                                          首封 {stock.firstTime || '--:--:--'}
                                        </span>
                                      </div>

                                      {/* Metrics Grid */}
                                      <div className="grid grid-cols-2 gap-1.5 py-1 px-2 bg-[#060a0f] rounded border border-[#141b25] text-[11px]">
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">封单金额</span>
                                          <span className="font-mono font-bold text-amber-300 text-xs">
                                            {formatMoney(stock.sealAmount)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">换手率</span>
                                          <span className="font-mono text-slate-200 text-xs font-semibold">
                                            {stock.turnoverRate.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>

                                      <p className="text-[11px] text-slate-300 line-clamp-2">
                                        {stock.reason}
                                      </p>

                                      <div className="flex items-center justify-between pt-1.5 border-t border-[#182230]">
                                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                                          {stock.dragonTigerType || '游资合力'}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectStock(stock.code);
                                          }}
                                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-0.5"
                                        >
                                          <span>研判</span>
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                                    <span className="text-[9px] text-amber-300/80 font-mono">
                                      末封 {stk.lastTime || stk.firstTime || '--'}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      · 封单 {formatMoney(stk.sealAmount)}
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
