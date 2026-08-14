import { KlinePoint } from '../src/types';

/**
 * Session-aware minute K-line aggregation.
 * Morning session: 09:30 - 11:30
 * Afternoon session: 13:00 - 15:00
 * Aggregates 30-min data into 90-min, or 60-min into 120-min candles without crossing lunch boundary.
 */
export function aggregateMinuteKline(
  source: KlinePoint[],
  targetPeriod: '90m' | '120m'
): KlinePoint[] {
  if (!source || source.length === 0) return [];
  const groupSize = targetPeriod === '90m' ? 3 : 2; // 3 * 30m = 90m, 2 * 60m = 120m
  const result: KlinePoint[] = [];

  // Group by date first
  const dateGroups: Record<string, KlinePoint[]> = {};
  for (const item of source) {
    const dateStr = item.time.split(' ')[0] || item.time;
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = [];
    }
    dateGroups[dateStr].push(item);
  }

  for (const date in dateGroups) {
    const list = dateGroups[date];
    
    // Split into morning (<= 11:30) and afternoon (>= 13:00) sessions
    const morning = list.filter((p) => {
      const timePart = p.time.includes(' ') ? p.time.split(' ')[1] : '';
      return !timePart || timePart <= '11:35';
    });

    const afternoon = list.filter((p) => {
      const timePart = p.time.includes(' ') ? p.time.split(' ')[1] : '';
      return timePart && timePart > '11:35';
    });

    const aggregateSession = (sessionItems: KlinePoint[]) => {
      for (let i = 0; i < sessionItems.length; i += groupSize) {
        const chunk = sessionItems.slice(i, i + groupSize);
        if (chunk.length === 0) continue;

        const open = chunk[0].open;
        const close = chunk[chunk.length - 1].close;
        let high = chunk[0].high;
        let low = chunk[0].low;
        let volume = 0;
        let turnover = 0;

        for (const item of chunk) {
          if (item.high > high) high = item.high;
          if (item.low < low) low = item.low;
          volume += item.volume || 0;
          turnover += item.turnover || 0;
        }

        result.push({
          time: chunk[chunk.length - 1].time,
          open,
          high,
          low,
          close,
          volume,
          turnover,
        });
      }
    };

    aggregateSession(morning);
    aggregateSession(afternoon);
  }

  return result;
}
