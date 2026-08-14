import { MarketIndexItem } from '../src/types';

export async function fetchMarketContext(): Promise<MarketIndexItem[]> {
  const indexNameMap: Record<string, string> = {
    sh000001: '上证指数',
    sz399001: '深证成指',
    sz399006: '创业板指',
    sh000688: '科创50',
    sh000300: '沪深300',
  };

  const defaultIndices: MarketIndexItem[] = [
    { code: 'sh000001', name: '上证指数', price: 3358.42, change: 16.28, changePercent: 0.49, volume: 385000000, turnover: 492000000000 },
    { code: 'sz399001', name: '深证成指', price: 10825.16, change: 89.65, changePercent: 0.83, volume: 462000000, turnover: 673000000000 },
    { code: 'sz399006', name: '创业板指', price: 2246.88, change: 25.12, changePercent: 1.13, volume: 185000000, turnover: 312000000000 },
    { code: 'sh000688', name: '科创50',   price: 1012.35, change: 12.48, changePercent: 1.25, volume: 82000000,  turnover: 125000000000 },
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch('https://qt.gtimg.cn/q=sh000001,sz399001,sz399006,sh000688', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    clearTimeout(timer);

    if (!resp.ok) return defaultIndices;
    
    // Tencent quote returns GBK / GB18030 encoded bytes
    const buffer = await resp.arrayBuffer();
    let text = '';
    try {
      text = new TextDecoder('gb18030').decode(buffer);
    } catch {
      try {
        text = new TextDecoder('gbk').decode(buffer);
      } catch {
        text = new TextDecoder('utf-8').decode(buffer);
      }
    }

    const lines = text.split(';').filter((l) => l.trim().length > 0);

    const parsed: MarketIndexItem[] = [];
    for (const line of lines) {
      const match = line.match(/v_(\w+)="([^"]+)"/);
      if (!match) continue;
      const code = match[1];
      const parts = match[2].split('~');
      if (parts.length < 35) continue;

      const rawName = (parts[1] || '').trim();
      // Ensure clean Chinese name
      const name = indexNameMap[code] || (rawName && !rawName.includes('') ? rawName : (indexNameMap[code] || code));
      const price = parseFloat(parts[3]) || 0;
      const change = parseFloat(parts[31]) || 0;
      const changePercent = parseFloat(parts[32]) || 0;
      const volume = parseFloat(parts[36]) * 100 || 0;
      const turnover = parseFloat(parts[37]) * 10000 || 0;

      parsed.push({
        code,
        name,
        price,
        change,
        changePercent,
        volume,
        turnover,
      });
    }

    if (parsed.length > 0) return parsed;
  } catch {
    // Network / timeout fallback
  }

  return defaultIndices;
}
