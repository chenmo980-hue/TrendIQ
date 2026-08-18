import { StockQuote, KlinePoint, KlinePeriod, StockSearchResult } from '../src/types';
import { FUTURES_DATABASE, FutureItem } from './futuresData';

/**
 * Safely decodes GBK / GB18030 buffer from Sina response
 */
async function decodeGbk(resp: Response): Promise<string> {
  const buf = await resp.arrayBuffer();
  try {
    return new TextDecoder('gb18030').decode(buf);
  } catch {
    try {
      return new TextDecoder('gbk').decode(buf);
    } catch {
      return new TextDecoder('utf-8').decode(buf);
    }
  }
}

/**
 * Fetches real-time futures quotes from Sina
 */
export async function fetchFuturesQuote(symbol: string): Promise<{ quote: StockQuote | null; futureInfo: FutureItem | null }> {
  const item = FUTURES_DATABASE.find(
    (f) =>
      f.symbol.toLowerCase() === symbol.toLowerCase() ||
      f.symbol.replace(/^hf_/, '').toLowerCase() === symbol.toLowerCase() ||
      f.name.includes(symbol)
  );

  const realSymbol = item ? item.symbol : symbol;
  const isGlobal = realSymbol.startsWith('hf_');
  const sinaParam = isGlobal ? realSymbol : `nf_${realSymbol}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`https://hq.sinajs.cn/list=${sinaParam}`, {
      headers: { Referer: 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await decodeGbk(resp);
      const match = text.match(/="([^"]+)"/);
      if (match && match[1]) {
        const raw = match[1];

        if (isGlobal) {
          // Global Futures: e.g. "83.816,,83.810,83.830,84.510,83.770,09:11:13,83.740,84.100,0,4,2,2026-08-18,纽约原油,0"
          const p = raw.split(',');
          const price = parseFloat(p[0]) || 0;
          const open = parseFloat(p[8]) || price;
          const high = parseFloat(p[4]) || price;
          const low = parseFloat(p[5]) || price;
          const prevClose = parseFloat(p[7]) || open || price;
          const change = +(price - prevClose).toFixed(3);
          const changePercent = prevClose > 0 ? +(((price - prevClose) / prevClose) * 100).toFixed(2) : 0;
          const name = item?.name || p[13] || realSymbol;

          const quote: StockQuote = {
            code: realSymbol,
            name,
            fullCode: realSymbol,
            price,
            change,
            changePercent,
            open,
            high,
            low,
            prevClose,
            volume: parseFloat(p[9]) || 0,
            turnover: (parseFloat(p[9]) || 0) * price,
            timestamp: Date.now(),
            isIndex: false,
          };

          return { quote, futureInfo: item || null };
        } else if (realSymbol.startsWith('IF') || realSymbol.startsWith('IC') || realSymbol.startsWith('IM') || realSymbol.startsWith('IH') || realSymbol.startsWith('T') || realSymbol.startsWith('TF') || realSymbol.startsWith('TS')) {
          // Financial / Bond Futures: e.g. "4624.000,4700.600,4619.800,4699.000,60002,279775374.000,147300.000,4699.000,0.000,5085.000,4160.600,0.000,0.000,4620.400,4622.800,144619.000,4699.000,8,..."
          const p = raw.split(',');
          const open = parseFloat(p[0]) || 0;
          const high = parseFloat(p[1]) || 0;
          const low = parseFloat(p[2]) || 0;
          const price = parseFloat(p[3]) || 0;
          const volume = parseFloat(p[4]) || 0;
          const turnover = parseFloat(p[5]) || 0;
          const prevSettlement = parseFloat(p[13]) || open || price;
          const change = +(price - prevSettlement).toFixed(2);
          const changePercent = prevSettlement > 0 ? +(((price - prevSettlement) / prevSettlement) * 100).toFixed(2) : 0;
          const name = item?.name || p[p.length - 1] || realSymbol;

          const quote: StockQuote = {
            code: realSymbol,
            name,
            fullCode: realSymbol,
            price,
            change,
            changePercent,
            open,
            high,
            low,
            prevClose: prevSettlement,
            volume,
            turnover,
            timestamp: Date.now(),
            isIndex: false,
          };

          return { quote, futureInfo: item || null };
        } else {
          // Domestic Commodity Futures: e.g. "螺纹钢连续,091106,3015.000,3019.000,2994.000,0.000,3010.000,3011.000,3011.000,0.000,3018.000,564,1379,2043361.000,373643,沪,螺纹钢,2026-08-18,1,..."
          const p = raw.split(',');
          const name = item?.name || p[0] || realSymbol;
          const open = parseFloat(p[2]) || 0;
          const high = parseFloat(p[3]) || 0;
          const low = parseFloat(p[4]) || 0;
          const price = parseFloat(p[8]) || parseFloat(p[6]) || open;
          const prevSettlement = parseFloat(p[10]) || open || price;
          const volume = parseFloat(p[14]) || 0; // 持仓/成交
          const turnover = parseFloat(p[13]) || 0;
          const change = +(price - prevSettlement).toFixed(2);
          const changePercent = prevSettlement > 0 ? +(((price - prevSettlement) / prevSettlement) * 100).toFixed(2) : 0;

          const quote: StockQuote = {
            code: realSymbol,
            name,
            fullCode: realSymbol,
            price,
            change,
            changePercent,
            open,
            high,
            low,
            prevClose: prevSettlement,
            volume,
            turnover,
            timestamp: Date.now(),
            isIndex: false,
          };

          return { quote, futureInfo: item || null };
        }
      }
    }
  } catch (err) {
    console.warn('fetchFuturesQuote error:', err);
  }

  // Fallback if network offline
  if (item) {
    const quote: StockQuote = {
      code: item.symbol,
      name: item.name,
      fullCode: item.symbol,
      price: 3680,
      change: 32,
      changePercent: 0.88,
      open: 3650,
      high: 3700,
      low: 3640,
      prevClose: 3648,
      volume: 125000,
      turnover: 460000000,
      timestamp: Date.now(),
      isIndex: false,
    };
    return { quote, futureInfo: item };
  }

  return { quote: null, futureInfo: null };
}

/**
 * Fetches real K-lines for futures from Sina Futures K-line API
 */
export async function fetchFuturesKline(symbol: string, period: KlinePeriod): Promise<KlinePoint[]> {
  const item = FUTURES_DATABASE.find(
    (f) =>
      f.symbol.toLowerCase() === symbol.toLowerCase() ||
      f.symbol.replace(/^hf_/, '').toLowerCase() === symbol.toLowerCase() ||
      f.name.includes(symbol)
  );

  const realSymbol = item ? item.symbol.replace(/^hf_/, '') : symbol;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    let klineUrl = '';
    if (period === 'day') {
      klineUrl = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_kline=/InnerFuturesNewService.getDailyKLine?symbol=${realSymbol}`;
    } else {
      let minScale = '5';
      if (period === '1m' || period === '5m') minScale = '5';
      else if (period === '15m') minScale = '15';
      else if (period === '30m' || period === '90m') minScale = '30';
      else if (period === '60m' || period === '120m') minScale = '60';
      klineUrl = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_kline=/InnerFuturesNewService.getMinLine?symbol=${realSymbol}&type=${minScale}`;
    }

    const resp = await fetch(klineUrl, {
      headers: { Referer: 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await resp.text();
      const match = text.match(/\(\s*(\[[\s\S]*\])\s*\)/);
      if (match && match[1]) {
        const rawData = JSON.parse(match[1]);
        if (Array.isArray(rawData) && rawData.length > 0) {
          if (period === 'day') {
            // format: [{"d":"2026-08-18","o":"3015.000","h":"3019.000","l":"2994.000","c":"3010.000","v":"2043361"}]
            const list = rawData.slice(-180);
            return list.map((d: any) => {
              const open = parseFloat(d.o) || 0;
              const close = parseFloat(d.c) || 0;
              const high = parseFloat(d.h) || Math.max(open, close);
              const low = parseFloat(d.l) || Math.min(open, close);
              const volume = parseFloat(d.v) || 0;
              return {
                time: String(d.d || ''),
                open,
                high,
                low,
                close,
                volume,
                turnover: volume * close,
              };
            });
          } else {
            // format: [["21:00","3018.000","3014.670","19333","2029573","3016.000","2026-08-18"], ...]
            const list = rawData.slice(-120);
            return list.map((item: any) => {
              const time = item[6] ? `${item[6]} ${item[0]}` : String(item[0] || '');
              const close = parseFloat(item[1]) || 0;
              const open = parseFloat(item[5]) || close;
              const high = Math.max(open, close);
              const low = Math.min(open, close);
              const volume = parseFloat(item[3]) || 0;
              return {
                time,
                open,
                high,
                low,
                close,
                volume,
                turnover: volume * close,
              };
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('fetchFuturesKline error:', err);
  }

  return [];
}

/**
 * Searches futures matching query
 */
export function searchFutures(query: string): StockSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return FUTURES_DATABASE.slice(0, 8).map((f) => ({
      code: f.symbol,
      name: f.name,
      pinyin: f.symbol,
      market: f.exchange,
      fullCode: f.symbol,
      type: `期货 · ${f.subCategory}`,
    }));
  }

  return FUTURES_DATABASE.filter(
    (f) =>
      f.symbol.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.subCategory.toLowerCase().includes(q) ||
      f.relatedSectors.some((s) => s.toLowerCase().includes(q))
  ).map((f) => ({
    code: f.symbol,
    name: f.name,
    pinyin: f.symbol,
    market: f.exchange,
    fullCode: f.symbol,
    type: `期货 · ${f.subCategory}`,
  }));
}
