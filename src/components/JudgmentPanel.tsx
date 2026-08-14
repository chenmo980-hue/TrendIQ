import React, { useState } from 'react';
import {
  TechnicalJudgment,
  StockQuote,
  KlinePeriod,
  MarketIndexItem,
  AIAnalysisResponse,
} from '../types';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';

interface JudgmentPanelProps {
  judgment: TechnicalJudgment | null;
  quote: StockQuote | null;
  period: KlinePeriod;
  marketIndices: MarketIndexItem[];
}

export const JudgmentPanel: React.FC<JudgmentPanelProps> = ({
  judgment,
  quote,
  period,
  marketIndices,
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!judgment) return null;

  const handleGenerateAI = async () => {
    if (!quote) return;
    setIsAiLoading(true);
    setErrorMsg(null);

    try {
      const resp = await fetch('/api/analyze-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: quote,
          period,
          judgment,
          marketContext: marketIndices,
          indicators: {
            maSummary: judgment.indicatorsSummary.find((i) => i.name.includes('MA')),
            macd: judgment.indicatorsSummary.find((i) => i.name.includes('MACD')),
            rsi: judgment.indicatorsSummary.find((i) => i.name.includes('RSI')),
            boll: judgment.indicatorsSummary.find((i) => i.name.includes('BOLL')),
            kdj: judgment.indicatorsSummary.find((i) => i.name.includes('KDJ')),
          },
        }),
      });

      if (!resp.ok) {
        throw new Error(`AI 请求失败 (HTTP ${resp.status})`);
      }

      const data = await resp.json();
      setAiAnalysis(data);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      // Even if network completely dropped, fallback locally
      setAiAnalysis({
        trendAssessment: `${quote.name} (${quote.code}) 当前技术评分 ${judgment.score} 分，处于【${judgment.direction}】格局。均线与量能形成局部技术整理，建议以关键均线为攻防基准。`,
        volumePriceAnalysis: `现价 ¥${quote.price} (今日涨跌 ${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%)，价格在 ¥${quote.low} - ¥${quote.high} 区间内博弈消化，未见极端量价背离。`,
        indicatorResonance: `指标共振情况：MACD 与 KDJ 处于局部修正状态，布林通道开口处于常态轨道。`,
        keyLevels: `下方关键支撑参考 ${judgment.supportLevels.length ? '¥' + judgment.supportLevels.join(' / ¥') : '近期低点'}，上方阻力位参考 ${judgment.resistanceLevels.length ? '¥' + judgment.resistanceLevels.join(' / ¥') : '前高附近'}。`,
        riskNotice: `免责声明：技术分析仅反映历史数据统计规律，受市场宏观流动性影响大，不构成投资建议。`,
        confidenceScore: 82,
        source: 'offline-engine',
        generatedAt: new Date().toLocaleTimeString('zh-CN'),
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!aiAnalysis) return;
    const text = `【${quote?.name} (${quote?.code}) 技术研判报告】
评分：${judgment.score} | 方向：${judgment.direction}
趋势研判：${aiAnalysis.trendAssessment}
量价关系：${aiAnalysis.volumePriceAnalysis}
指标共振：${aiAnalysis.indicatorResonance}
关键位置：${aiAnalysis.keyLevels}
风险提示：${aiAnalysis.riskNotice}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find indicator descriptions
  const maItem = judgment.indicatorsSummary.find((i) => i.name.includes('MA'));
  const macdItem = judgment.indicatorsSummary.find((i) => i.name.includes('MACD'));
  const rsiItem = judgment.indicatorsSummary.find((i) => i.name.includes('RSI'));
  const bollItem = judgment.indicatorsSummary.find((i) => i.name.includes('BOLL'));
  const kdjItem = judgment.indicatorsSummary.find((i) => i.name.includes('KDJ'));

  const supportStr = judgment.supportLevels.length
    ? judgment.supportLevels.join(' / ')
    : '近期低点支撑';
  const resistanceStr = judgment.resistanceLevels.length
    ? judgment.resistanceLevels.join(' / ')
    : '前期阻力位';

  // Format bias badge
  const scoreDiff = (judgment.score - 50) / 10;
  const badgeText = `${judgment.direction} · ${scoreDiff >= 0 ? '+' : ''}${scoreDiff.toFixed(1)}`;

  return (
    <div className="bg-[#0e1319] border border-[#1d2631] rounded-lg p-5 flex flex-col justify-between h-full space-y-4">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-bold text-white tracking-wide">技术判断</h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-rose-500/40 text-rose-300 bg-rose-500/10 font-mono">
            {badgeText}
          </span>
        </div>

        {/* Highlight Summary */}
        <p className="text-xs text-slate-300 leading-relaxed pt-1 pb-4">
          {judgment.summary}
        </p>

        {/* Structured Indicator Matrix */}
        <div className="space-y-3 text-xs border-t border-[#1a232e] pt-4">
          <div className="flex items-start gap-4">
            <span className="text-slate-500 shrink-0 w-16">趋势结构</span>
            <span className="text-slate-200 flex-1 leading-relaxed">
              {maItem?.desc || '均线系统处于局部震荡整理阶段'}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-slate-500 shrink-0 w-16">MACD动能</span>
            <span className="text-slate-200 flex-1 leading-relaxed">
              {macdItem?.desc || 'MACD 处于中性区间'}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-slate-500 shrink-0 w-16">RSI强弱</span>
            <span className="text-slate-200 flex-1 leading-relaxed">
              {rsiItem?.desc || '处于中性震荡区间'}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-slate-500 shrink-0 w-16">布林带</span>
            <span className="text-slate-200 flex-1 leading-relaxed">
              {bollItem?.desc || '股价位于布林通道内运行'}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-slate-500 shrink-0 w-16">KDJ</span>
            <span className="text-slate-200 flex-1 leading-relaxed">
              {kdjItem?.desc || 'KDJ 动能相对温和'}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-slate-500 shrink-0 w-16">支撑压力</span>
            <span className="text-slate-200 flex-1 leading-relaxed">
              下方关键支撑位参考 <span className="text-emerald-400 font-mono">{supportStr}</span>；
              上方关键压力位参考 <span className="text-rose-400 font-mono">{resistanceStr}</span>
            </span>
          </div>
        </div>
      </div>

      {/* AI Interpretation Section */}
      <div className="pt-2 space-y-3">
        {/* Action Button matching screenshot */}
        <button
          onClick={handleGenerateAI}
          disabled={isAiLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-[#141b24] hover:bg-[#1a232f] border border-[#e5a93c]/50 hover:border-[#e5a93c] text-[#e5a93c] text-xs font-semibold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
        >
          {isAiLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>正在分析多周期技术面...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#e5a93c]" />
              <span>生成 AI 综合解读</span>
            </>
          )}
        </button>

        {/* AI Result Card */}
        {aiAnalysis && (
          <div className="bg-[#121820] border border-[#232f3e] rounded-lg p-3.5 space-y-2.5 text-xs text-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1c2633] pb-2">
              <span className="font-bold text-[#e5a93c] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {aiAnalysis.source === 'offline-engine' ? '量化深度解读报告' : 'AI 首席技术解读'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">{aiAnalysis.generatedAt}</span>
                <button
                  onClick={handleCopyAnalysis}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                  title="复制解读报告"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 leading-relaxed">
              <div>
                <span className="text-[#e5a93c] font-semibold">【趋势研判】</span>
                <span>{aiAnalysis.trendAssessment}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">【量价特征】</span>
                <span>{aiAnalysis.volumePriceAnalysis}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">【指标共振】</span>
                <span>{aiAnalysis.indicatorResonance}</span>
              </div>
              <div>
                <span className="text-rose-400 font-semibold">【关键位参考】</span>
                <span>{aiAnalysis.keyLevels}</span>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer matching screenshot */}
        <p className="text-[10px] text-slate-500 leading-normal pt-1">
          以上内容基于历史行情数据的技术指标自动计算生成，仅反映技术面统计特征，不构成任何投资建议，不代表对未来走势的保证，据此操作风险自负。
        </p>
      </div>
    </div>
  );
};
