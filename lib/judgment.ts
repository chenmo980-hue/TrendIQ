import { KlinePoint, TechnicalJudgment, SignalItem, IndicatorSummary, StockQuote } from '../src/types';
import { calculateAllMA, calculateMACD, calculateRSI, calculateBOLL, calculateKDJ, detectSupportResistance } from './indicators';

export function generateTechnicalJudgment(
  data: KlinePoint[],
  quote?: StockQuote | null,
  period?: string
): TechnicalJudgment {
  if (!data || data.length < 10) {
    return {
      score: 50,
      direction: '中性震荡',
      summary: 'K线历史数据不足，暂无法生成全面的技术面研判。',
      signals: [],
      supportLevels: [],
      resistanceLevels: [],
      indicatorsSummary: [],
      disclaimer: '免责声明：本技术指标分析基于历史行情统计规则自动计算，仅供投资参考，不构成任何买卖建议。股市有风险，入市需谨慎。',
    };
  }

  const lastIndex = data.length - 1;
  const current = data[lastIndex];
  const prev = data[lastIndex - 1];
  const close = current.close;

  const mas = calculateAllMA(data);
  const macd = calculateMACD(data);
  const rsi = calculateRSI(data);
  const boll = calculateBOLL(data);
  const kdj = calculateKDJ(data);
  const { supports, resistances } = detectSupportResistance(data);

  const signals: SignalItem[] = [];
  const indicatorsSummary: IndicatorSummary[] = [];

  let bullScore = 0;
  let bearScore = 0;

  // 1. Moving Average (MA) Evaluation
  const ma5 = mas.ma5[lastIndex];
  const ma10 = mas.ma10[lastIndex];
  const ma20 = mas.ma20[lastIndex];
  const ma60 = mas.ma60[lastIndex];

  let maStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let maText = '';
  if (ma5 && ma10 && ma20 && ma60) {
    if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
      maStatus = 'bullish';
      maText = '均线多头排列，中长期趋势向上';
      bullScore += 25;
      signals.push({
        id: 'ma_bull_align',
        indicator: 'MA',
        level: 'bull',
        title: '均线多头排列',
        desc: 'MA5 > MA10 > MA20 > MA60，各周期均线发散向上，支撑强劲。',
      });
    } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
      maStatus = 'bearish';
      maText = '均线空头排列，中长期趋势向下';
      bearScore += 25;
      signals.push({
        id: 'ma_bear_align',
        indicator: 'MA',
        level: 'bear',
        title: '均线空头排列',
        desc: 'MA5 < MA10 < MA20 < MA60，上方均线层层压制，空头力量占优。',
      });
    } else if (close > ma20) {
      maStatus = 'bullish';
      maText = '站上20日生命线，短期偏强';
      bullScore += 15;
      signals.push({
        id: 'ma_above_20',
        indicator: 'MA',
        level: 'bull',
        title: '站上20日均线',
        desc: `现价 ${close} 运行于20日生命线 (${ma20}) 之上，短期技术面偏多。`,
      });
    } else {
      maStatus = 'bearish';
      maText = '承压于20日线下方，震荡偏弱';
      bearScore += 15;
      signals.push({
        id: 'ma_below_20',
        indicator: 'MA',
        level: 'warn',
        title: '承压20日均线',
        desc: `现价 ${close} 处于20日均线 (${ma20}) 下方，关注突破有效性。`,
      });
    }
  }
  indicatorsSummary.push({
    name: 'MA 均线系统',
    status: maStatus,
    text: maText,
    valueDisplay: `MA5:${ma5 ?? '-'} / MA20:${ma20 ?? '-'}`,
  });

  // 2. MACD Evaluation
  const curDif = macd.dif[lastIndex];
  const curDea = macd.dea[lastIndex];
  const curMacd = macd.macd[lastIndex];
  const prevDif = macd.dif[lastIndex - 1];
  const prevDea = macd.dea[lastIndex - 1];

  let macdStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let macdText = '';

  if (curDif !== null && curDea !== null && prevDif !== null && prevDea !== null) {
    const isGoldenCross = prevDif <= prevDea && curDif > curDea;
    const isDeathCross = prevDif >= prevDea && curDif < curDea;

    if (isGoldenCross) {
      macdStatus = 'bullish';
      macdText = curDif > 0 ? '零轴上方金叉（强势启动）' : '零轴下方金叉（超跌反弹）';
      bullScore += 20;
      signals.push({
        id: 'macd_golden_cross',
        indicator: 'MACD',
        level: 'bull',
        title: `MACD ${curDif > 0 ? '零上金叉' : '低位金叉'}`,
        desc: `DIF (${curDif}) 上穿 DEA (${curDea})，红柱开始放大，动能转强。`,
      });
    } else if (isDeathCross) {
      macdStatus = 'bearish';
      macdText = curDif < 0 ? '零轴下方死叉（弱势加速）' : '零轴上方死叉（高位回调）';
      bearScore += 20;
      signals.push({
        id: 'macd_death_cross',
        indicator: 'MACD',
        level: 'bear',
        title: `MACD ${curDif < 0 ? '零下死叉' : '高位死叉'}`,
        desc: `DIF (${curDif}) 下穿 DEA (${curDea})，绿柱开始伸长，空方动能释放。`,
      });
    } else if (curDif > curDea && curMacd !== null && curMacd > 0) {
      macdStatus = 'bullish';
      macdText = '多头区域，红柱延续';
      bullScore += 10;
    } else if (curDif < curDea && curMacd !== null && curMacd < 0) {
      macdStatus = 'bearish';
      macdText = '空头区域，绿柱延续';
      bearScore += 10;
    }
  }
  indicatorsSummary.push({
    name: 'MACD 动量',
    status: macdStatus,
    text: macdText || '指标处于常态震荡区间',
    valueDisplay: `DIF:${curDif ?? '-'} / DEA:${curDea ?? '-'}`,
  });

  // 3. RSI Evaluation
  const curRsi6 = rsi.rsi6[lastIndex];
  const curRsi12 = rsi.rsi12[lastIndex];
  let rsiStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let rsiText = '';

  if (curRsi6 !== null) {
    if (curRsi6 >= 80) {
      rsiStatus = 'bearish';
      rsiText = `RSI(6)=${curRsi6}，进入严重超买区，谨防高位获利回吐`;
      bearScore += 15;
      signals.push({
        id: 'rsi_overbought',
        indicator: 'RSI',
        level: 'warn',
        title: 'RSI 严重超买',
        desc: `RSI6 达到 ${curRsi6} (>80)，短期情绪过热，注意冲高受阻风险。`,
      });
    } else if (curRsi6 <= 20) {
      rsiStatus = 'bullish';
      rsiText = `RSI(6)=${curRsi6}，进入严重超卖区，存在技术性反弹动能`;
      bullScore += 15;
      signals.push({
        id: 'rsi_oversold',
        indicator: 'RSI',
        level: 'bull',
        title: 'RSI 严重超卖',
        desc: `RSI6 降至 ${curRsi6} (<20)，空头动能释放充分，关注止跌企稳信号。`,
      });
    } else if (curRsi6 >= 55) {
      rsiStatus = 'bullish';
      rsiText = `RSI(6)=${curRsi6}，运行于强势买方区间`;
      bullScore += 8;
    } else if (curRsi6 <= 45) {
      rsiStatus = 'bearish';
      rsiText = `RSI(6)=${curRsi6}，运行于偏弱卖方区间`;
      bearScore += 8;
    } else {
      rsiText = `RSI(6)=${curRsi6}，多空处于平衡中轴`;
    }
  }
  indicatorsSummary.push({
    name: 'RSI 相对强弱',
    status: rsiStatus,
    text: rsiText,
    valueDisplay: `RSI6:${curRsi6 ?? '-'} / RSI12:${curRsi12 ?? '-'}`,
  });

  // 4. BOLL Evaluation
  const curBollMid = boll.mid[lastIndex];
  const curBollUp = boll.upper[lastIndex];
  const curBollLow = boll.lower[lastIndex];
  let bollStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let bollText = '';

  if (curBollMid !== null && curBollUp !== null && curBollLow !== null) {
    if (close >= curBollUp) {
      bollStatus = 'bearish';
      bollText = '触及布林上轨，面临短期轨道压制';
      bearScore += 10;
      signals.push({
        id: 'boll_touch_up',
        indicator: 'BOLL',
        level: 'warn',
        title: '触及布林上轨',
        desc: `收盘价 ${close} 贴近或突破布林上轨 (${curBollUp})，警惕上影线回落。`,
      });
    } else if (close <= curBollLow) {
      bollStatus = 'bullish';
      bollText = '触及布林下轨，受到轨道下沿支撑';
      bullScore += 10;
      signals.push({
        id: 'boll_touch_low',
        indicator: 'BOLL',
        level: 'bull',
        title: '触及布林下轨',
        desc: `收盘价 ${close} 触及布林下轨 (${curBollLow})，关注下影线企稳。`,
      });
    } else if (close > curBollMid) {
      bollStatus = 'bullish';
      bollText = '运行于中轨与上轨之间，多头通道顺畅';
      bullScore += 8;
    } else {
      bollStatus = 'bearish';
      bollText = '运行于中轨与下轨之间，受中轨压制';
      bearScore += 8;
    }
  }
  indicatorsSummary.push({
    name: 'BOLL 布林带',
    status: bollStatus,
    text: bollText,
    valueDisplay: `上轨:${curBollUp ?? '-'} / 中轨:${curBollMid ?? '-'} / 下轨:${curBollLow ?? '-'}`,
  });

  // 5. KDJ Evaluation
  const curK = kdj.k[lastIndex];
  const curD = kdj.d[lastIndex];
  const curJ = kdj.j[lastIndex];
  const prevK = kdj.k[lastIndex - 1];
  const prevD = kdj.d[lastIndex - 1];
  let kdjStatus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let kdjText = '';

  if (curK !== null && curD !== null && curJ !== null && prevK !== null && prevD !== null) {
    if (prevK <= prevD && curK > curD) {
      kdjStatus = 'bullish';
      kdjText = curK < 30 ? '低位超卖金叉，反弹信号较强' : 'KDJ 金叉向上发散';
      bullScore += 15;
      signals.push({
        id: 'kdj_golden_cross',
        indicator: 'KDJ',
        level: 'bull',
        title: 'KDJ 低位金叉',
        desc: `K (${curK}) 线上穿 D (${curD}) 线，J 值上扬至 ${curJ}，短期做多意愿增强。`,
      });
    } else if (prevK >= prevD && curK < curD) {
      kdjStatus = 'bearish';
      kdjText = curK > 70 ? '高位超买死叉，调整压力明显' : 'KDJ 死叉向下发散';
      bearScore += 15;
      signals.push({
        id: 'kdj_death_cross',
        indicator: 'KDJ',
        level: 'bear',
        title: 'KDJ 高位死叉',
        desc: `K (${curK}) 线下穿 D (${curD}) 线，J 值下挫至 ${curJ}，短期面临回撤。`,
      });
    } else if (curJ > 100) {
      kdjStatus = 'bearish';
      kdjText = `J值=${curJ} 钝化超买，谨防冲高回落`;
      bearScore += 10;
    } else if (curJ < 0) {
      kdjStatus = 'bullish';
      kdjText = `J值=${curJ} 超跌钝化，具备反弹修复需求`;
      bullScore += 10;
    } else {
      kdjText = 'KDJ 处于常态整理区域';
    }
  }
  indicatorsSummary.push({
    name: 'KDJ 随机指标',
    status: kdjStatus,
    text: kdjText,
    valueDisplay: `K:${curK ?? '-'} / D:${curD ?? '-'} / J:${curJ ?? '-'}`,
  });

  // Calculate composite technical score (0 to 100, 50 neutral)
  const total = bullScore + bearScore;
  let finalScore = 50;
  if (total > 0) {
    const rawNet = (bullScore - bearScore) / 80; // clamped roughly -1 to 1
    finalScore = Math.min(95, Math.max(5, Math.round(50 + rawNet * 40)));
  }

  let direction: TechnicalJudgment['direction'] = '中性震荡';
  if (finalScore >= 75) direction = '强势看多';
  else if (finalScore >= 58) direction = '偏多震荡';
  else if (finalScore <= 25) direction = '弱势看空';
  else if (finalScore <= 42) direction = '偏空震荡';

  // Build high-level summary paragraph
  const supText = supports.length > 0 ? `下方关键支撑位位于 [${supports.join(', ')}]` : '暂无近距离密集成交支撑';
  const resText = resistances.length > 0 ? `上方阻力位关注 [${resistances.join(', ')}]` : '上方暂无密集历史高点阻力';

  const summary = `该标的综合技术面得分 ${finalScore} 分，处于【${direction}】格局。${maText}；${macdText}；${kdjText}。${supText}，${resText}。`;

  return {
    score: finalScore,
    direction,
    summary,
    signals,
    supportLevels: supports,
    resistanceLevels: resistances,
    indicatorsSummary,
    disclaimer: '免责声明：本技术指标分析基于历史K线与统计模型客观生成，不构成任何投资咨询或买卖依据。证券投资具有一定市场风险，请审慎决策。',
  };
}
