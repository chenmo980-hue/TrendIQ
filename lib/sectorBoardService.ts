import { StockQuote, LimitUpStock } from '../src/types';
import { fetchLiveLimitUpPool } from './realtimeLimitUpService';

export interface SectorBoardItem {
  code: string; // BK1492
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
  hot: number; // composite heat score 0-100
}

export interface SectorBoardConstituent {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  turnover: number;
  turnoverRate: number;
  marketCap: number;
  volume: number;
  // Enriched limit-up data (merged from the live 涨停池 when available)
  consecutiveBoards?: number;
  boardText?: string;
  firstTime?: string;
  lastTime?: string;
  sealAmount?: number;
  openCount?: number;
  isBroken?: boolean;
}

export interface SectorBoardDetailResponse {
  board: SectorBoardItem;
  quote: StockQuote;
  constituents: SectorBoardConstituent[];
}

const INDUSTRY_FS = 'm:90+t:2+f:!50';
const CONCEPT_FS = 'm:90+t:3+f:!50';

const BOARD_FIELDS = 'f12,f14,f2,f3,f4,f6,f8,f20,f104,f105,f106,f128,f136';
const CONSTITUENT_FIELDS = 'f12,f14,f2,f3,f4,f5,f6,f8,f20';

const CLIST_BASE =
  'https://push2.eastmoney.com/api/qt/clist/get?pn=1&np=1&fltt=2&invt=2&fid=f3';

/**
 * Computes a composite heat score (0-100) from board metrics.
 * Emphasizes changePercent, turnover magnitude and breadth (up vs down counts).
 */
function computeHeat(b: {
  changePercent: number;
  turnover: number;
  upCount: number;
  downCount: number;
}): number {
  const chg = Math.max(-5, Math.min(10, b.changePercent));
  const chgScore = ((chg + 5) / 15) * 100; // -5% → 0, +10% → 100

  const turnoverB = Math.log10(b.turnover + 1) / 10; // normalize ~0..1 (up to 100亿+)
  const turnoverScore = turnoverB * 100;

  const total = b.upCount + b.downCount;
  const breadthScore = total > 0 ? (b.upCount / total) * 100 : 50;

  return Math.round(chgScore * 0.5 + turnoverScore * 0.2 + breadthScore * 0.3);
}

/**
 * Fetches the real-time sector / concept board list from Eastmoney.
 */
export async function fetchSectorBoards(
  type: 'industry' | 'concept' | 'all' = 'all',
  sortBy: 'changePercent' | 'turnover' | 'upCount' | 'hot' = 'hot',
  order: 'desc' | 'asc' = 'desc'
): Promise<SectorBoardItem[]> {
  const controllers: AbortController[] = [];

  const fetchOne = async (fs: string, boardType: 'industry' | 'concept'): Promise<SectorBoardItem[]> => {
    try {
      const controller = new AbortController();
      controllers.push(controller);
      const timer = setTimeout(() => controller.abort(), 5000);

      const url = `${CLIST_BASE}&po=1&fs=${encodeURIComponent(fs)}&fields=${BOARD_FIELDS}&pz=600`;
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://quote.eastmoney.com/center/boardlist.html',
          Connection: 'close',
        },
      });
      clearTimeout(timer);
      if (!resp.ok) return [];

      const json = await resp.json();
      const list = json?.data?.diff || [];
      if (!Array.isArray(list)) return [];

      const items: SectorBoardItem[] = [];
      for (const x of list) {
        const code = String(x.f12 || '').trim();
        const name = String(x.f14 || '').trim();
        if (!code || !name) continue;

        const price = parseFloat(x.f2) || 0;
        const changePercent = parseFloat(x.f3) || 0;
        const change = parseFloat(x.f4) || 0;
        const turnover = parseFloat(x.f6) || 0;
        const turnoverRate = parseFloat(x.f8) || 0;
        const marketCap = parseFloat(x.f20) || 0;
        const upCount = parseInt(x.f104, 10) || 0;
        const downCount = parseInt(x.f105, 10) || 0;
        const flatCount = parseInt(x.f106, 10) || 0;
        const leadStockName = String(x.f128 || '').trim();
        const leadStockCode = String(x.f136 || '').trim();

        items.push({
          code,
          name,
          price,
          change,
          changePercent,
          turnover,
          turnoverRate,
          marketCap,
          upCount,
          downCount,
          flatCount,
          leadStockName,
          leadStockCode,
          type: boardType,
          hot: computeHeat({ changePercent, turnover, upCount, downCount }),
        });
      }
      return items;
    } catch {
      return [];
    }
  };

  try {
    const results: SectorBoardItem[] = [];
    if (type === 'industry' || type === 'all') {
      const ind = await fetchOne(INDUSTRY_FS, 'industry');
      results.push(...ind);
    }
    if (type === 'concept' || type === 'all') {
      const con = await fetchOne(CONCEPT_FS, 'concept');
      results.push(...con);
    }

    results.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return order === 'asc' ? av - bv : bv - av;
    });

    return results;
  } finally {
    for (const c of controllers) c.abort();
  }
}

/**
 * Fetches a single board's quote (real-time board index snapshot).
 */
export async function fetchSectorBoardQuote(bkCode: string): Promise<StockQuote | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const clean = bkCode.replace(/^(BK_|bk|BK)/i, '').toUpperCase();
    const full = clean.startsWith('BK') ? clean : `BK${clean}`;

    const url =
      `https://push2.eastmoney.com/api/qt/stock/get?secid=90.${full}` +
      `&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f57,f58,f60,f104,f105,f106,f170`;

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://quote.eastmoney.com/',
        Connection: 'close',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;

    const json = await resp.json();
    const d = json?.data;
    if (!d) return null;

    // Board index quotes come back unscaled (e.g. price 80271 for 802.71,
    // changePercent 653 for 6.53%). Normalize them.
    const price = parseFloat(d.f43) || 0;
    const prevClose = parseFloat(d.f60) || price;
    const change = parseFloat(d.f169) || 0;
    const changePercent = parseFloat(d.f170) || 0;

    const scalePrice = (v: number) => (v > 10000 ? v / 100 : v);
    const scaleChgPct = (v: number) => (Math.abs(v) > 100 ? v / 100 : v);
    const scaleChg = (v: number) => (Math.abs(v) > 10000 ? v / 100 : v);

    const sPrice = scalePrice(price);
    const sPrevClose = scalePrice(prevClose);
    const sChange = scaleChg(change);
    const sChangePercent = scaleChgPct(changePercent);
    const turnover = parseFloat(d.f48) || 0;
    const upCount = parseInt(d.f104, 10) || 0;
    const downCount = parseInt(d.f105, 10) || 0;

    return {
      code: full,
      name: `板块指数`,
      fullCode: full,
      price: sPrice > 0 ? sPrice : sPrevClose,
      change: sChange,
      changePercent: sChangePercent,
      open: scalePrice(parseFloat(d.f46)) || sPrice,
      high: scalePrice(parseFloat(d.f44)) || sPrice,
      low: scalePrice(parseFloat(d.f45)) || sPrice,
      prevClose: sPrevClose || sPrice,
      volume: parseFloat(d.f51) || 0,
      turnover,
      marketCap: parseFloat(d.f20) || 0,
      timestamp: Date.now(),
      isIndex: true,
      upCount,
      downCount,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches the constituents of a board (real-time quotes).
 */
export async function fetchSectorBoardConstituents(bkCode: string): Promise<SectorBoardConstituent[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const clean = bkCode.replace(/^(BK_|bk|BK)/i, '').toUpperCase();
    const full = clean.startsWith('BK') ? clean : `BK${clean}`;

    const url =
      `${CLIST_BASE}&po=1&fs=${encodeURIComponent('b:' + full)}&fields=${CONSTITUENT_FIELDS}&pz=300`;

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://quote.eastmoney.com/',
        Connection: 'close',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return [];

    const json = await resp.json();
    const list = json?.data?.diff || [];
    if (!Array.isArray(list)) return [];

    const items: SectorBoardConstituent[] = [];
    for (const x of list) {
      const code = String(x.f12 || '').trim();
      const name = String(x.f14 || '').trim();
      if (!code || !name) continue;

      items.push({
        code,
        name,
        price: parseFloat(x.f2) || 0,
        change: parseFloat(x.f4) || 0,
        changePercent: parseFloat(x.f3) || 0,
        turnover: parseFloat(x.f6) || 0,
        turnoverRate: parseFloat(x.f8) || 0,
        marketCap: parseFloat(x.f20) || 0,
        volume: parseFloat(x.f5) || 0,
      });
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Fetches board quote + constituents in one call.
 */
export async function fetchSectorBoardDetail(bkCode: string): Promise<SectorBoardDetailResponse | null> {
  const clean = bkCode.replace(/^(BK_|bk|BK)/i, '').toUpperCase();
  const full = clean.startsWith('BK') ? clean : `BK${clean}`;

  const [quote, rawConstituents, boards, limitUpPool] = await Promise.all([
    fetchSectorBoardQuote(full),
    fetchSectorBoardConstituents(full),
    fetchSectorBoards('all', 'hot', 'desc'),
    fetchLiveLimitUpPool().catch(() => [] as LimitUpStock[]),
  ]);

  // Merge live limit-up pool data (first/last seal time, seal amount, board
  // count, broken count) into matching constituents so the 板块热点 detail page
  // can show the same 龙虎榜-style fields as the limit-up board.
  const limitUpMap = new Map<string, LimitUpStock>();
  for (const lu of limitUpPool) limitUpMap.set(lu.code, lu);

  const constituents = rawConstituents.map((c) => {
    const lu = limitUpMap.get(c.code);
    if (!lu) return c;
    return {
      ...c,
      consecutiveBoards: lu.consecutiveBoards,
      boardText: lu.boardText,
      firstTime: lu.firstTime,
      lastTime: lu.lastTime,
      sealAmount: lu.sealAmount,
      openCount: lu.openCount,
      isBroken: lu.isBroken,
    };
  });

  const board = boards.find((b) => b.code === full);
  if (!board && !quote) return null;

  const finalBoard: SectorBoardItem = board || {
    code: full,
    name: full,
    price: quote?.price || 0,
    change: quote?.change || 0,
    changePercent: quote?.changePercent || 0,
    turnover: quote?.turnover || 0,
    turnoverRate: 0,
    marketCap: 0,
    upCount: quote?.upCount || 0,
    downCount: quote?.downCount || 0,
    flatCount: 0,
    leadStockName: constituents[0]?.name || '',
    leadStockCode: constituents[0]?.code || '',
    type: 'industry',
    hot: 0,
  };

  if (quote) {
    finalBoard.price = quote.price;
    finalBoard.change = quote.change;
    finalBoard.changePercent = quote.changePercent;
    finalBoard.turnover = quote.turnover;
    finalBoard.upCount = quote.upCount || finalBoard.upCount;
    finalBoard.downCount = quote.downCount || finalBoard.downCount;
    finalBoard.hot = computeHeat({
      changePercent: finalBoard.changePercent,
      turnover: finalBoard.turnover,
      upCount: finalBoard.upCount,
      downCount: finalBoard.downCount,
    });
  }

  return { board: finalBoard, quote: quote || null as any, constituents };
}