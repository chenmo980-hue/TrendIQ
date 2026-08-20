import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KlineChart } from './KlineChart';
import { KlinePoint, StockQuote, KlinePeriod } from '../types';
import {
  ArrowLeft,
  ArrowUpDown,
  Search,
  Flame,
  Layers,
  Crown,
  RefreshCw,
  List,
  Clock,
  Coins,
} from 'lucide-react';

interface SectorBoardItem {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  turnover: number;
  turnoverRate: number;
  marketCap: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  leadStockName: string;
  leadStockCode: string;
  type: 'industry' | 'concept';
  hot: number;
}

interface SectorBoardConstituent {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  turnover: number;
  turnoverRate: number;
  marketCap: number;
  volume: number;
  consecutiveBoards?: number;
  boardText?: string;
  firstTime?: string;
  lastTime?: string;
  sealAmount?: number;
  openCount?: number;
  isBroken?: boolean;
}

type BoardType = 'all' | 'industry' | 'concept';
type SortKey = 'hot' | 'changePercent' | 'turnover' | 'upCount';
type ConstSortKey = 'changePercent' | 'turnover' | 'turnoverRate';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'hot', label: '热度' },
  { key: 'changePercent', label: '涨幅' },
  { key: 'turnover', label: '成交额' },
  { key: 'upCount', label: '涨停家数' },
];

const CONST_SORT_OPTIONS: { key: ConstSortKey; label: string }[] = [
  { key: 'changePercent', label: '涨幅' },
  { key: 'turnover', label: '成交额' },
  { key: 'turnoverRate', label: '换手率' },
];

const PERIODS: { id: KlinePeriod; label: string }[] = [
  { id: 'day', label: '日线' },
  { id: '5m', label: '5分' },
  { id: '15m', label: '15分' },
  { id: '30m', label: '30分' },
  { id: '60m', label: '60分' },
];

function heatColor(heat: number): string {
  if (heat >= 80) return 'text-red-400';
  if (heat >= 60) return 'text-amber-400';
  if (heat >= 40) return 'text-orange-400';
  return 'text-slate-400';
}

function heatBg(heat: number): string {
  if (heat >= 80) return 'bg-red-500/15 border-red-500/40';
  if (heat >= 60) return 'bg-amber-500/15 border-amber-500/40';
  if (heat >= 40) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-[#121924] border-[#222d3a]';
}

function formatMoney(num?: number): string {
  if (!num || num <= 0) return '--';
  const abs = Math.abs(num);
  if (abs >= 100000000) return `${(abs / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(abs / 10000).toFixed(0)}万`;
  return abs.toLocaleString();
}

function formatTime(t?: string): string {
  if (!t) return '--:--';
  // Support "HH:mm:ss" or "HHmmss" style values
  const s = t.replace(/[^\d:]/g, '');
  if (s.includes(':')) return s.slice(0, 8);
  if (s.length >= 6) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  return s || '--:--';
}

export const SectorHeatBoard: React.FC<{
  active?: boolean;
  onSelectStock: (code: string) => void;
}> = ({ active = true, onSelectStock }) => {
  const [boards, setBoards] = useState<SectorBoardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<BoardType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('hot');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail view state
  const [selectedBoard, setSelectedBoard] = useState<SectorBoardItem | null>(null);
  const [constituents, setConstituents] = useState<SectorBoardConstituent[]>([]);
  const [klineData, setKlineData] = useState<KlinePoint[]>([]);
  const [detailQuote, setDetailQuote] = useState<StockQuote | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<KlinePeriod>('day');
  const [constSortKey, setConstSortKey] = useState<ConstSortKey>('changePercent');
  const [constOrder, setConstOrder] = useState<'desc' | 'asc'>('desc');
  const [klineError, setKlineError] = useState<string | null>(null);

  const loadBoards = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/sector-boards?type=${type}&sort=${sortKey}&order=desc`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setBoards(data.boards || []);
      setLastUpdated(data.timestamp || Date.now());
    } catch (err: any) {
      if (!silent) setError(err.message || '加载板块失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [type, sortKey]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const loadDetail = useCallback(
    async (board: SectorBoardItem, period: KlinePeriod = detailPeriod, silent = false) => {
      setSelectedBoard(board);
      if (!silent) setDetailLoading(true);
      setKlineError(null);
      try {
        // Load K-line + quote via the unified endpoint (handles raw BK codes)
        const kResp = await fetch(`/api/kline?code=${board.code}&period=${period}`);
        if (!kResp.ok) {
          if (!silent) setKlineError(`K线加载失败 (HTTP ${kResp.status})`);
        } else {
          const kData = await kResp.json();
          setKlineData(kData.klineData || []);
          setDetailQuote(kData.quote || null);
        }

        // Load constituents via the board detail endpoint
        const cResp = await fetch(`/api/sector-board-detail?code=${board.code}`);
        if (cResp.ok) {
          const cData = await cResp.json();
          if (cData.constituents) {
            setConstituents(cData.constituents);
          }
        }
      } catch (err: any) {
        if (!silent) setKlineError(err.message || '加载板块详情失败');
      } finally {
        if (!silent) setDetailLoading(false);
      }
    },
    [detailPeriod]
  );

  const handlePeriodChange = (p: KlinePeriod) => {
    setDetailPeriod(p);
    if (selectedBoard) {
      loadDetail(selectedBoard, p);
    }
  };

  const handleBack = () => {
    setSelectedBoard(null);
    setConstituents([]);
    setKlineData([]);
    setDetailQuote(null);
    setKlineError(null);
  };

  // Periodic refresh only during A-share market hours (Mon-Fri 09:30-11:30, 13:00-15:00 Beijing time)
  // and only while the board tab is visible. Outside market hours we keep the cached snapshot.
  useEffect(() => {
    if (!active) return;
    const isMarketOpen = () => {
      const now = new Date();
      const bj = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 3600000);
      const day = bj.getDay();
      if (day === 0 || day === 6) return false;
      const t = bj.getHours() * 60 + bj.getMinutes();
      return (t >= 9 * 60 + 30 && t <= 11 * 60 + 30) || (t >= 13 * 60 && t <= 15 * 60);
    };
    if (!isMarketOpen()) return;
    const timer = setInterval(() => {
      loadBoards(true);
      if (selectedBoard) loadDetail(selectedBoard, detailPeriod, true);
    }, 60000);
    return () => clearInterval(timer);
  }, [active, loadBoards, loadDetail, selectedBoard, detailPeriod]);

  const filteredBoards = query.trim()
    ? boards.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.code.toLowerCase().includes(query.toLowerCase()) ||
          (b.leadStockName || '').toLowerCase().includes(query.toLowerCase())
      )
    : boards;

  const sortedConstituents = [...constituents].sort((a, b) => {
    const av = a[constSortKey] ?? 0;
    const bv = b[constSortKey] ?? 0;
    return constOrder === 'asc' ? av - bv : bv - av;
  });

  const limitUpConstituents = constituents.filter(
    (c) => c.consecutiveBoards || c.sealAmount || c.firstTime
  );
  const maxBoardInConstituents = Math.max(
    0,
    ...constituents.map((c) => c.consecutiveBoards || 0)
  );

  // ===== Detail View =====
  if (selectedBoard) {
    const up = (detailQuote?.changePercent ?? selectedBoard.changePercent) >= 0;
    const chgPct = detailQuote?.changePercent ?? selectedBoard.changePercent;
    const displayUpCount = selectedBoard.upCount;
    const displayDownCount = selectedBoard.downCount;

    return (
      <div className="space-y-4">
        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#222d3a] bg-[#10161f] text-slate-300 hover:text-white hover:border-amber-500/50 text-xs font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回板块列表
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{selectedBoard.name}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-[#d4a038] border border-amber-500/30">
                {selectedBoard.type === 'concept' ? '题材概念' : '行业板块'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#16202c] border border-slate-800">
                {selectedBoard.code}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#10161f] p-0.5 rounded border border-[#1d2733] shrink-0">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id)}
                  className={`px-2.5 py-1 text-xs font-medium transition cursor-pointer rounded ${
                    detailPeriod === p.id
                      ? 'bg-[#1b2532] text-[#d4a038] font-semibold border border-[#2b394b]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Board Snapshot Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400">板块涨幅</div>
            <div className={`text-xl font-bold font-mono mt-1 ${up ? 'text-red-400' : 'text-emerald-400'}`}>
              {up ? '+' : ''}{chgPct.toFixed(2)}%
            </div>
          </div>
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400">成交额</div>
            <div className="text-lg font-bold font-mono mt-1 text-white">
              {(selectedBoard.turnover / 1e8).toFixed(1)}亿
            </div>
          </div>
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400">上涨家数</div>
            <div className="text-lg font-bold font-mono mt-1 text-red-400">{displayUpCount}</div>
          </div>
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400">下跌家数</div>
            <div className="text-lg font-bold font-mono mt-1 text-emerald-400">{displayDownCount}</div>
          </div>
          <div className="bg-[#0e141c] border border-red-500/30 rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" />
              成分股涨停
            </div>
            <div className="text-lg font-bold font-mono mt-1 text-red-400">
              {limitUpConstituents.length}家
            </div>
          </div>
          <div className="bg-[#0e141c] border border-red-500/30 rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              最高连板
            </div>
            <div className="text-lg font-bold font-mono mt-1 text-amber-300">
              {maxBoardInConstituents > 0 ? `${maxBoardInConstituents}连板` : '--'}
            </div>
          </div>
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-3.5 col-span-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#d4a038]" />
              领涨龙头
            </div>
            <div className="text-base font-bold mt-1 text-[#d4a038] truncate">
              {selectedBoard.leadStockName || '-'}
            </div>
          </div>
        </div>

        {/* K-Line Chart */}
        {detailLoading ? (
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-8 text-center text-slate-400 text-sm">
            加载板块K线数据...
          </div>
        ) : klineData.length > 0 ? (
          <KlineChart
            data={klineData}
            period={detailPeriod}
            onPeriodChange={handlePeriodChange}
            stockName={`${selectedBoard.name} · 板块指数`}
            stockCode={selectedBoard.code}
          />
        ) : (
          <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg p-8 text-center">
            {klineError ? (
              <div className="text-slate-400 text-sm">
                <div className="text-amber-400 font-medium mb-1">K线暂不可用</div>
                <div>{klineError}</div>
                <button
                  onClick={() => loadDetail(selectedBoard)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d4a038]/50 bg-amber-500/10 text-[#d4a038] text-xs font-medium hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  重试
                </button>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">暂无K线数据</div>
            )}
          </div>
        )}

        {/* Sortable Constituents Table */}
        <div className="bg-[#0e141c] border border-[#1e293b] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#18202c]">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-[#d4a038]" />
              <h3 className="text-sm font-bold text-white">
                成分股 <span className="text-slate-400 font-normal">（{constituents.length} 只）</span>
              </h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CONST_SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (constSortKey === s.key) {
                      setConstOrder(constOrder === 'desc' ? 'asc' : 'desc');
                    } else {
                      setConstSortKey(s.key);
                      setConstOrder('desc');
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                    constSortKey === s.key
                      ? 'bg-amber-500/15 border-amber-500/50 text-[#d4a038] font-semibold'
                      : 'bg-[#121924] border-[#222d3a] text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                  <ArrowUpDown className="w-3 h-3" />
                  {constSortKey === s.key && (constOrder === 'desc' ? '↓' : '↑')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b border-[#18202c] bg-[#0a0f16]">
                  <th className="px-4 py-2.5 text-left font-medium">代码</th>
                  <th className="px-4 py-2.5 text-left font-medium">名称</th>
                  <th className="px-4 py-2.5 text-right font-medium cursor-pointer" onClick={() => { setConstSortKey('changePercent'); setConstOrder(constOrder === 'desc' ? 'asc' : 'desc'); }}>
                    涨跌幅
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">连板</th>
                  <th className="px-4 py-2.5 text-right font-medium">首次封板</th>
                  <th className="px-4 py-2.5 text-right font-medium text-amber-400">最后封板</th>
                  <th className="px-4 py-2.5 text-right font-medium text-amber-300">封单金额</th>
                  <th className="px-4 py-2.5 text-right font-medium cursor-pointer" onClick={() => { setConstSortKey('turnover'); setConstOrder(constOrder === 'desc' ? 'asc' : 'desc'); }}>
                    成交额
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">换手率</th>
                  <th className="px-4 py-2.5 text-right font-medium">流通市值</th>
                </tr>
              </thead>
              <tbody>
                {sortedConstituents.map((c) => {
                  const cUp = c.changePercent >= 0;
                  const hasLimitUp = !!c.firstTime || !!c.sealAmount || !!c.consecutiveBoards;
                  return (
                    <tr
                      key={c.code}
                      onClick={() => onSelectStock(c.code)}
                      title="点击跳转该股K线分析"
                      className={`border-b border-[#141c26] hover:bg-[#121924] transition cursor-pointer ${
                        hasLimitUp ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{c.code}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white">{c.name}</span>
                          {c.code === selectedBoard.leadStockCode && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 rounded">
                              龙头
                            </span>
                          )}
                          {c.consecutiveBoards && c.consecutiveBoards >= 2 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white border border-red-400 rounded">
                              {c.consecutiveBoards}连板
                            </span>
                          )}
                          {c.isBroken && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-600/40 rounded">
                              炸板
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${cUp ? 'text-red-400' : 'text-emerald-400'}`}>
                        {cUp ? '+' : ''}{c.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                        {c.consecutiveBoards ? `${c.consecutiveBoards}板` : '--'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        {hasLimitUp ? formatTime(c.firstTime) : '--:--'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300">
                        {hasLimitUp ? (
                          <span className="flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            {formatTime(c.lastTime)}
                          </span>
                        ) : (
                          '--:--'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300">
                        {formatMoney(c.sealAmount)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                        {(c.turnover / 1e8).toFixed(1)}亿
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                        {c.turnoverRate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                        {(c.marketCap / 1e8).toFixed(0)}亿
                      </td>
                    </tr>
                  );
                })}
                {sortedConstituents.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-sm">
                      暂无成分股数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===== List View =====
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#d4a038]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              板块热点
              <span className="text-[11px] font-normal text-slate-400">实时行业板块 & 题材概念热力榜</span>
            </h2>
            <div className="text-[11px] text-slate-500 mt-0.5">
              覆盖全市场 {boards.length} 个板块/题材 · {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('zh-CN') : '--'} 更新
            </div>
          </div>
        </div>

        <button
          onClick={() => loadBoards(false)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#222d3a] bg-[#10161f] text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Filters: Type + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center bg-[#10161f] p-0.5 rounded border border-[#1d2733] shrink-0">
          {([
            { id: 'all', label: '全部' },
            { id: 'industry', label: '行业板块' },
            { id: 'concept', label: '题材概念' },
          ] as { id: BoardType; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                type === t.id
                  ? 'bg-[#1b2532] text-[#d4a038] border border-[#2b394b]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
            <ArrowUpDown className="w-3 h-3" />
            排序:
          </span>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              className={`px-3 py-1.5 rounded border text-xs font-medium transition cursor-pointer ${
                sortKey === s.key
                  ? 'bg-amber-500/15 border-amber-500/50 text-[#d4a038] font-semibold'
                  : 'bg-[#10161f] border-[#1d2733] text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm lg:ml-auto">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索板块/题材，如：煤炭、焦炭、半导体、低空"
            className="w-full bg-[#10161f] border border-[#1d2733] rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d4a038] transition"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && boards.length === 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-[#d4a038]">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>加载板块数据...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-lg border border-[#1e293b] bg-[#0e141c] animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-24 rounded bg-slate-700/60" />
                  <div className="h-3 w-8 rounded bg-slate-700/60" />
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <div className="h-5 w-16 rounded bg-slate-700/60" />
                  <div className="h-3 w-12 rounded bg-slate-700/60" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                  <div className="h-3 w-16 rounded bg-slate-700/60" />
                  <div className="h-3 w-14 rounded bg-slate-700/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredBoards.map((b) => {
            const up = b.changePercent >= 0;
            return (
              <div
                key={b.code}
                onClick={() => loadDetail(b)}
                className={`p-3.5 rounded-lg border transition cursor-pointer hover:scale-[1.01] hover:border-amber-500/40 ${heatBg(b.hot)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm text-white truncate">{b.name}</span>
                    <span className={`shrink-0 text-[10px] font-bold ${heatColor(b.hot)}`}>
                      <Flame className="w-3 h-3 inline mr-0.5" />
                      {b.hot}
                    </span>
                  </div>
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#16202c] border border-slate-700 text-slate-400">
                    {b.type === 'concept' ? '题材' : '行业'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold font-mono ${up ? 'text-red-400' : 'text-emerald-400'}`}>
                      {up ? '+' : ''}{b.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {b.price > 0 ? b.price.toFixed(2) : '--'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {b.upCount}涨 / {b.downCount}跌
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-400 truncate">
                    <Crown className="w-3 h-3 text-[#d4a038] shrink-0" />
                    <span className="truncate">{b.leadStockName || '-'}</span>
                  </div>
                  <span className="text-slate-500 shrink-0 ml-2">
                    成交{(b.turnover / 1e8).toFixed(1)}亿
                  </span>
                </div>
              </div>
            );
          })}
          {filteredBoards.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center text-slate-500 text-sm">
              未找到匹配的板块/题材，换个关键词试试
            </div>
          )}
        </div>
      )}
    </div>
  );
};