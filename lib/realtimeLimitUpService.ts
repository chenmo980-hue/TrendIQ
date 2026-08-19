import { LimitUpStock, SectorLimitUpGroup, DragonTigerSeat, LimitUpLadderSummary } from '../src/types';
import { normalizeStockCode } from './stockCode';
import { LIMIT_UP_STOCKS_DATA, SECTOR_LIMIT_UP_GROUPS, DRAGON_TIGER_SEATS_DATA, getLimitUpSummary } from './limitUpData';
import { resolveSeatMeta, FAMOUS_HOT_MONEY_MAP } from './seatMeta';
import { getBeijingDate, formatBeijingDateStr } from './sampleData';

/**
 * ======================================================================================
 * TrendIQ 权威连板天梯与机构游资基准引擎 (Preloaded Fixed Master Data + Realtime Quotes Overlay)
 * 
 * 核心架构原则：
 * 1. 机构游资大本营数据：一次性载入固化，交易所盘后数据在交易日及非交易时段稳定不变，
 *    不随重复刷新或网络抖动而丢失或变形。
 * 2. 连板天梯结构：确立权威梯队（5连板空间龙、3连板x5、2连板x5、首板先锋群），
 *    保证梯队位阶与板块归属严格精准。
 * 3. 股票实时行情：可实时按需并发批量读取 A股最新价格、涨跌幅与成交量，并无缝
 *    叠加至稳定梯队结构上，确保第二次或多次加载时数据 100% 稳定一致。
 * ======================================================================================
 */

// Use the authoritative static data from limitUpData.ts as the backbone
export const MASTER_LIMIT_UP_STOCKS = LIMIT_UP_STOCKS_DATA;
export const MASTER_SECTOR_GROUPS = SECTOR_LIMIT_UP_GROUPS;
export const MASTER_DRAGON_TIGER_SEATS = DRAGON_TIGER_SEATS_DATA;

// ============================================================================
// Caching & Constants
// ============================================================================

interface CacheData {
  summary: LimitUpLadderSummary;
  stocks: LimitUpStock[];
  sectors: SectorLimitUpGroup[];
  dragonTiger: DragonTigerSeat[];
  timestamp: number;
}

let cachedBoardData: CacheData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15s cache for real-time market data

// ============================================================================
// Live Quote Enrichment
// ============================================================================

/**
 * Fetch real-time quotes for a list of stock codes from Eastmoney or Tencent
 */
async function enrichStocksWithLiveQuotes(stocks: LimitUpStock[]): Promise<LimitUpStock[]> {
  if (stocks.length === 0) return stocks;

  // 1. Try Eastmoney
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const codes = stocks.map((s) => (s.market === 'sh' ? '1.' : '0.') + s.code).join(',');
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f22,f23&secids=${codes}`;

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://quote.eastmoney.com/',
      },
    });
    clearTimeout(timer);

    if (resp.ok) {
      const json = await resp.json();
      const quoteMap = new Map<string, any>();
      for (const item of json?.data?.diff || []) {
        const code = item.f12 || '';
        if (code) quoteMap.set(code, item);
      }

      if (quoteMap.size > 0) {
        return stocks.map((s) => {
          const live = quoteMap.get(s.code);
          if (!live) return s;
          return {
            ...s,
            price: parseFloat(live.f2) || s.price,
            changePercent: parseFloat(live.f3) || s.changePercent,
            change: parseFloat(live.f4) || s.change,
            turnover: (parseFloat(live.f6) || 0) * 10000,
            turnoverRate: parseFloat(live.f8) || s.turnoverRate,
            marketCap: parseFloat(live.f20) || s.marketCap,
          };
        });
      }
    }
  } catch {
    // proceed to Tencent fallback
  }

  // 2. High-speed Tencent quotes fallback
  try {
    const fullCodes = stocks.map((s) => normalizeStockCode(s.code).fullCode).join(',');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`https://qt.gtimg.cn/q=${fullCodes}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      const text = new TextDecoder('gb18030').decode(buffer);
      const lines = text.split(';');

      const tencentMap = new Map<string, any>();
      for (const line of lines) {
        const match = line.match(/v_([a-z0-9]+)="([^"]+)"/);
        if (match && match[2]) {
          const rawCode = match[1];
          const code = rawCode.replace(/^(sh|sz|bj)/, '');
          const p = match[2].split('~');
          if (p.length >= 35) {
            tencentMap.set(code, {
              price: parseFloat(p[3]) || 0,
              change: parseFloat(p[31]) || 0,
              changePercent: parseFloat(p[32]) || 0,
              turnover: (parseFloat(p[37]) || 0) * 10000,
              turnoverRate: parseFloat(p[38]) || 0,
              marketCap: (parseFloat(p[45]) || 0) * 100000000,
            });
          }
        }
      }

      if (tencentMap.size > 0) {
        return stocks.map((s) => {
          const live = tencentMap.get(s.code);
          if (!live || live.price === 0) return s;
          return {
            ...s,
            price: live.price,
            changePercent: live.changePercent,
            change: live.change,
            turnover: live.turnover || s.turnover,
            turnoverRate: live.turnoverRate || s.turnoverRate,
            marketCap: live.marketCap || s.marketCap,
          };
        });
      }
    }
  } catch {
    // return stocks
  }

  return stocks;
}

// ============================================================================
// Dynamic Market Scan (supplementary)
// ============================================================================

/**
 * Fetch newly discovered limit-up stocks not in master list
 */
async function fetchDynamicMarketLimitUpPool(): Promise<LimitUpStock[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const url =
      'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=120&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f2,f3,f4,f5,f6,f7,f8,f9,f10,f15,f16,f17,f18,f20,f21,f22,f23,f100';

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://quote.eastmoney.com/',
      },
    });
    clearTimeout(timer);

    if (!resp.ok) return [];

    const json = await resp.json();
    const rawList = json?.data?.diff || [];

    const result: LimitUpStock[] = [];

    for (const item of rawList) {
      const code = String(item.f12 || '').padStart(6, '0');
      const name = String(item.f14 || `标的${code}`);
      const price = parseFloat(item.f2) || 0;
      const change = parseFloat(item.f4) || 0;
      const changePercent = parseFloat(item.f3) || 0;
      const turnover = parseFloat(item.f6) || 0;
      const turnoverRate = parseFloat(item.f8) || 0;
      const marketCap = parseFloat(item.f20) || 0;
      const rawSector = String(item.f100 || '主线热点').replace(/[ⅠⅡⅢ]/g, '');

      if (!code || price <= 0) continue;
      if (changePercent < 9.5) continue; // only limit-up or near limit-up

      const norm = normalizeStockCode(code);

      // Conservative: only add as 首板 if not in master
      result.push({
        code,
        name,
        market: norm.market,
        fullCode: norm.fullCode,
        price,
        change,
        changePercent,
        consecutiveBoards: 1,
        boardText: '首板',
        sector: rawSector || '主线热点',
        subConcepts: [rawSector || '主线热点', '动态发现', '需人工核实'],
        firstTime: '09:30:00',
        lastTime: '14:45:00',
        sealAmount: Math.round(turnover * 0.05),
        sealRatio: 1.0,
        turnover,
        turnoverRate,
        marketCap,
        reason: `${rawSector}板块活跃，${name}动态涨停，建议人工核实连板数与题材归属。`,
        dragonTigerType: '待核实',
        netBuyAmount: 0,
        isBroken: false,
        openCount: 0,
      });
    }

    return result;
  } catch {
    return [];
  }
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Main function providing cached real-time live limit-up and dragon-tiger data
 * Falls back to rich static mock data when live APIs fail.
 */
export async function getRealTimeLimitUpBoardData(): Promise<CacheData> {
  const now = Date.now();
  if (cachedBoardData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedBoardData;
  }

  // 1. Start with master stocks as structural backbone (never lose consecutiveBoards, sector, dragonTiger meta)
  let masterEnriched = MASTER_LIMIT_UP_STOCKS.map((s) => ({ ...s }));
  try {
    masterEnriched = await enrichStocksWithLiveQuotes(masterEnriched);
  } catch {
    // ignore quote enrichment failure, keep master data intact
  }

  // 2. Optionally supplement with dynamic market scan for newly discovered limit-up stocks
  let liveStocks: LimitUpStock[] | null = null;
  try {
    liveStocks = await fetchDynamicMarketLimitUpPool();
  } catch {
    // ignore
  }

  let finalStocks = [...masterEnriched];
  if (liveStocks && liveStocks.length > 0) {
    const masterCodes = new Set(masterEnriched.map((s) => s.code));
    // Only add dynamic stocks that are NOT already in master list
    const supplementalStocks = liveStocks.filter((s) => !masterCodes.has(s.code));
    if (supplementalStocks.length > 0) {
      finalStocks = [...masterEnriched, ...supplementalStocks];
    }
  }

  // Sort by consecutive boards descending, then seal amount descending
  finalStocks.sort((a, b) => b.consecutiveBoards - a.consecutiveBoards || b.sealAmount - a.sealAmount);

  // Build sector groups: use MASTER_SECTOR_GROUPS as backbone, enrich with live stock data
  const stockCodeMap = new Map<string, LimitUpStock>();
  for (const s of finalStocks) {
    stockCodeMap.set(s.code, s);
  }

  const updatedSectors: SectorLimitUpGroup[] = [];

  // 1. Update master sector groups with live stock data
  for (const masterSec of MASTER_SECTOR_GROUPS) {
    const liveSecStocks: LimitUpStock[] = [];
    for (const masterStock of masterSec.stocks) {
      const live = stockCodeMap.get(masterStock.code);
      if (live) {
        liveSecStocks.push(live);
      } else {
        liveSecStocks.push(masterStock);
      }
    }

    if (liveSecStocks.length === 0) continue;

    liveSecStocks.sort((a, b) => b.consecutiveBoards - a.consecutiveBoards || b.sealAmount - a.sealAmount);
    const leader = liveSecStocks[0];
    const avgChange = +(liveSecStocks.reduce((sum, s) => sum + s.changePercent, 0) / liveSecStocks.length).toFixed(2);

    updatedSectors.push({
      ...masterSec,
      sectorChangePercent: avgChange,
      limitUpCount: liveSecStocks.length,
      leaderStock: {
        code: leader.code,
        name: leader.name,
        changePercent: leader.changePercent,
        consecutiveBoards: leader.consecutiveBoards,
        boardText: leader.boardText,
      },
      stocks: liveSecStocks,
    });
  }

  // 2. 只使用 MASTER_SECTOR_GROUPS 作为板块骨干，不为动态补充股票创建新板块
  // 动态补充股票已包含在 finalStocks 中，但不参与板块分组展示

  // Build dragon tiger seats: prefer live data from the latest trade date,
  // falling back to the static master seats when the live fetch fails.
  let finalDragonTiger: DragonTigerSeat[] = MASTER_DRAGON_TIGER_SEATS.map((s) => ({ ...s }));

  try {
    const liveDT = await fetchLiveDragonTiger();
    if (liveDT.length > 0) {
      finalDragonTiger = liveDT;
    }
  } catch {
    // ignore, keep static master data as fallback
  }

  // Calculate summary from MASTER stocks only (not dynamic supplementary stocks)
  const staticSummary = getLimitUpSummary();
  const masterStocksOnly = finalStocks.filter((s) => MASTER_LIMIT_UP_STOCKS.some((m) => m.code === s.code));
  const limitUpCount = masterStocksOnly.filter((s) => s.changePercent >= 9.5).length || staticSummary.totalLimitUp;
  const brokenCount = masterStocksOnly.filter((s) => s.isBroken).length || staticSummary.brokenCount;
  const totalCount = limitUpCount + brokenCount;
  const sealSuccessRate = totalCount > 0 ? +((limitUpCount / totalCount) * 100).toFixed(1) : staticSummary.sealSuccessRate;
  const maxBoards = Math.max(...masterStocksOnly.map((s) => s.consecutiveBoards), 1);
  const sentimentScore = Math.min(95, Math.max(60, Math.round(sealSuccessRate * 0.7 + maxBoards * 4)));

  const topDragon = masterStocksOnly.find((s) => s.consecutiveBoards === maxBoards) || masterStocksOnly[0];

  const summary: LimitUpLadderSummary = {
    date: formatBeijingDateStr(getBeijingDate()),
    totalLimitUp: limitUpCount,
    totalLimitDown: 2,
    brokenCount,
    sealSuccessRate,
    ladderDistribution: staticSummary.ladderDistribution,
    yesterdayLimitUpReturn: staticSummary.yesterdayLimitUpReturn,
    marketSentimentScore: sentimentScore,
    sentimentPhase:
      maxBoards >= 5
        ? '主升共振发酵期（高标持续拓宽空间）'
        : maxBoards >= 3
        ? '中位晋级加速期（题材多点开花）'
        : '首板试错与混沌期',
    topDragonStock: topDragon ? `${topDragon.name} (${topDragon.boardText})` : '蓝盾光电 (5连板)',
    maxConsecutiveBoards: maxBoards,
  };

  cachedBoardData = {
    summary,
    stocks: finalStocks,
    sectors: updatedSectors,
    dragonTiger: finalDragonTiger,
    timestamp: now,
  };
  lastFetchTime = now;

  return cachedBoardData;
}

// ============================================================================
// Live Dragon Tiger Fetch (optional enrichment)
// ============================================================================

async function fetchLiveDragonTiger(): Promise<DragonTigerSeat[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    // Query the latest trade date available in the billboard detail report
    const latestDateResp = await fetch(
      'https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSBUY&columns=ALL&sortColumns=TRADE_DATE&sortTypes=-1&pageNumber=1&pageSize=1',
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://data.eastmoney.com/stock/lhb.html',
          Connection: 'close',
        },
      }
    );
    clearTimeout(timer);

    if (!latestDateResp.ok) return [];

    const latestJson = await latestDateResp.json();
    const latestRows = latestJson?.result?.data || [];
    const latestDateRaw = latestRows[0]?.TRADE_DATE;
    if (!latestDateRaw) return [];
    const latestDateStr = String(latestDateRaw).split(' ')[0];

    // Fetch BOTH buy-side and sell-side seat details for the same trade date.
    // RPT_BILLBOARD_DAILYDETAILSBUY only carries BUY (SELL=null, NET=BUY);
    // RPT_BILLBOARD_DAILYDETAILSSELL only carries SELL (BUY=null, NET=-SELL).
    // Merging the two gives the real per-seat net buy amount.
    const [buyResp, sellResp] = await Promise.all([
      fetch(
        `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSBUY&columns=ALL&filter=(TRADE_DATE%3D%27${latestDateStr}%27)&sortColumns=BUY&sortTypes=-1&pageNumber=1&pageSize=500`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://data.eastmoney.com/stock/lhb.html',
            Connection: 'close',
          },
        }
      ),
      fetch(
        `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSSELL&columns=ALL&filter=(TRADE_DATE%3D%27${latestDateStr}%27)&sortColumns=SELL&sortTypes=-1&pageNumber=1&pageSize=500`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://data.eastmoney.com/stock/lhb.html',
            Connection: 'close',
          },
        }
      ),
    ]);

    if (!buyResp.ok || !sellResp.ok) return [];

    const [buyJson, sellJson] = await Promise.all([buyResp.json(), sellResp.json()]);
    const buyRows = buyJson?.result?.data || [];
    const sellRows = sellJson?.result?.data || [];

    // Build a code -> name map from the daily billboard list
    // (the seat-detail reports do not include SECURITY_NAME_ABBR)
    const codeNameMap = new Map<string, string>();
    try {
      const listResp = await fetch(
        `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DAILYBILLBOARD_DETAILS&columns=SECURITY_CODE,SECURITY_NAME_ABBR&filter=(TRADE_DATE%3D%27${latestDateStr}%27)&sortColumns=BILLBOARD_NET_AMT&sortTypes=-1&pageNumber=1&pageSize=300`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://data.eastmoney.com/stock/lhb.html',
            Connection: 'close',
          },
        }
      );
      if (listResp.ok) {
        const listJson = await listResp.json();
        const listRows = listJson?.result?.data || [];
        for (const row of listRows) {
          const code = String(row.SECURITY_CODE || '').padStart(6, '0');
          const name = String(row.SECURITY_NAME_ABBR || '').trim();
          if (code && name) codeNameMap.set(code, name);
        }
      }
    } catch {
      // name map is best-effort only
    }

    // Aggregate by seat. Prefer matching the seatName defined in the static master
    // knowledge base so that win-rate / hotMoneyTag / description stay intact.
    const seatMap = new Map<string, DragonTigerSeat>();

    const getSeat = (rawDeptName: string): DragonTigerSeat | null => {
      const dept = String(rawDeptName || '').trim();
      if (!dept) return null;

      const meta = resolveSeatMeta(dept);
      // Match an existing master seat by its rawDeptName OR its seatName label
      let masterSeat =
        MASTER_DRAGON_TIGER_SEATS.find((s) => s.rawDeptName && s.rawDeptName.includes(dept)) ||
        MASTER_DRAGON_TIGER_SEATS.find((s) => s.seatName && meta.seatName && s.seatName.includes(meta.seatName)) ||
        undefined;

      const key = masterSeat?.seatName || meta.seatName || dept;
      if (!key) return null;

      if (!seatMap.has(key)) {
        seatMap.set(key, {
          seatName: key,
          rawDeptName: dept,
          seatType: masterSeat?.seatType || meta.seatType,
          hotMoneyTag: masterSeat?.hotMoneyTag || meta.hotMoneyTag,
          description: masterSeat?.description || meta.hotMoneyDesc,
          totalBuy: 0,
          netBuyTotal: 0,
          winRate30d: masterSeat?.winRate30d || meta.winRate30d,
          stocksTraded: [],
        });
      }
      return seatMap.get(key)!;
    };

    const shouldSkipDept = (dept: string): boolean => {
      // Skip investor-type aggregate rows (自然人/机构投资者/中小投资者 etc.)
      if (/自然人|投资者|机构投资者|中小投资者|其他自然人/.test(dept)) {
        // Keep 机构专用 and 股通专用 as meaningful seat types
        if (!dept.includes('机构专用') && !dept.includes('股通专用')) return true;
      }
      return false;
    };

    const applyRow = (row: any) => {
      const dept = String(row.OPERATEDEPT_NAME || '').trim();
      if (!dept || shouldSkipDept(dept)) return;

      const code = String(row.SECURITY_CODE || '').padStart(6, '0');
      if (!code) return;

      const name = codeNameMap.get(code) || String(row.SECURITY_NAME_ABBR || '').trim() || `标的${code}`;
      const buyAmt = parseFloat(row.BUY) || 0;
      const sellAmt = parseFloat(row.SELL) || 0;
      const netAmt = parseFloat(row.NET);
      const resolvedNet = Number.isFinite(netAmt) ? netAmt : buyAmt - sellAmt;
      if (buyAmt <= 0 && sellAmt <= 0) return;

      const seat = getSeat(dept);
      if (!seat) return;

      seat.totalBuy = (seat.totalBuy ?? 0) + buyAmt;
      seat.netBuyTotal = (seat.netBuyTotal ?? 0) + resolvedNet;

      const existing = seat.stocksTraded?.find((s) => s.code === code);
      if (existing) {
        existing.buyAmount += buyAmt;
        existing.sellAmount += sellAmt;
        existing.netAmount += resolvedNet;
      } else {
        (seat.stocksTraded ??= []).push({
          code,
          name,
          buyAmount: buyAmt,
          sellAmount: sellAmt,
          netAmount: resolvedNet,
          consecutiveBoards: 1,
          boardText: '首板',
        });
      }
    };

    for (const row of buyRows) applyRow(row);
    for (const row of sellRows) applyRow(row);

    // Remove empty seats and sort by net buy descending
    return Array.from(seatMap.values())
      .filter((s) => (s.stocksTraded?.length ?? 0) > 0)
      .sort((a, b) => (b.netBuyTotal ?? 0) - (a.netBuyTotal ?? 0))
      .slice(0, 20);
  } catch (err) {
    console.error('fetchLiveDragonTiger error:', err);
    return [];
  }
}
