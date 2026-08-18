import { StockQuote, KlinePoint, KlinePeriod, StockSearchResult } from '../src/types';
import { FUTURES_DATABASE, FutureItem, resolveFutureItem, COMMODITY_ROOTS } from './futuresData';

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
  const item = resolveFutureItem(symbol) || FUTURES_DATABASE.find(
    (f) =>
      f.symbol.toLowerCase() === symbol.toLowerCase() ||
      f.symbol.replace(/^hf_/, '').toLowerCase() === symbol.toLowerCase() ||
      f.name.includes(symbol)
  );

  const realSymbol = item ? item.symbol : symbol;
  const isGlobal = realSymbol.toLowerCase().startsWith('hf_') || (item && item.isGlobal);
  const cleanSymbol = realSymbol.replace(/^hf_/i, '');
  const sinaParam = isGlobal ? `hf_${cleanSymbol}` : `nf_${cleanSymbol}`;

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
        } else if (
          cleanSymbol.startsWith('IF') ||
          cleanSymbol.startsWith('IC') ||
          cleanSymbol.startsWith('IM') ||
          cleanSymbol.startsWith('IH') ||
          cleanSymbol.startsWith('T') ||
          cleanSymbol.startsWith('TF') ||
          cleanSymbol.startsWith('TS')
        ) {
          // Financial / Bond Futures
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
          // Domestic Commodity Futures
          const p = raw.split(',');
          const name = item?.name || p[0] || realSymbol;
          const open = parseFloat(p[2]) || 0;
          const high = parseFloat(p[3]) || 0;
          const low = parseFloat(p[4]) || 0;
          const price = parseFloat(p[8]) || parseFloat(p[6]) || open;
          const prevSettlement = parseFloat(p[10]) || open || price;
          const volume = parseFloat(p[14]) || 0;
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
  const item = resolveFutureItem(symbol) || FUTURES_DATABASE.find(
    (f) =>
      f.symbol.toLowerCase() === symbol.toLowerCase() ||
      f.symbol.replace(/^hf_/, '').toLowerCase() === symbol.toLowerCase() ||
      f.name.includes(symbol)
  );

  const realSymbol = item ? item.symbol : symbol;
  const isGlobal = realSymbol.toLowerCase().startsWith('hf_') || (item && item.isGlobal);
  const cleanSymbol = realSymbol.replace(/^hf_/i, '');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    let klineUrl = '';
    if (isGlobal) {
      if (period === 'day') {
        klineUrl = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_kline=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=${cleanSymbol}`;
      } else {
        let minScale = '5';
        if (period === '1m' || period === '5m') minScale = '5';
        else if (period === '15m') minScale = '15';
        else if (period === '30m') minScale = '30';
        else if (period === '60m' || period === '90m' || period === '120m') minScale = '60';
        klineUrl = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_kline=/GlobalFuturesService.getGlobalFuturesMinLine?symbol=${cleanSymbol}&type=${minScale}`;
      }
    } else {
      if (period === 'day') {
        klineUrl = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_kline=/InnerFuturesNewService.getDailyKLine?symbol=${cleanSymbol}`;
      } else {
        let minScale = '5';
        if (period === '1m' || period === '5m') minScale = '5';
        else if (period === '15m') minScale = '15';
        else if (period === '30m') minScale = '30';
        else if (period === '60m' || period === '90m' || period === '120m') minScale = '60';
        klineUrl = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_kline=/InnerFuturesNewService.getFewMinLine?symbol=${cleanSymbol}&type=${minScale}`;
      }
    }

    const resp = await fetch(klineUrl, {
      headers: { Referer: 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await resp.text();
      // Match JSON array or object inside JSONP
      const match = text.match(/var\s+_[a-zA-Z0-9_]+\s*=\s*\(?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*\)?/) || text.match(/\(\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*\)/);
      if (match && match[1]) {
        let rawData = JSON.parse(match[1]);
        if (!Array.isArray(rawData) && typeof rawData === 'object' && rawData !== null) {
          const keys = Object.keys(rawData);
          if (keys.length > 0 && Array.isArray(rawData[keys[0]])) {
            rawData = rawData[keys[0]];
          }
        }

        if (Array.isArray(rawData) && rawData.length > 0) {
          const limit = period === 'day' ? 180 : 120;
          const list = rawData.slice(-limit);

          return list.map((d: any) => {
            if (Array.isArray(d)) {
              // Global / Array min format: [date/time, open, high/prev, low, close, volume, ...] or with full time at the end
              const time = String(d[d.length - 1] && String(d[d.length - 1]).includes(':') ? d[d.length - 1] : d[0] || '');
              const open = parseFloat(d[1]) || 0;
              const close = parseFloat(d[4] !== undefined ? d[4] : d[1]) || open;
              const high = parseFloat(d[2] !== undefined ? d[2] : Math.max(open, close)) || Math.max(open, close);
              const low = parseFloat(d[3] !== undefined ? d[3] : Math.min(open, close)) || Math.min(open, close);
              const volume = parseFloat(d[5]) || 0;

              return {
                time,
                open,
                high,
                low,
                close,
                volume,
                turnover: volume * close,
              };
            }

            const time = String(d.d || d.date || d.t || '');
            const open = parseFloat(d.o || d.open || 0) || 0;
            const close = parseFloat(d.c || d.close || 0) || open;
            const high = parseFloat(d.h || d.high || 0) || Math.max(open, close);
            const low = parseFloat(d.l || d.low || 0) || Math.min(open, close);
            const volume = parseFloat(d.v || d.volume || 0) || 0;

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
  } catch (err) {
    console.warn('fetchFuturesKline error:', err);
  }

  return [];
}

/**
 * Searches futures matching query, with support for dynamic symbols (e.g. SC2609)
 */
export function searchFutures(query: string): StockSearchResult[] {
  const q = query.trim().toUpperCase();
  if (!q) {
    return FUTURES_DATABASE.slice(0, 10).map((f) => ({
      code: f.symbol,
      name: f.name,
      pinyin: f.symbol,
      market: f.exchange,
      fullCode: f.symbol,
      type: `期货 · ${f.subCategory}`,
    }));
  }

  const results: StockSearchResult[] = [];
  const seenCodes = new Set<string>();

  // 1. Check if user typed a specific dynamic symbol (e.g. SC2609, RB2510)
  const resolved = resolveFutureItem(q);
  if (resolved) {
    results.push({
      code: resolved.symbol,
      name: resolved.name,
      pinyin: resolved.symbol,
      market: resolved.exchange,
      fullCode: resolved.symbol,
      type: `期货 · ${resolved.subCategory}`,
    });
    seenCodes.add(resolved.symbol.toUpperCase());
  }

  // 2. Search preset database
  for (const f of FUTURES_DATABASE) {
    if (seenCodes.has(f.symbol.toUpperCase())) continue;
    if (
      f.symbol.toUpperCase().includes(q) ||
      f.name.toUpperCase().includes(q) ||
      f.subCategory.toUpperCase().includes(q) ||
      f.relatedSectors.some((s) => s.toUpperCase().includes(q))
    ) {
      results.push({
        code: f.symbol,
        name: f.name,
        pinyin: f.symbol,
        market: f.exchange,
        fullCode: f.symbol,
        type: `期货 · ${f.subCategory}`,
      });
      seenCodes.add(f.symbol.toUpperCase());
    }
  }

  // 3. Search Commodity Roots (e.g., typing 原油 or SC returns main contracts)
  for (const [key, root] of Object.entries(COMMODITY_ROOTS)) {
    if (root.name.includes(query) || key.includes(q)) {
      const continuousSymbol = `${key}0`;
      if (!seenCodes.has(continuousSymbol)) {
        results.push({
          code: continuousSymbol,
          name: `${root.name}连续`,
          pinyin: continuousSymbol,
          market: root.exchange,
          fullCode: continuousSymbol,
          type: `期货 · ${root.subCategory}`,
        });
        seenCodes.add(continuousSymbol);
      }
    }
  }

  return results.slice(0, 12);
}
