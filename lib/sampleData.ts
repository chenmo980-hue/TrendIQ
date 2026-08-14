import { StockSearchResult, StockQuote, KlinePoint } from '../src/types';

export const HOT_STOCKS: StockSearchResult[] = [
  { code: '600519', name: '贵州茅台', pinyin: 'GZMT', market: 'sh', fullCode: 'sh600519', type: '白酒龙头' },
  { code: '300750', name: '宁德时代', pinyin: 'NDSD', market: 'sz', fullCode: 'sz300750', type: '新能源' },
  { code: '300059', name: '东方财富', pinyin: 'DFCF', market: 'sz', fullCode: 'sz300059', type: '券商互金' },
  { code: '688981', name: '中芯国际', pinyin: 'ZXGJ', market: 'sh', fullCode: 'sh688981', type: '半导体' },
  { code: '002594', name: '比亚迪',   pinyin: 'BYD',  market: 'sz', fullCode: 'sz002594', type: '新能源车' },
  { code: '601318', name: '中国平安', pinyin: 'ZGPA', market: 'sh', fullCode: 'sh601318', type: '金融保险' },
  { code: '603019', name: '中科曙光', pinyin: 'ZKSG', market: 'sh', fullCode: 'sh603019', type: '算力芯片' },
  { code: '000858', name: '五粮液',   pinyin: 'WLY',  market: 'sz', fullCode: 'sz000858', type: '食品饮料' },
  { code: '600036', name: '招商银行', pinyin: 'ZSYH', market: 'sh', fullCode: 'sh600036', type: '银行龙头' },
  { code: '601138', name: '工业富联', pinyin: 'GYFL', market: 'sh', fullCode: 'sh601138', type: 'AI硬件' },
  { code: '000001', name: '上证指数', pinyin: 'SZZS', market: 'sh', fullCode: 'sh000001', type: '核心大盘' },
  { code: '399006', name: '创业板指', pinyin: 'CYBZ', market: 'sz', fullCode: 'sz399006', type: '成长指数' },
];

export const PRESET_DATABASE: StockSearchResult[] = [
  ...HOT_STOCKS,
  { code: '000001', name: '平安银行', pinyin: 'PAYH', market: 'sz', fullCode: 'sz000001', type: '股份银行' },
  { code: '399001', name: '深证成指', pinyin: 'SZCZ', market: 'sz', fullCode: 'sz399001', type: '核心大盘' },
  { code: '000688', name: '科创50',   pinyin: 'KC50', market: 'sh', fullCode: 'sh000688', type: '科创指数' },
  { code: '000300', name: '沪深300',  pinyin: 'HS300', market: 'sh', fullCode: 'sh000300', type: '宽基指数' },
  { code: '600900', name: '长江电力', pinyin: 'CJDL', market: 'sh', fullCode: 'sh600900', type: '公用事业' },
  { code: '601899', name: '紫金矿业', pinyin: 'ZJKY', market: 'sh', fullCode: 'sh601899', type: '有色金属' },
  { code: '002475', name: '立讯精密', pinyin: 'LXJM', market: 'sz', fullCode: 'sz002475', type: '消费电子' },
  { code: '601012', name: '隆基绿能', pinyin: 'LJLN', market: 'sh', fullCode: 'sh601012', type: '光伏设备' },
  { code: '600030', name: '中信证券', pinyin: 'ZXZQ', market: 'sh', fullCode: 'sh600030', type: '证券龙头' },
  { code: '002230', name: '科大讯飞', pinyin: 'KDXF', market: 'sz', fullCode: 'sz002230', type: '人工智能' },
  { code: '002460', name: '赣锋锂业', pinyin: 'GFLY', market: 'sz', fullCode: 'sz002460', type: '锂电材料' },
  { code: '300033', name: '同花顺',   pinyin: 'THS',  market: 'sz', fullCode: 'sz300033', type: '金融信息' },
  { code: '601857', name: '中国石油', pinyin: 'ZGSY', market: 'sh', fullCode: 'sh601857', type: '传统能源' },
  { code: '601398', name: '工商银行', pinyin: 'GSYH', market: 'sh', fullCode: 'sh601398', type: '国有大行' },
];

export const STOCK_PRICE_MAP: Record<string, { price: number; name: string; isIndex?: boolean }> = {
  '600519': { price: 1348.91, name: '贵州茅台' },
  '300750': { price: 238.50, name: '宁德时代' },
  '300059': { price: 21.60, name: '东方财富' },
  '688981': { price: 92.30, name: '中芯国际' },
  '002594': { price: 89.01, name: '比亚迪' },
  '601318': { price: 48.20, name: '中国平安' },
  '603019': { price: 78.50, name: '中科曙光' },
  '000858': { price: 122.40, name: '五粮液' },
  '600036': { price: 38.60, name: '招商银行' },
  '601138': { price: 24.80, name: '工业富联' },
  '000001_sh': { price: 3918.65, name: '上证指数', isIndex: true },
  '000001_sz': { price: 11.85, name: '平安银行' },
  '399001': { price: 11825.16, name: '深证成指', isIndex: true },
  '399006': { price: 2435.60, name: '创业板指', isIndex: true },
  '000688': { price: 1024.30, name: '科创50', isIndex: true },
  '000300': { price: 4180.50, name: '沪深300', isIndex: true },
  '600900': { price: 29.50, name: '长江电力' },
  '601899': { price: 17.80, name: '紫金矿业' },
  '002475': { price: 39.40, name: '立讯精密' },
  '601012': { price: 18.20, name: '隆基绿能' },
  '600030': { price: 28.60, name: '中信证券' },
  '002230': { price: 46.80, name: '科大讯飞' },
  '002460': { price: 35.20, name: '赣锋锂业' },
  '300033': { price: 296.00, name: '同花顺' },
  '601857': { price: 8.92, name: '中国石油' },
  '601398': { price: 6.45, name: '工商银行' },
};

/**
 * Returns Beijing/China Date object (UTC+8)
 */
export function getBeijingDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 8);
}

/**
 * Formats a Date to YYYY-MM-DD in Beijing timezone
 */
export function formatBeijingDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates synthetic realistic A-share candlestick series anchored strictly to today's China date
 */
export function generateMockKline(
  basePrice = 100,
  count = 120,
  period = 'day',
  volatility = 0.02
): KlinePoint[] {
  const points: KlinePoint[] = [];
  let price = basePrice;
  const bjNow = getBeijingDate();

  if (period === 'day') {
    // Generate business trading days strictly up to today (e.g. 2026-08-14)
    const tradeDays: string[] = [];
    const curr = new Date(bjNow.getTime());
    
    while (tradeDays.length < count) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        tradeDays.unshift(formatBeijingDateStr(curr));
      }
      curr.setDate(curr.getDate() - 1);
    }

    for (let i = 0; i < tradeDays.length; i++) {
      const timeStr = tradeDays[i];
      const wave = Math.sin(i / 12) * 0.008;
      const changePct = (Math.random() - 0.49) * volatility * 2 + wave;
      const open = price;
      const close = Number((open * (1 + changePct)).toFixed(2));
      const range = Math.abs(close - open) + open * volatility * 0.5 * Math.random();
      const high = Number((Math.max(open, close) + range * Math.random()).toFixed(2));
      const low = Number((Math.min(open, close) - range * Math.random()).toFixed(2));
      const volume = Math.round(30000 + Math.random() * 80000 + (Math.abs(close - open) / open) * 300000);
      const turnover = Math.round(volume * close * 100);

      points.push({
        time: timeStr,
        open,
        high,
        low,
        close,
        volume,
        turnover,
      });

      price = close;
    }
  } else {
    // Minute periods
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(bjNow.getTime());
      const stepMins = period === '1m' ? 1 : period === '5m' ? 5 : period === '15m' ? 15 : period === '30m' ? 30 : 60;
      d.setMinutes(d.getMinutes() - i * stepMins);
      const ymd = formatBeijingDateStr(d);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const timeStr = `${ymd} ${hh}:${mm}`;

      const wave = Math.sin((count - i) / 12) * 0.008;
      const changePct = (Math.random() - 0.49) * volatility * 2 + wave;
      const open = price;
      const close = Number((open * (1 + changePct)).toFixed(2));
      const range = Math.abs(close - open) + open * volatility * 0.5 * Math.random();
      const high = Number((Math.max(open, close) + range * Math.random()).toFixed(2));
      const low = Number((Math.min(open, close) - range * Math.random()).toFixed(2));
      const volume = Math.round(30000 + Math.random() * 80000 + (Math.abs(close - open) / open) * 300000);
      const turnover = Math.round(volume * close * 100);

      points.push({
        time: timeStr,
        open,
        high,
        low,
        close,
        volume,
        turnover,
      });

      price = close;
    }
  }

  // Deduplicate timestamps just in case
  const uniqueMap = new Map<string, KlinePoint>();
  for (const p of points) {
    uniqueMap.set(p.time, p);
  }
  return Array.from(uniqueMap.values());
}
