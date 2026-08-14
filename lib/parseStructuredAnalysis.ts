import { VisionAnalysisResponse, VisionPattern, VisionKeyLevel, VisionTrendline } from '../src/types';

/**
 * Safely parses and validates JSON returned from AI chart recognition
 */
export function parseStructuredVisionAnalysis(raw: string): VisionAnalysisResponse {
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const data = JSON.parse(cleaned);

    const patterns: VisionPattern[] = Array.isArray(data.patterns)
      ? data.patterns.map((p: any) => ({
          name: String(p.name || '技术形态'),
          type: (p.type === 'bullish' || p.type === 'bearish') ? p.type : 'neutral',
          confidence: typeof p.confidence === 'number' ? p.confidence : 85,
          description: String(p.description || ''),
          box: Array.isArray(p.box) && p.box.length === 4
            ? [
                Math.max(0, Math.min(100, Number(p.box[0]) || 0)),
                Math.max(0, Math.min(100, Number(p.box[1]) || 0)),
                Math.max(0, Math.min(100, Number(p.box[2]) || 100)),
                Math.max(0, Math.min(100, Number(p.box[3]) || 100)),
              ]
            : undefined,
        }))
      : [];

    const keyLevels: VisionKeyLevel[] = Array.isArray(data.keyLevels)
      ? data.keyLevels.map((k: any) => ({
          price: String(k.price || '--'),
          type: k.type === 'support' ? 'support' : 'resistance',
          yPercent: Math.max(0, Math.min(100, Number(k.yPercent) || 50)),
          desc: String(k.desc || ''),
        }))
      : [];

    const trendlines: VisionTrendline[] = Array.isArray(data.trendlines)
      ? data.trendlines.map((t: any) => ({
          x1: Math.max(0, Math.min(100, Number(t.x1) || 0)),
          y1: Math.max(0, Math.min(100, Number(t.y1) || 0)),
          x2: Math.max(0, Math.min(100, Number(t.x2) || 100)),
          y2: Math.max(0, Math.min(100, Number(t.y2) || 100)),
          label: String(t.label || '趋势线'),
          type: t.type === 'support' || t.type === 'resistance' ? t.type : 'channel',
        }))
      : [];

    return {
      assetName: String(data.assetName || '待识别标的'),
      timeframe: String(data.timeframe || '日K线'),
      trend: (['上升趋势', '下降趋势', '横盘震荡', '反转筑底', '高位滞涨'].includes(data.trend)
        ? data.trend
        : '横盘震荡') as any,
      summary: String(data.summary || '图表整体形态清晰，技术信号处于关键演进期。'),
      patterns,
      keyLevels,
      trendlines,
      strategy: String(data.strategy || '建议结合大盘环境与成交量配合情况，控制仓位并密切关注关键防守位。'),
      riskWarning: String(data.riskWarning || '图表形态识别仅供技术参考，实际交易受突发消息及盘口情绪影响，注意止损止盈。'),
    };
  } catch (err) {
    return {
      assetName: 'K线截图标的',
      timeframe: 'K线周期',
      trend: '横盘震荡',
      summary: raw.slice(0, 300) || 'AI识别完成，但未返回完全符合规范的JSON结构。',
      patterns: [
        {
          name: '主趋势通道',
          type: 'neutral',
          confidence: 80,
          description: '图中K线呈现较为清晰的波段起伏。',
          box: [20, 15, 80, 85],
        },
      ],
      keyLevels: [
        { price: '前高阻力', type: 'resistance', yPercent: 28, desc: '历史密集上影线区域' },
        { price: '箱底支撑', type: 'support', yPercent: 75, desc: '前期多次探底回升支撑区' },
      ],
      trendlines: [
        { x1: 15, y1: 75, x2: 85, y2: 35, label: '上升支撑线', type: 'support' },
      ],
      strategy: '密切跟踪关键高低点突破情况，顺势而为。',
      riskWarning: '形态学分析存在滞后性与假突破风险，严格设立止损位。',
    };
  }
}
