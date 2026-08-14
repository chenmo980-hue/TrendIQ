import React, { useState } from 'react';
import {
  TechnicalJudgment,
  StockQuote,
  KlinePeriod,
  MarketIndexItem,
  AIAnalysisResponse,
  MAValues,
  MACDValues,
  RSIValues,
  BOLLValues,
  KDJValues,
} from '../types';
import {
  Brain,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Layers,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

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
      setErrorMsg(err.message || 'AI 解读请求超时或异常');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyAnalysis = () => {
    if (!aiAnalysis) return;
    const text = `【${quote?.name} (${quote?.code}) 技术分析解读】
周期：${period} | 评分：${judgment.score}
趋势研判：${aiAnalysis.trendAssessment}
量价关系：${aiAnalysis.volumePriceAnalysis}
指标共振：${aiAnalysis.indicatorResonance}
关键位置：${aiAnalysis.keyLevels}
风险提示：${aiAnalysis.riskNotice}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. Deterministic Rule-Based Judgment Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                规则引擎 · 技术面客观研判
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  确定性算法
                </span>
              </h3>
              <p className="text-xs text-slate-400">基于均线形态、动量交叉、布林轨与成交密集区</p>
            </div>
          </div>

          {/* AI Trigger Button */}
          <button
            onClick={handleGenerateAI}
            disabled={isAiLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isAiLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI 正在研判分析...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>一键生成 AI 综合解读</span>
              </>
            )}
          </button>
        </div>

        {/* High-level summary text */}
        <div className="my-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs leading-relaxed text-slate-200">
          <span className="font-semibold text-rose-400 mr-1">【技术面概要】</span>
          {judgment.summary}
        </div>

        {/* Signals List */}
        {judgment.signals.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="text-xs font-semibold text-slate-400 px-1">触发的技术信号</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {judgment.signals.map((sig) => {
                const isBull = sig.level === 'bull';
                const isBear = sig.level === 'bear';
                const isWarn = sig.level === 'warn';
                return (
                  <div
                    key={sig.id}
                    className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60 flex items-start gap-2.5"
                  >
                    <div className="mt-0.5 shrink-0">
                      {isBull && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                      {isBear && <AlertTriangle className="w-4 h-4 text-emerald-400" />}
                      {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-slate-100">{sig.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1 rounded">
                          {sig.indicator}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{sig.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Key Support and Resistance levels */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2.5">
            <div className="flex items-center justify-between font-semibold text-emerald-300 mb-1">
              <span>关键支撑位 (近期低点密集区)</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            {judgment.supportLevels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 font-mono font-medium">
                {judgment.supportLevels.map((lvl, i) => (
                  <span
                    key={i}
                    className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded"
                  >
                    ¥{lvl.toFixed(2)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400">暂未探明明显支撑</span>
            )}
          </div>

          <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-2.5">
            <div className="flex items-center justify-between font-semibold text-rose-300 mb-1">
              <span>关键阻力位 (前期高点密集成交)</span>
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            {judgment.resistanceLevels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 font-mono font-medium">
                {judgment.resistanceLevels.map((lvl, i) => (
                  <span
                    key={i}
                    className="bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded"
                  >
                    ¥{lvl.toFixed(2)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400">上方暂无密集成交阻力</span>
            )}
          </div>
        </div>

        {/* Compliance disclaimer */}
        <div className="mt-3 pt-2 text-[10px] text-slate-400 leading-relaxed border-t border-slate-800/40">
          {judgment.disclaimer}
        </div>
      </div>

      {/* 2. AI In-Depth Technical Interpretation Card (Gemini 3.7 Flash) */}
      {aiAnalysis && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  AI 资深首席解读 · 综合报告
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-mono">
                    Gemini 3.7 Flash
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  生成时间: {aiAnalysis.generatedAt} · 结合大盘核心指数与多周期量价共振
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyAnalysis}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制解读'}</span>
            </button>
          </div>

          {/* Structured Analysis Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Trend assessment */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>1. 趋势研判与结构演变</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{aiAnalysis.trendAssessment}</p>
            </div>

            {/* Volume price */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Layers className="w-3.5 h-3.5" />
                <span>2. 量价关系与资金动能</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{aiAnalysis.volumePriceAnalysis}</p>
            </div>

            {/* Indicators resonance */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>3. 指标多维共振信号</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{aiAnalysis.indicatorResonance}</p>
            </div>

            {/* Key levels */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>4. 关键位置攻防与策略</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{aiAnalysis.keyLevels}</p>
            </div>
          </div>

          {/* Risk notice */}
          <div className="mt-4 p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-300 mr-1">风险提示：</span>
              {aiAnalysis.riskNotice}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
