export type AssetType = 'stock' | 'sector' | 'futures';

export interface StockQuote {
  code: string;
  name: string;
  fullCode: string; // e.g. sh600519 or sz000001 or RB0 or BK_DKJJ
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number; // in shares / hands / contracts
  turnover: number; // in RMB / USD
  amplitude?: number; // 振幅 %
  pe?: number;
  pb?: number;
  marketCap?: number; // 总市值
  timestamp: number | string;
  isIndex?: boolean;
  assetType?: AssetType;
  unit?: string;
  exchange?: string;
  category?: string;
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
  ma250: (number | null)[];
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

export interface VReversal {
  index: number;
  price: number;
  type: 'top' | 'bottom';
  label: string;
}

export interface HighlightBox {
  startIdx: number;
  endIdx: number;
  minPrice: number;
  maxPrice: number;
  type: 'top' | 'bottom' | 'breakout';
  color: string;
  borderColor: string;
  label?: string;
}

export interface TrianglePattern {
  p1: { index: number; price: number }; // peak 1
  p2: { index: number; price: number }; // trough 1
  p3: { index: number; price: number }; // peak 2 or apex
  p4?: { index: number; price: number }; // trough 2
  label?: string;
}

export interface ChannelLines {
  upper: {
    startIndex: number;
    endIndex: number;
    startPrice: number;
    endPrice: number;
  } | null;
  lower: {
    startIndex: number;
    endIndex: number;
    startPrice: number;
    endPrice: number;
  } | null;
}

export interface TradePlanLevels {
  direction: 'bull' | 'bear';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  entryZone: [number, number];
  stopZone: [number, number];
  targetZone: [number, number];
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

export interface SectorSynergyInfo {
  sectorName: string;
  sectorCode?: string;
  sectorCategory?: string;
  sectorChangePercent?: number;
  leaderName?: string;
  leaderChangePercent?: number;
  relativeStrength: '超额强势领涨' | '主升共振' | '滞涨分化' | '逆势独立' | '跟随调整' | string;
  cycleStage: '启动蓄势期' | '主升加速期' | '高位分歧期' | '退潮整理期' | string;
  analysisText: string;
  synergyTips: string;
}

export interface AIAnalysisResponse {
  trendAssessment: string;
  volumePriceAnalysis: string;
  indicatorResonance: string;
  sectorSynergy?: SectorSynergyInfo;
  keyLevels: string;
  riskNotice: string;
  confidenceScore: number;
  generatedAt: string;
  source?: string;
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

export interface LimitUpStock {
  code: string;
  name: string;
  market: string;
  fullCode: string;
  price: number;
  change: number;
  changePercent: number;
  consecutiveBoards: number; // 连板数，如 7, 5, 4, 3, 2, 1
  boardText: string; // e.g. "7连板", "5天4板", "3连板", "2连板", "首板"
  sector: string; // 主线板块，如 "低空经济", "人形机器人", "半导体/算力"
  subConcepts: string[]; // 关联概念细分
  firstTime: string; // 首次封板时间 e.g. "09:25:00"
  lastTime: string; // 最终封板时间 e.g. "09:30:15"
  sealAmount: number; // 封单金额 (元)
  sealRatio: number; // 封单比 (%)
  turnover: number; // 成交额 (元)
  turnoverRate: number; // 换手率 (%)
  marketCap: number; // 流通市值 (元)
  reason: string; // 涨停驱动与题材逻辑
  dragonTigerType?: string; // 龙虎榜席位特征
  netBuyAmount?: number; // 龙虎榜净买入 (元)
  isBroken?: boolean; // 是否曾开板 / 烂板
  openCount?: number; // 开板次数
}

export interface SectorLimitUpGroup {
  sectorId?: string;
  sectorName: string;
  sectorChangePercent: number;
  limitUpCount: number;
  totalTurnover?: number;
  leaderStock: {
    code: string;
    name: string;
    changePercent?: number;
    consecutiveBoards: number;
    boardText: string;
  };
  stocks: LimitUpStock[];
  catalyst?: string;
}

export interface DragonTigerSeat {
  code?: string;
  name?: string;
  tradeDate?: string;
  reason?: string;
  price?: number;
  changePercent?: number;
  consecutiveBoards?: number;
  boardText?: string;
  netBuyAmount?: number;
  totalAmount?: number;
  topBuyers?: {
    seatName: string;
    seatType: string;
    buyAmount: number;
    sellAmount: number;
    netAmount: number;
  }[];
  topSellers?: {
    seatName: string;
    seatType: string;
    buyAmount: number;
    sellAmount: number;
    netAmount: number;
  }[];
  seatName?: string;
  rawDeptName?: string;
  hotMoneyTag?: string; // 游资/机构代表人物标签，如 "章盟主", "葛卫东", "方新侠", "呼家楼", "公募/险资机构"
  seatType?: 'institution' | 'hot_money' | 'northbound' | string;
  totalBuy?: number;
  netBuyTotal?: number;
  winRate30d?: number; // 30天胜率
  description?: string;
  stocksTraded?: {
    code: string;
    name: string;
    buyAmount: number;
    sellAmount: number;
    netAmount: number;
    consecutiveBoards: number;
    boardText: string;
    changePercent?: number;
  }[];
}

export interface StockDragonTigerSeatItem {
  rank: number;
  seatName: string;
  rawDeptName: string;
  seatType: 'institution' | 'hot_money' | 'northbound' | 'retail';
  hotMoneyTag: string;
  hotMoneyDesc: string;
  winRate30d: number;
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
  ratio: number; // %
}

export interface StockDragonTigerDetail {
  code: string;
  name: string;
  hasDragonTiger: boolean;
  tradeDate?: string;
  reason?: string;
  closePrice?: number;
  changeRate?: number;
  accumAmount?: number;
  totalBuy5: number;
  totalSell5: number;
  netBuyTotal: number;
  institutionBuyTotal: number;
  institutionSellTotal: number;
  institutionNetTotal: number;
  northboundNetTotal: number;
  hotMoneyNetTotal: number;
  retailNetTotal: number;
  buySeats: StockDragonTigerSeatItem[];
  sellSeats: StockDragonTigerSeatItem[];
  verdictAnalysis?: {
    dragonTigerSentiment: string;
    hotMoneySummary: string;
    institutionSummary: string;
    tacticalAdvice: string;
  };
  notOnBoardReason?: string;
  limitUpInference?: {
    isLimitUp: boolean;
    consecutiveBoards: number;
    boardText: string;
    sector: string;
    sealAmount: number;
    turnover: number;
    reason: string;
  };
}

export interface LimitUpLadderSummary {
  date?: string;
  tradeDate?: string;
  totalLimitUp: number;
  totalLimitDown: number;
  brokenCount: number;
  sealSuccessRate: number;
  ladderDistribution?: Record<number | string, number>;
  yesterdayLimitUpReturn?: number;
  yesterdayPremium?: number;
  marketSentimentScore?: number;
  sentimentScore?: number;
  sentimentPhase: string;
  topDragonStock?: string;
  maxConsecutiveBoards?: number;
}

