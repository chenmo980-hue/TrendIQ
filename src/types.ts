export interface StockQuote {
  code: string;
  name: string;
  fullCode: string; // e.g. sh600519 or sz000001
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number; // in shares / hands
  turnover: number; // in RMB
  amplitude?: number; // 振幅 %
  pe?: number;
  pb?: number;
  marketCap?: number; // 总市值
  timestamp: number | string;
  isIndex?: boolean;
}

export interface KlinePoint {
  time: string; // "YYYY-MM-DD" or "YYYY-MM-DD HH:mm"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
}

export type KlinePeriod = 'day' | '1m' | '5m' | '15m' | '30m' | '60m' | '90m' | '120m';

export interface MAValues {
  ma5: (number | null)[];
  ma10: (number | null)[];
  ma20: (number | null)[];
  ma30: (number | null)[];
  ma60: (number | null)[];
  ma120: (number | null)[];
}

export interface MACDValues {
  dif: (number | null)[];
  dea: (number | null)[];
  macd: (number | null)[];
}

export interface RSIValues {
  rsi6: (number | null)[];
  rsi12: (number | null)[];
  rsi24: (number | null)[];
}

export interface BOLLValues {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export interface KDJValues {
  k: (number | null)[];
  d: (number | null)[];
  j: (number | null)[];
}

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 1-5
  touches: number;
  description: string;
}

export interface Trendline {
  type: 'support' | 'resistance';
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  slope: number;
}

export interface IndicatorSummary {
  name: string;
  status: 'bullish' | 'bearish' | 'neutral';
  text: string;
  valueDisplay: string;
}

export interface SignalItem {
  id: string;
  title: string;
  desc: string;
  level: 'bull' | 'bear' | 'warn' | 'info';
  indicator: string;
}

export interface TechnicalJudgment {
  score: number; // 0-100 (50 is neutral, >60 bullish, <40 bearish)
  direction: '强势看多' | '偏多震荡' | '中性震荡' | '偏空震荡' | '弱势看空';
  summary: string;
  signals: SignalItem[];
  supportLevels: number[];
  resistanceLevels: number[];
  indicatorsSummary: IndicatorSummary[];
  disclaimer: string;
}

export interface MarketIndexItem {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
}

export interface AIAnalysisResponse {
  trendAssessment: string;
  volumePriceAnalysis: string;
  indicatorResonance: string;
  keyLevels: string;
  riskNotice: string;
  confidenceScore: number;
  generatedAt: string;
  source?: 'gemini' | 'offline-engine' | string;
  notice?: string;
}

export interface VisionPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-100%
}

export interface VisionKeyLevel {
  price: string;
  type: 'support' | 'resistance';
  yPercent: number; // 0-100%
  desc: string;
}

export interface VisionTrendline {
  x1: number; // 0-100%
  y1: number; // 0-100%
  x2: number; // 0-100%
  y2: number; // 0-100%
  label: string;
  type: 'support' | 'resistance' | 'channel';
}

export interface VisionAnalysisResponse {
  assetName: string;
  timeframe: string;
  trend: '上升趋势' | '下降趋势' | '横盘震荡' | '反转筑底' | '高位滞涨';
  summary: string;
  patterns: VisionPattern[];
  keyLevels: VisionKeyLevel[];
  trendlines: VisionTrendline[];
  strategy: string;
  riskWarning: string;
}

export interface StockSearchResult {
  code: string;
  name: string;
  pinyin: string;
  market: string;
  fullCode: string;
  type?: string;
}
