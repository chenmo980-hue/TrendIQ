import { KlinePoint, MAValues, MACDValues, RSIValues, BOLLValues, KDJValues, SupportResistanceLevel, Trendline } from '../src/types';

/**
 * Calculate Simple Moving Average (MA)
 */
export function calculateMA(data: KlinePoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) {
      sum -= data[i - period].close;
    }
    if (i >= period - 1) {
      result.push(Number((sum / period).toFixed(3)));
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: KlinePoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < data.length; i++) {
    const close = data[i].close;
    if (ema === null) {
      ema = close;
    } else {
      ema = close * k + ema * (1 - k);
    }
    result.push(Number(ema.toFixed(3)));
  }
  return result;
}

/**
 * Calculate All MA lines (5, 10, 20, 30, 60, 120)
 */
export function calculateAllMA(data: KlinePoint[]): MAValues {
  return {
    ma5: calculateMA(data, 5),
    ma10: calculateMA(data, 10),
    ma20: calculateMA(data, 20),
    ma30: calculateMA(data, 30),
    ma60: calculateMA(data, 60),
    ma120: calculateMA(data, 120),
  };
}

/**
 * Calculate MACD (DIF, DEA, MACD Bar)
 * Standard: Fast=12, Slow=26, Signal=9
 */
export function calculateMACD(data: KlinePoint[], fast = 12, slow = 26, signal = 9): MACDValues {
  const dif: (number | null)[] = [];
  const dea: (number | null)[] = [];
  const macd: (number | null)[] = [];

  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);

  const rawDif: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const f = emaFast[i];
    const s = emaSlow[i];
    if (f !== null && s !== null) {
      const d = f - s;
      dif.push(Number(d.toFixed(3)));
      rawDif.push(d);
    } else {
      dif.push(null);
      rawDif.push(0);
    }
  }

  // Calculate DEA (EMA of DIF with signal period)
  const k = 2 / (signal + 1);
  let currentDea: number | null = null;
  for (let i = 0; i < data.length; i++) {
    const d = rawDif[i];
    if (currentDea === null) {
      currentDea = d;
    } else {
      currentDea = d * k + currentDea * (1 - k);
    }
    const formattedDea = Number(currentDea.toFixed(3));
    dea.push(formattedDea);

    const currentDif = dif[i];
    if (currentDif !== null) {
      // In Chinese A-share standard: MACD Bar = 2 * (DIF - DEA)
      const bar = Number((2 * (currentDif - formattedDea)).toFixed(3));
      macd.push(bar);
    } else {
      macd.push(null);
    }
  }

  return { dif, dea, macd };
}

/**
 * Calculate RSI (Relative Strength Index)
 * Standard: 6, 12, 24
 */
export function calculateRSI(data: KlinePoint[], periods = [6, 12, 24]): RSIValues {
  const calcSingleRSI = (period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    if (data.length < period) {
      return data.map(() => null);
    }

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(null);
      } else if (i === period) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        result.push(Number(rsi.toFixed(2)));
      } else {
        const change = data[i].close - data[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        result.push(Number(rsi.toFixed(2)));
      }
    }
    return result;
  };

  return {
    rsi6: calcSingleRSI(periods[0] || 6),
    rsi12: calcSingleRSI(periods[1] || 12),
    rsi24: calcSingleRSI(periods[2] || 24),
  };
}

/**
 * Calculate Bollinger Bands (BOLL)
 * Standard: 20-period SMA, 2 standard deviations
 */
export function calculateBOLL(data: KlinePoint[], period = 20, multiplier = 2): BOLLValues {
  const mid: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  const ma20 = calculateMA(data, period);

  for (let i = 0; i < data.length; i++) {
    const ma = ma20[i];
    if (ma === null || i < period - 1) {
      mid.push(null);
      upper.push(null);
      lower.push(null);
      continue;
    }

    // Standard deviation of close prices over period
    let sumSquares = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].close - ma;
      sumSquares += diff * diff;
    }
    const stdDev = Math.sqrt(sumSquares / period);

    const u = ma + multiplier * stdDev;
    const l = ma - multiplier * stdDev;

    mid.push(ma);
    upper.push(Number(u.toFixed(3)));
    lower.push(Number(l.toFixed(3)));
  }

  return { mid, upper, lower };
}

/**
 * Calculate KDJ Stochastic Oscillator
 * Standard: 9, 3, 3
 */
export function calculateKDJ(data: KlinePoint[], n = 9, m1 = 3, m2 = 3): KDJValues {
  const kList: (number | null)[] = [];
  const dList: (number | null)[] = [];
  const jList: (number | null)[] = [];

  let lastK = 50;
  let lastD = 50;

  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      kList.push(null);
      dList.push(null);
      jList.push(null);
      continue;
    }

    // Find lowest low and highest high in window [i - n + 1, i]
    let lowMin = data[i].low;
    let highMax = data[i].high;

    for (let j = i - n + 1; j <= i; j++) {
      if (data[j].low < lowMin) lowMin = data[j].low;
      if (data[j].high > highMax) highMax = data[j].high;
    }

    const close = data[i].close;
    const rsv = highMax === lowMin ? 50 : ((close - lowMin) / (highMax - lowMin)) * 100;

    // Smoothed K and D (default weights: (m1-1)/m1 and 1/m1)
    const k = (2 / m1) * rsv + (1 - 1 / m1) * lastK;
    const d = (1 / m2) * k + (1 - 1 / m2) * lastD;
    const j = 3 * k - 2 * d;

    lastK = k;
    lastD = d;

    kList.push(Number(k.toFixed(2)));
    dList.push(Number(d.toFixed(2)));
    jList.push(Number(j.toFixed(2)));
  }

  return { k: kList, d: dList, j: jList };
}

/**
 * Detect Support and Resistance key price levels based on local extrema clustering
 */
export function detectSupportResistance(data: KlinePoint[]): {
  supports: number[];
  resistances: number[];
  levels: SupportResistanceLevel[];
} {
  if (data.length < 15) {
    return { supports: [], resistances: [], levels: [] };
  }

  const currentPrice = data[data.length - 1].close;
  const swingWindow = 4;
  const swingLows: number[] = [];
  const swingHighs: number[] = [];

  // Find swing points
  for (let i = swingWindow; i < data.length - swingWindow; i++) {
    const curLow = data[i].low;
    const curHigh = data[i].high;

    let isLow = true;
    let isHigh = true;

    for (let j = i - swingWindow; j <= i + swingWindow; j++) {
      if (j === i) continue;
      if (data[j].low < curLow) isLow = false;
      if (data[j].high > curHigh) isHigh = false;
    }

    if (isLow) swingLows.push(curLow);
    if (isHigh) swingHighs.push(curHigh);
  }

  // Cluster nearby prices (within 1.5%)
  const clusterLevels = (prices: number[], type: 'support' | 'resistance'): SupportResistanceLevel[] => {
    if (prices.length === 0) return [];
    prices.sort((a, b) => a - b);

    const clusters: { sum: number; count: number; prices: number[] }[] = [];
    for (const p of prices) {
      let added = false;
      for (const c of clusters) {
        const avg = c.sum / c.count;
        if (Math.abs(p - avg) / avg < 0.02) {
          c.sum += p;
          c.count += 1;
          c.prices.push(p);
          added = true;
          break;
        }
      }
      if (!added) {
        clusters.push({ sum: p, count: 1, prices: [p] });
      }
    }

    return clusters.map((c) => {
      const price = Number((c.sum / c.count).toFixed(2));
      const strength = Math.min(5, Math.max(1, c.count));
      const distPercent = (((price - currentPrice) / currentPrice) * 100).toFixed(1);
      return {
        price,
        type,
        strength,
        touches: c.count,
        description: `${type === 'support' ? '支撑位' : '压力位'} ${price} (距离 ${distPercent}%, 触及 ${c.count} 次)`,
      };
    });
  };

  const allSupports = clusterLevels(swingLows, 'support')
    .filter((l) => l.price <= currentPrice * 1.01)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  const allResistances = clusterLevels(swingHighs, 'resistance')
    .filter((l) => l.price >= currentPrice * 0.99)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  const supports = allSupports.map((s) => s.price);
  const resistances = allResistances.map((r) => r.price);

  return {
    supports,
    resistances,
    levels: [...allSupports, ...allResistances],
  };
}

/**
 * Detect automatic trendlines (ascending support, descending resistance)
 */
export function detectTrendlines(data: KlinePoint[]): Trendline[] {
  if (data.length < 20) return [];
  const lines: Trendline[] = [];

  const lookback = Math.min(60, data.length);
  const subset = data.slice(-lookback);
  const offset = data.length - lookback;

  // Find prominent troughs for support trendline
  const troughs: { index: number; price: number }[] = [];
  const peaks: { index: number; price: number }[] = [];

  for (let i = 2; i < subset.length - 2; i++) {
    if (subset[i].low <= subset[i - 1].low && subset[i].low <= subset[i - 2].low &&
        subset[i].low <= subset[i + 1].low && subset[i].low <= subset[i + 2].low) {
      troughs.push({ index: offset + i, price: subset[i].low });
    }
    if (subset[i].high >= subset[i - 1].high && subset[i].high >= subset[i - 2].high &&
        subset[i].high >= subset[i + 1].high && subset[i].high >= subset[i + 2].high) {
      peaks.push({ index: offset + i, price: subset[i].high });
    }
  }

  // Ascending support trendline (from first significant trough to later higher trough)
  if (troughs.length >= 2) {
    const p1 = troughs[0];
    const p2 = troughs[troughs.length - 1];
    if (p2.index > p1.index + 5) {
      const slope = (p2.price - p1.price) / (p2.index - p1.index);
      lines.push({
        type: 'support',
        startIndex: p1.index,
        endIndex: data.length - 1,
        startPrice: p1.price,
        endPrice: Number((p1.price + slope * (data.length - 1 - p1.index)).toFixed(2)),
        slope,
      });
    }
  }

  // Descending resistance trendline
  if (peaks.length >= 2) {
    const p1 = peaks[0];
    const p2 = peaks[peaks.length - 1];
    if (p2.index > p1.index + 5) {
      const slope = (p2.price - p1.price) / (p2.index - p1.index);
      lines.push({
        type: 'resistance',
        startIndex: p1.index,
        endIndex: data.length - 1,
        startPrice: p1.price,
        endPrice: Number((p1.price + slope * (data.length - 1 - p1.index)).toFixed(2)),
        slope,
      });
    }
  }

  return lines;
}
