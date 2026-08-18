export interface NormalizedStock {
  code: string;       // e.g. "600519"
  market: 'sh' | 'sz' | 'bj';
  fullCode: string;   // e.g. "sh600519"
  symbol: string;     // e.g. "600519.SH"
  isIndex: boolean;
  nameHint?: string;
}

/**
 * Common indices map
 */
const KNOWN_INDICES: Record<string, { market: 'sh' | 'sz'; name: string }> = {
  '000001': { market: 'sh', name: '上证指数' },
  '399001': { market: 'sz', name: '深证成指' },
  '399006': { market: 'sz', name: '创业板指' },
  '000688': { market: 'sh', name: '科创50' },
  '000300': { market: 'sh', name: '沪深300' },
  '000016': { market: 'sh', name: '上证50' },
  '000905': { market: 'sh', name: '中证500' },
  '000852': { market: 'sh', name: '中证1000' },
};

const COMMON_STOCK_NAMES: Record<string, { code: string; market: 'sh' | 'sz' | 'bj'; name: string }> = {
  '贵州茅台': { code: '600519', market: 'sh', name: '贵州茅台' },
  '茅台': { code: '600519', market: 'sh', name: '贵州茅台' },
  'gzmt': { code: '600519', market: 'sh', name: '贵州茅台' },
  '宁德时代': { code: '300750', market: 'sz', name: '宁德时代' },
  '宁德': { code: '300750', market: 'sz', name: '宁德时代' },
  'ndsd': { code: '300750', market: 'sz', name: '宁德时代' },
  '东方财富': { code: '300059', market: 'sz', name: '东方财富' },
  '东财': { code: '300059', market: 'sz', name: '东方财富' },
  'dfcf': { code: '300059', market: 'sz', name: '东方财富' },
  '中芯国际': { code: '688981', market: 'sh', name: '中芯国际' },
  '中芯': { code: '688981', market: 'sh', name: '中芯国际' },
  'zxgj': { code: '688981', market: 'sh', name: '中芯国际' },
  '比亚迪': { code: '002594', market: 'sz', name: '比亚迪' },
  'byd': { code: '002594', market: 'sz', name: '比亚迪' },
  '中国平安': { code: '601318', market: 'sh', name: '中国平安' },
  '平安': { code: '601318', market: 'sh', name: '中国平安' },
  'zgpa': { code: '601318', market: 'sh', name: '中国平安' },
  '平安银行': { code: '000001', market: 'sz', name: '平安银行' },
  'payh': { code: '000001', market: 'sz', name: '平安银行' },
  '中科曙光': { code: '603019', market: 'sh', name: '中科曙光' },
  'zksg': { code: '603019', market: 'sh', name: '中科曙光' },
  '五粮液': { code: '000858', market: 'sz', name: '五粮液' },
  'wly': { code: '000858', market: 'sz', name: '五粮液' },
  '招商银行': { code: '600036', market: 'sh', name: '招商银行' },
  '招行': { code: '600036', market: 'sh', name: '招商银行' },
  'zsyh': { code: '600036', market: 'sh', name: '招商银行' },
  '工业富联': { code: '601138', market: 'sh', name: '工业富联' },
  'gyfl': { code: '601138', market: 'sh', name: '工业富联' },
  '长江电力': { code: '600900', market: 'sh', name: '长江电力' },
  '长电': { code: '600900', market: 'sh', name: '长江电力' },
  'cjdl': { code: '600900', market: 'sh', name: '长江电力' },
  '紫金矿业': { code: '601899', market: 'sh', name: '紫金矿业' },
  '紫金': { code: '601899', market: 'sh', name: '紫金矿业' },
  'zjky': { code: '601899', market: 'sh', name: '紫金矿业' },
  '立讯精密': { code: '002475', market: 'sz', name: '立讯精密' },
  '立讯': { code: '002475', market: 'sz', name: '立讯精密' },
  'lxjm': { code: '002475', market: 'sz', name: '立讯精密' },
  '隆基绿能': { code: '601012', market: 'sh', name: '隆基绿能' },
  '隆基': { code: '601012', market: 'sh', name: '隆基绿能' },
  'ljln': { code: '601012', market: 'sh', name: '隆基绿能' },
  '中信证券': { code: '600030', market: 'sh', name: '中信证券' },
  '中信': { code: '600030', market: 'sh', name: '中信证券' },
  'zxzq': { code: '600030', market: 'sh', name: '中信证券' },
  '科大讯飞': { code: '002230', market: 'sz', name: '科大讯飞' },
  '讯飞': { code: '002230', market: 'sz', name: '科大讯飞' },
  'kdxf': { code: '002230', market: 'sz', name: '科大讯飞' },
  '赣锋锂业': { code: '002460', market: 'sz', name: '赣锋锂业' },
  '赣锋': { code: '002460', market: 'sz', name: '赣锋锂业' },
  'gfly': { code: '002460', market: 'sz', name: '赣锋锂业' },
  '同花顺': { code: '300033', market: 'sz', name: '同花顺' },
  'ths': { code: '300033', market: 'sz', name: '同花顺' },
  '中国石油': { code: '601857', market: 'sh', name: '中国石油' },
  '中石油': { code: '601857', market: 'sh', name: '中国石油' },
  'zgsy': { code: '601857', market: 'sh', name: '中国石油' },
  '工商银行': { code: '601398', market: 'sh', name: '工商银行' },
  '工行': { code: '601398', market: 'sh', name: '工商银行' },
  'gsyh': { code: '601398', market: 'sh', name: '工商银行' },
  '上证指数': { code: '000001', market: 'sh', name: '上证指数' },
  '大盘': { code: '000001', market: 'sh', name: '上证指数' },
  'szzs': { code: '000001', market: 'sh', name: '上证指数' },
  '深证成指': { code: '399001', market: 'sz', name: '深证成指' },
  'szcz': { code: '399001', market: 'sz', name: '深证成指' },
  '创业板指': { code: '399006', market: 'sz', name: '创业板指' },
  'cybz': { code: '399006', market: 'sz', name: '创业板指' },
  '科创50': { code: '000688', market: 'sh', name: '科创50' },
  'kc50': { code: '000688', market: 'sh', name: '科创50' },
  '沪深300': { code: '000300', market: 'sh', name: '沪深300' },
  'hs300': { code: '000300', market: 'sh', name: '沪深300' },
};

/**
 * Normalizes input stock codes (600519, sh600519, 600519.SH, 000001, etc.)
 */
export function normalizeStockCode(input: string): NormalizedStock {
  const clean = input.trim().toLowerCase();

  // Match Chinese name or shortcut first
  if (COMMON_STOCK_NAMES[clean]) {
    const item = COMMON_STOCK_NAMES[clean];
    const isIndex = !!(
      (item.market === 'sh' && (item.code === '000001' || item.code === '000300' || item.code === '000016' || item.code === '000688' || item.code === '000905')) ||
      (item.market === 'sz' && item.code.startsWith('399'))
    );
    return {
      code: item.code,
      market: item.market,
      fullCode: `${item.market}${item.code}`,
      symbol: `${item.code}.${item.market.toUpperCase()}`,
      isIndex,
      nameHint: item.name,
    };
  }
  
  // Handle prefixes like sh, sz, bj, of
  let market: 'sh' | 'sz' | 'bj' = 'sh';
  let rawCode = clean;

  if (clean.startsWith('of')) {
    rawCode = clean.slice(2);
  }

  if (rawCode.startsWith('sh') || rawCode.startsWith('sz') || rawCode.startsWith('bj')) {
    market = rawCode.slice(0, 2) as 'sh' | 'sz' | 'bj';
    rawCode = rawCode.slice(2);
  } else if (rawCode.endsWith('.sh')) {
    market = 'sh';
    rawCode = rawCode.slice(0, -3);
  } else if (rawCode.endsWith('.sz')) {
    market = 'sz';
    rawCode = rawCode.slice(0, -3);
  } else if (rawCode.endsWith('.bj')) {
    market = 'bj';
    rawCode = rawCode.slice(0, -3);
  } else {
    // 1. Shanghai Market Rules:
    // - 600xxx, 601xxx, 603xxx, 605xxx: Shanghai Main A
    // - 688xxx, 689xxx: Shanghai STAR (科创板)
    // - 50xxxx, 51xxxx, 52xxxx, 56xxxx, 58xxxx: Shanghai ETF / LOF / Funds (e.g. 510300, 501018, 588000)
    // - 11xxxx: Shanghai Convertible Bonds (e.g. 113050)
    // - 900xxx: Shanghai B-shares
    if (/^(600|601|603|605|688|689|50|51|52|56|58|110|111|113|118|900)/.test(rawCode)) {
      market = 'sh';
    } 
    // 2. Shenzhen Market Rules:
    // - 000xxx, 001xxx, 002xxx, 003xxx: Shenzhen Main A / SME
    // - 300xxx, 301xxx: Shenzhen ChiNext (创业板)
    // - 15xxxx: Shenzhen ETF (e.g. 159915)
    // - 16xxxx: Shenzhen LOF (e.g. 161129, 162411, 161725, 163402, 160416)
    // - 18xxxx: Shenzhen Funds / REITs (e.g. 184801)
    // - 12xxxx: Shenzhen Convertible Bonds (e.g. 123xxx, 127xxx, 128xxx)
    // - 200xxx: Shenzhen B-shares
    // - 399xxx: Shenzhen Indices (e.g. 399001, 399006)
    else if (/^(000|001|002|003|300|301|15|16|18|123|127|128|200|399)/.test(rawCode)) {
      market = 'sz';
    } 
    // 3. Beijing Stock Exchange Rules:
    // - 43xxxx, 83xxxx, 87xxxx, 920xxx: Beijing Stock Exchange
    else if (/^(43|83|87|920)/.test(rawCode)) {
      market = 'bj';
    } else if (rawCode === '000001' && (clean.includes('sh') || clean.includes('指') || clean.includes('上证'))) {
      market = 'sh';
    } else if (rawCode === '000001') {
      // Default 000001 without prefix: if labeled as Ping An Bank (sz) or SSE (sh)
      market = 'sz'; // Ping An Bank default, SSE is sh000001
    } else if (KNOWN_INDICES[rawCode]) {
      market = KNOWN_INDICES[rawCode].market;
    }
  }

  // Pad to 6 digits if standard stock
  if (/^\d+$/.test(rawCode) && rawCode.length < 6) {
    rawCode = rawCode.padStart(6, '0');
  }

  const isIndex = !!(
    (market === 'sh' && (rawCode === '000001' || rawCode === '000300' || rawCode === '000016' || rawCode === '000688' || rawCode === '000905')) ||
    (market === 'sz' && (rawCode.startsWith('399')))
  );

  return {
    code: rawCode,
    market,
    fullCode: `${market}${rawCode}`,
    symbol: `${rawCode}.${market.toUpperCase()}`,
    isIndex,
    nameHint: KNOWN_INDICES[rawCode]?.name,
  };
}

export function formatPrice(val?: number, decimals?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '--';
  if (decimals !== undefined) return val.toFixed(decimals);
  // Auto-format for funds, LOFs, ETFs and penny prices with 3 decimal precision (e.g. 1.789, 0.852)
  if (Math.abs(val) < 20 && Math.abs(val) > 0 && Number((val * 1000).toFixed(1)) % 10 !== 0) {
    return val.toFixed(3);
  }
  return val.toFixed(2);
}

export function formatVolume(volume?: number): string {
  if (!volume || isNaN(volume)) return '--';
  if (volume >= 100000000) {
    return (volume / 100000000).toFixed(2) + ' 亿股';
  }
  if (volume >= 10000) {
    return (volume / 10000).toFixed(2) + ' 万股';
  }
  return volume.toLocaleString() + ' 股';
}

export function formatTurnover(turnover?: number): string {
  if (!turnover || isNaN(turnover)) return '--';
  if (turnover >= 100000000) {
    return (turnover / 100000000).toFixed(2) + ' 亿元';
  }
  if (turnover >= 10000) {
    return (turnover / 10000).toFixed(2) + ' 万元';
  }
  return turnover.toLocaleString() + ' 元';
}

export const formatAmount = formatTurnover;
