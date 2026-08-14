import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  KlinePoint,
  MAValues,
  MACDValues,
  RSIValues,
  BOLLValues,
  KDJValues,
  SupportResistanceLevel,
  Trendline,
  KlinePeriod,
  VReversal,
  HighlightBox,
  TrianglePattern,
  ChannelLines,
  TradePlanLevels,
} from '../types';
import { formatPrice, formatVolume } from '../../lib/stockCode';
import {
  calculateAllMA,
  calculateMACD,
  calculateRSI,
  calculateBOLL,
  calculateKDJ,
  detectSupportResistance,
  detectTrendlines,
  detectChannelWedge,
  detectVReversals,
  detectTrianglePattern,
  detectHighlightBoxes,
  detectTradePlan,
} from '../../lib/indicators';
import { ZoomIn, ZoomOut, RotateCcw, TrendingUp, Layers, Square, Crosshair, Target } from 'lucide-react';

interface KlineChartProps {
  data: KlinePoint[];
  period: KlinePeriod;
  onPeriodChange: (p: KlinePeriod) => void;
  stockName?: string;
  stockCode?: string;
}

interface MAConfigItem {
  period: number;
  label: string;
  color: string;
  key: keyof MAValues;
}

const MA_CONFIGS: MAConfigItem[] = [
  { period: 5, label: 'MA5', color: '#fbbf24', key: 'ma5' },
  { period: 10, label: 'MA10', color: '#38bdf8', key: 'ma10' },
  { period: 20, label: 'MA20', color: '#c084fc', key: 'ma20' },
  { period: 30, label: 'MA30', color: '#fb923c', key: 'ma30' },
  { period: 60, label: 'MA60', color: '#4ade80', key: 'ma60' },
  { period: 120, label: 'MA120', color: '#f472b6', key: 'ma120' },
  { period: 250, label: 'MA250', color: '#818cf8', key: 'ma250' },
];

export const KlineChart: React.FC<KlineChartProps> = ({
  data,
  period,
  onPeriodChange,
  stockName = '',
  stockCode = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport / Zoom & Pan state:
  // rightOffset: 0 means latest candle is on the right.
  // rightOffset < 0 (e.g. -12) means dragged to the right, leaving blank space on the right side.
  // rightOffset > 0 means dragged to the left, viewing historical past candles.
  const [rightOffset, setRightOffset] = useState<number>(-12);
  const [visibleCount, setVisibleCount] = useState(65);
  
  // Dragging state using ref for immediate smooth tracking
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(-12);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Hover Crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Indicator & Trendline Visibility Toggles
  const [showMA, setShowMA] = useState(true);
  const [activeMAs, setActiveMAs] = useState<Record<number, boolean>>({
    5: true,
    10: true,
    20: true,
    30: false,
    60: true,
    120: true,
    250: true,
  });

  const [showBOLL, setShowBOLL] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showTrendlines, setShowTrendlines] = useState(true);
  const [showChannelLines, setShowChannelLines] = useState(true);
  const [showPatterns, setShowPatterns] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showTradePlan, setShowTradePlan] = useState(true);
  const [subIndicator, setSubIndicator] = useState<'MACD' | 'RSI' | 'KDJ'>('MACD');

  // Reset offset to comfortable right-padded space (-12) on period or stock change
  useEffect(() => {
    setRightOffset(-12);
    setHoverIndex(null);
  }, [period, stockCode]);

  // Precalculate technical indicators and patterns
  const mas = useMemo(() => calculateAllMA(data), [data]);
  const macd = useMemo(() => calculateMACD(data), [data]);
  const rsi = useMemo(() => calculateRSI(data), [data]);
  const boll = useMemo(() => calculateBOLL(data), [data]);
  const kdj = useMemo(() => calculateKDJ(data), [data]);
  const { supports, resistances } = useMemo(() => detectSupportResistance(data), [data]);
  const trendlines = useMemo(() => detectTrendlines(data), [data]);
  const channelLines = useMemo(() => detectChannelWedge(data), [data]);
  const vReversals = useMemo(() => detectVReversals(data), [data]);
  const trianglePattern = useMemo(() => detectTrianglePattern(data), [data]);
  const highlightBoxes = useMemo(() => detectHighlightBoxes(data), [data]);

  const total = data.length;

  // Calculate active candle for HUD & Trade Plan
  const activeIndex = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < total
    ? hoverIndex
    : total - 1;
  const activeCandle = data[activeIndex] || data[data.length - 1];

  const tradePlan = useMemo(
    () => detectTradePlan(data, activeCandle?.close),
    [data, activeCandle?.close]
  );

  const toggleMA = (periodNum: number) => {
    setActiveMAs((prev) => ({
      ...prev,
      [periodNum]: !prev[periodNum],
    }));
  };

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current || total === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(460, rect.height || 480);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Layout configuration
    const padding = { top: 25, right: 65, bottom: 25, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const totalHeight = height - padding.top - padding.bottom;

    // 3 vertically stacked regions: Main K-line (58%), Volume (18%), Sub-indicator (24%)
    const gap = 12;
    const mainHeight = totalHeight * 0.58;
    const volHeight = totalHeight * 0.18;
    const subHeight = totalHeight * 0.24 - gap * 2;

    const mainY = padding.top;
    const volY = mainY + mainHeight + gap;
    const subY = volY + volHeight + gap;

    // Clear background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Step width per candle
    const step = chartWidth / Math.max(1, visibleCount);
    const candleWidth = Math.max(2, Math.min(26, step * 0.72));

    // Viewport window mapping:
    // Slot index runs from 0 to visibleCount - 1 (from left to right in canvas)
    // The rightmost slot corresponds to data index: (total - 1 - rightOffset)
    // The leftmost slot corresponds to data index: (total - 1 - rightOffset) - (visibleCount - 1)
    const rightmostDataIdx = (total - 1) - rightOffset;
    const leftmostDataIdx = rightmostDataIdx - (visibleCount - 1);

    const getX = (idx: number) => {
      const slot = idx - leftmostDataIdx;
      return padding.left + slot * step + step / 2;
    };

    // Calculate price range for visible candles in viewport
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    const renderStartIndex = Math.max(0, leftmostDataIdx);
    const renderEndIndex = Math.min(total, rightmostDataIdx + 1);

    for (let i = renderStartIndex; i < renderEndIndex; i++) {
      const p = data[i];
      if (!p) continue;
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
      if (p.volume > maxVol) maxVol = p.volume;

      if (showMA) {
        MA_CONFIGS.forEach((cfg) => {
          if (activeMAs[cfg.period]) {
            const val = mas[cfg.key][i];
            if (val !== null && val !== undefined) {
              minPrice = Math.min(minPrice, val);
              maxPrice = Math.max(maxPrice, val);
            }
          }
        });
      }
      if (showBOLL) {
        if (boll.upper[i]) maxPrice = Math.max(maxPrice, boll.upper[i]!);
        if (boll.lower[i]) minPrice = Math.min(minPrice, boll.lower[i]!);
      }
    }

    if (minPrice === Infinity || maxPrice === -Infinity) {
      minPrice = 10;
      maxPrice = 100;
    }

    // Add 6% headroom to price scale
    const priceRange = maxPrice - minPrice || 1;
    const paddedMinPrice = minPrice - priceRange * 0.06;
    const paddedMaxPrice = maxPrice + priceRange * 0.06;
    const finalPriceRange = paddedMaxPrice - paddedMinPrice;

    const getPriceY = (price: number) => {
      return mainY + (1 - (price - paddedMinPrice) / finalPriceRange) * mainHeight;
    };

    const getVolY = (vol: number) => {
      const safeMax = maxVol || 1;
      return volY + (1 - vol / safeMax) * volHeight;
    };

    // Grid lines & Axis lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const monoFont = '10px "JetBrains Mono", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    const labelFont = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

    // Main Chart horizontal grid & price labels
    const gridSteps = 4;
    ctx.font = monoFont;
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridSteps; i++) {
      const y = mainY + (i / gridSteps) * mainHeight;
      const price = paddedMaxPrice - (i / gridSteps) * finalPriceRange;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      ctx.fillText(price.toFixed(2), padding.left + chartWidth + 6, y + 3);
    }

    // Volume Grid
    ctx.beginPath();
    ctx.moveTo(padding.left, volY);
    ctx.lineTo(padding.left + chartWidth, volY);
    ctx.stroke();
    ctx.fillText(formatVolume(maxVol), padding.left + chartWidth + 6, volY + 10);

    // Sub-indicator Grid
    ctx.beginPath();
    ctx.moveTo(padding.left, subY);
    ctx.lineTo(padding.left + chartWidth, subY);
    ctx.stroke();

    // ----------------------------------------------------
    // LAYER A: Trade Plan Background Shaded Zones (止盈/止损区域)
    // ----------------------------------------------------
    if (showTradePlan && tradePlan) {
      const entryY = getPriceY(tradePlan.entry);
      const stopY = getPriceY(tradePlan.stopLoss);
      const tpY = getPriceY(tradePlan.takeProfit);

      // Red Stop Loss Zone (Between entry and stop loss)
      const stopMinY = Math.min(entryY, stopY);
      const stopHeight = Math.abs(stopY - entryY);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.10)';
      ctx.fillRect(padding.left, stopMinY, chartWidth, stopHeight);

      // Green Take Profit Zone (Between entry and take profit)
      const tpMinY = Math.min(entryY, tpY);
      const tpHeight = Math.abs(tpY - entryY);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.10)';
      ctx.fillRect(padding.left, tpMinY, chartWidth, tpHeight);
    }

    // ----------------------------------------------------
    // LAYER B: Convergence Triangle / Wedge Pattern Fill (收敛三角半透明形态)
    // ----------------------------------------------------
    if (showPatterns && trianglePattern) {
      const { p1, p2, p3, p4 } = trianglePattern;
      const pts = [p1, p2, p3];
      if (p4) pts.push(p4);

      if (pts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(getX(pts[0].index), getPriceY(pts[0].price));
        for (let pIdx = 1; pIdx < pts.length; pIdx++) {
          ctx.lineTo(getX(pts[pIdx].index), getPriceY(pts[pIdx].price));
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
        ctx.fill();

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    // ----------------------------------------------------
    // LAYER C: Highlight Boxes (形态框选 - 承压与筑底区域)
    // ----------------------------------------------------
    if (showBoxes && highlightBoxes.length > 0) {
      for (const box of highlightBoxes) {
        const x1 = getX(box.startIdx) - candleWidth * 0.6;
        const x2 = getX(box.endIdx) + candleWidth * 0.6;
        const yTop = getPriceY(box.maxPrice);
        const yBot = getPriceY(box.minPrice);

        const boxW = Math.max(12, x2 - x1);
        const boxH = Math.max(10, yBot - yTop);

        ctx.fillStyle = box.color;
        ctx.fillRect(x1, yTop, boxW, boxH);

        ctx.strokeStyle = box.borderColor;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(x1, yTop, boxW, boxH);

        // Optional label inside box
        if (box.label) {
          ctx.fillStyle = box.borderColor;
          ctx.font = labelFont;
          ctx.fillText(box.label, x1 + 6, yTop + 14);
        }
      }
    }

    // ----------------------------------------------------
    // LAYER D: S1 / R1 Key Horizontal Support & Resistance Bands
    // ----------------------------------------------------
    if (showSupportResistance) {
      ctx.setLineDash([4, 4]);
      // S1 (Support Cyan)
      for (let sIdx = 0; sIdx < supports.length; sIdx++) {
        const sup = supports[sIdx];
        if (sup >= paddedMinPrice && sup <= paddedMaxPrice) {
          const y = getPriceY(sup);
          ctx.strokeStyle = sIdx === 0 ? 'rgba(6, 182, 212, 0.85)' : 'rgba(34, 197, 94, 0.45)';
          ctx.lineWidth = sIdx === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartWidth, y);
          ctx.stroke();

          // S1 Badge
          if (sIdx === 0) {
            ctx.fillStyle = '#06b6d4';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('S1', padding.left + 12, y - 4);
          }

          ctx.font = labelFont;
          ctx.fillStyle = sIdx === 0 ? '#06b6d4' : '#22c55e';
          ctx.fillText(`支撑 ${sup}`, padding.left + chartWidth + 4, y - 2);
        }
      }

      // R1 (Resistance Rose)
      for (let rIdx = 0; rIdx < resistances.length; rIdx++) {
        const res = resistances[rIdx];
        if (res >= paddedMinPrice && res <= paddedMaxPrice) {
          const y = getPriceY(res);
          ctx.strokeStyle = rIdx === 0 ? 'rgba(244, 63, 94, 0.85)' : 'rgba(239, 68, 68, 0.45)';
          ctx.lineWidth = rIdx === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartWidth, y);
          ctx.stroke();

          // R1 Badge
          if (rIdx === 0) {
            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('R1', padding.left + 12, y - 4);
          }

          ctx.font = labelFont;
          ctx.fillStyle = rIdx === 0 ? '#f43f5e' : '#ef4444';
          ctx.fillText(`阻力 ${res}`, padding.left + chartWidth + 4, y - 2);
        }
      }
      ctx.setLineDash([]);
    }

    // ----------------------------------------------------
    // LAYER E: Draw Candlesticks and Volume Bars
    // ----------------------------------------------------
    let highestCandle = { idx: renderStartIndex, price: -Infinity };
    let lowestCandle = { idx: renderStartIndex, price: Infinity };

    for (let i = renderStartIndex; i < renderEndIndex; i++) {
      const p = data[i];
      if (!p) continue;
      const x = getX(i);

      // Clip outside horizontal viewport
      if (x < padding.left - candleWidth || x > padding.left + chartWidth + candleWidth) continue;

      const isUp = p.close >= p.open;
      const candleColor = isUp ? '#ef4444' : '#22c55e';

      if (p.high > highestCandle.price) highestCandle = { idx: i, price: p.high };
      if (p.low < lowestCandle.price) lowestCandle = { idx: i, price: p.low };

      // High-Low Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, getPriceY(p.high));
      ctx.lineTo(x, getPriceY(p.low));
      ctx.stroke();

      // Candle Body
      const openY = getPriceY(p.open);
      const closeY = getPriceY(p.close);
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);

      // Volume Bar
      const vY = getVolY(p.volume);
      const vH = volY + volHeight - vY;
      ctx.fillStyle = isUp ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)';
      ctx.fillRect(x - candleWidth / 2, vY, candleWidth, vH);
    }

    // Draw Extreme High / Low Tags
    if (highestCandle.price !== -Infinity) {
      const hx = getX(highestCandle.idx);
      const hy = getPriceY(highestCandle.price);
      if (hx >= padding.left && hx <= padding.left + chartWidth) {
        const textX = Math.min(padding.left + chartWidth - 55, Math.max(padding.left + 5, hx - 20));
        ctx.fillStyle = '#f59e0b';
        ctx.font = labelFont;
        ctx.fillText(`▲ 高 ${highestCandle.price}`, textX, Math.max(mainY + 12, hy - 4));
      }
    }
    if (lowestCandle.price !== Infinity) {
      const lx = getX(lowestCandle.idx);
      const ly = getPriceY(lowestCandle.price);
      if (lx >= padding.left && lx <= padding.left + chartWidth) {
        const textX = Math.min(padding.left + chartWidth - 55, Math.max(padding.left + 5, lx - 20));
        ctx.fillStyle = '#38bdf8';
        ctx.font = labelFont;
        ctx.fillText(`▼ 低 ${lowestCandle.price}`, textX, Math.min(mainY + mainHeight - 4, ly + 14));
      }
    }

    // ----------------------------------------------------
    // LAYER F: Bollinger Bands & Moving Averages
    // ----------------------------------------------------
    if (showBOLL) {
      const drawBollLine = (lineData: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (let i = renderStartIndex; i < renderEndIndex; i++) {
          const val = lineData[i];
          if (val === null) continue;
          const x = getX(i);
          const y = getPriceY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      drawBollLine(boll.upper, 'rgba(236, 72, 153, 0.7)');
      drawBollLine(boll.mid, 'rgba(251, 191, 36, 0.7)');
      drawBollLine(boll.lower, 'rgba(56, 189, 248, 0.7)');
    }

    if (showMA) {
      const drawMALine = (maData: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        let started = false;
        const lineStart = Math.max(0, renderStartIndex - 1);
        const lineEnd = Math.min(total, renderEndIndex + 1);
        for (let i = lineStart; i < lineEnd; i++) {
          const val = maData[i];
          if (val === null || val === undefined || isNaN(val)) {
            started = false;
            continue;
          }
          const x = getX(i);
          const y = getPriceY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      MA_CONFIGS.forEach((cfg) => {
        if (activeMAs[cfg.period]) {
          drawMALine(mas[cfg.key], cfg.color);
        }
      });
    }

    // ----------------------------------------------------
    // LAYER G: Channel Lines (通道线 - 黄绿色高亮通道)
    // ----------------------------------------------------
    if (showChannelLines && channelLines) {
      const drawChannelBound = (line: { startIndex: number; endIndex: number; startPrice: number; endPrice: number } | null) => {
        if (!line) return;
        const x1 = getX(line.startIndex);
        const y1 = getPriceY(line.startPrice);
        const x2 = getX(line.endIndex);
        const y2 = getPriceY(line.endPrice);

        ctx.strokeStyle = '#a3e635'; // Vibrant Lime
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };

      drawChannelBound(channelLines.upper);
      drawChannelBound(channelLines.lower);
    }

    // Auto Trendlines
    if (showTrendlines && trendlines.length > 0) {
      for (const line of trendlines) {
        if (line.endIndex < renderStartIndex || line.startIndex > renderEndIndex) continue;
        const x1 = getX(Math.max(renderStartIndex, line.startIndex));
        const y1 = getPriceY(line.startPrice);
        const x2 = getX(Math.min(renderEndIndex - 1, line.endIndex));
        const y2 = getPriceY(line.endPrice);

        ctx.strokeStyle = line.type === 'support' ? 'rgba(74, 222, 128, 0.8)' : 'rgba(244, 63, 94, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ----------------------------------------------------
    // LAYER H: V-Shape Reversal Tags (V 形反转 ↓ 标识)
    // ----------------------------------------------------
    if (showPatterns && vReversals.length > 0) {
      for (const v of vReversals) {
        const vx = getX(v.index);
        const vy = getPriceY(v.price);
        if (vx >= padding.left && vx <= padding.left + chartWidth) {
          const badgeW = 68;
          const badgeH = 22;
          const badgeX = vx - badgeW / 2;
          const badgeY = vy - 32;

          // Draw Badge Box
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
          ctx.fill();
          ctx.stroke();

          // Badge Text
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('V 形反转 ↓', vx, badgeY + 15);
          ctx.textAlign = 'left';

          // Pointer Line
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(vx, badgeY + badgeH);
          ctx.lineTo(vx, vy - 4);
          ctx.stroke();
        }
      }
    }

    // ----------------------------------------------------
    // LAYER I: Trade Plan Horizontal Target / Entry / Stop Lines & Badges
    // ----------------------------------------------------
    if (showTradePlan && tradePlan) {
      const drawPlanLine = (price: number, color: string, badgeBg: string, label: string) => {
        if (price < paddedMinPrice || price > paddedMaxPrice) return;
        const y = getPriceY(price);

        // Solid Horizontal Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Right Edge Badge
        const badgeW = 60;
        const badgeH = 18;
        const bx = padding.left + chartWidth + 2;
        const by = y - badgeH / 2;

        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${label} ${price}`, bx + 4, by + 13);
      };

      drawPlanLine(tradePlan.takeProfit, '#22c55e', '#16a34a', '止盈');
      drawPlanLine(tradePlan.entry, '#e2e8f0', '#334155', '入场');
      drawPlanLine(tradePlan.stopLoss, '#ef4444', '#dc2626', '止损');
    }

    // 7. Draw Sub-Indicator (MACD / RSI / KDJ)
    if (subIndicator === 'MACD') {
      let maxMacdAbs = 0.01;
      for (let i = renderStartIndex; i < renderEndIndex; i++) {
        const d = macd.dif[i];
        const a = macd.dea[i];
        const m = macd.macd[i];
        if (d !== null) maxMacdAbs = Math.max(maxMacdAbs, Math.abs(d));
        if (a !== null) maxMacdAbs = Math.max(maxMacdAbs, Math.abs(a));
        if (m !== null) maxMacdAbs = Math.max(maxMacdAbs, Math.abs(m));
      }

      const zeroY = subY + subHeight / 2;
      const getMacdY = (val: number) => zeroY - (val / (maxMacdAbs * 1.2)) * (subHeight / 2);

      // Zero baseline
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(padding.left + chartWidth, zeroY);
      ctx.stroke();

      // MACD Histogram bars
      for (let i = renderStartIndex; i < renderEndIndex; i++) {
        const m = macd.macd[i];
        if (m === null) continue;
        const x = getX(i);
        const y = getMacdY(m);
        ctx.fillStyle = m >= 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)';
        ctx.fillRect(x - candleWidth / 2, Math.min(zeroY, y), candleWidth, Math.abs(y - zeroY));
      }

      // DIF Line (Amber)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let started = false;
      for (let i = renderStartIndex; i < renderEndIndex; i++) {
        const d = macd.dif[i];
        if (d === null) continue;
        const x = getX(i);
        const y = getMacdY(d);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();

      // DEA Line (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      started = false;
      for (let i = renderStartIndex; i < renderEndIndex; i++) {
        const a = macd.dea[i];
        if (a === null) continue;
        const x = getX(i);
        const y = getMacdY(a);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.fillText('0.00', padding.left + chartWidth + 6, zeroY + 3);
    } else if (subIndicator === 'RSI') {
      const getRsiY = (val: number) => subY + (1 - val / 100) * subHeight;

      // Overbought 80 line and Oversold 20 line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, getRsiY(80));
      ctx.lineTo(padding.left + chartWidth, getRsiY(80));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.beginPath();
      ctx.moveTo(padding.left, getRsiY(20));
      ctx.lineTo(padding.left + chartWidth, getRsiY(20));
      ctx.stroke();
      ctx.setLineDash([]);

      const drawRsiLine = (rsiArr: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let started = false;
        for (let i = renderStartIndex; i < renderEndIndex; i++) {
          const r = rsiArr[i];
          if (r === null) continue;
          const x = getX(i);
          const y = getRsiY(r);
          if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
      };

      drawRsiLine(rsi.rsi6, '#fbbf24');
      drawRsiLine(rsi.rsi12, '#38bdf8');
      drawRsiLine(rsi.rsi24, '#c084fc');

      ctx.fillStyle = '#64748b';
      ctx.fillText('80', padding.left + chartWidth + 6, getRsiY(80) + 3);
      ctx.fillText('20', padding.left + chartWidth + 6, getRsiY(20) + 3);
    } else if (subIndicator === 'KDJ') {
      const getKdjY = (val: number) => subY + (1 - Math.max(0, Math.min(100, val)) / 100) * subHeight;

      const drawKdjLine = (arr: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let started = false;
        for (let i = renderStartIndex; i < renderEndIndex; i++) {
          const val = arr[i];
          if (val === null) continue;
          const x = getX(i);
          const y = getKdjY(val);
          if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
      };

      drawKdjLine(kdj.k, '#fbbf24');
      drawKdjLine(kdj.d, '#38bdf8');
      drawKdjLine(kdj.j, '#f43f5e');

      ctx.fillStyle = '#64748b';
      ctx.fillText('100', padding.left + chartWidth + 6, subY + 8);
      ctx.fillText('0', padding.left + chartWidth + 6, subY + subHeight);
    }

    // 8. Draw Date Labels at bottom
    ctx.fillStyle = '#64748b';
    ctx.font = monoFont;
    ctx.textAlign = 'center';

    const visibleLen = renderEndIndex - renderStartIndex;
    const dateStep = Math.max(1, Math.floor(visibleLen / 5));
    for (let i = 0; i < visibleLen; i += dateStep) {
      const item = data[renderStartIndex + i];
      if (!item) continue;
      const x = getX(renderStartIndex + i);
      if (x >= padding.left && x <= padding.left + chartWidth) {
        const displayDate = item.time.includes(' ') ? item.time.split(' ')[1] : item.time.slice(5);
        ctx.fillText(displayDate, x, height - 8);
      }
    }

    // 9. Draw Crosshair Hover Line
    if (mousePos && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < total) {
      const x = getX(hoverIndex);
      const y = Math.min(subY + subHeight, Math.max(mainY, mousePos.y));

      if (x >= padding.left && x <= padding.left + chartWidth) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([3, 3]);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x, mainY);
        ctx.lineTo(x, subY + subHeight);
        ctx.stroke();

        // Horizontal line in main chart
        if (mousePos.y <= mainY + mainHeight) {
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartWidth, y);
          ctx.stroke();

          // Price bubble on Y axis
          const hoverPrice = paddedMaxPrice - ((y - mainY) / mainHeight) * finalPriceRange;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(padding.left + chartWidth + 2, y - 9, 58, 18);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(hoverPrice.toFixed(2), padding.left + chartWidth + 6, y + 3);
        }

        // Date bubble on X axis
        const p = data[hoverIndex];
        if (p) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(x - 40, height - 20, 80, 16);
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.fillText(p.time, x, height - 8);
        }

        ctx.setLineDash([]);
      }
    }
  }, [
    data,
    total,
    visibleCount,
    rightOffset,
    showMA,
    activeMAs,
    showBOLL,
    showSupportResistance,
    showTrendlines,
    showChannelLines,
    showPatterns,
    showBoxes,
    showTradePlan,
    subIndicator,
    hoverIndex,
    mousePos,
    mas,
    macd,
    rsi,
    boll,
    kdj,
    supports,
    resistances,
    trendlines,
    channelLines,
    vReversals,
    trianglePattern,
    highlightBoxes,
    tradePlan,
  ]);

  // Window-level mouse up / move for ultra-smooth drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const padding = { left: 10, right: 65 };
      const chartWidth = rect.width - padding.left - padding.right;
      const candlePx = chartWidth / visibleCount;

      const deltaX = e.clientX - dragStartXRef.current;
      const candlesMoved = Math.round(deltaX / candlePx);

      const minOffset = -Math.min(60, Math.floor(visibleCount * 0.8));
      const maxOffset = total - 5;
      const newOffset = Math.max(minOffset, Math.min(maxOffset, dragStartOffsetRef.current + candlesMoved));
      setRightOffset(newOffset);
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingState(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [visibleCount, total]);

  // Canvas Mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || total === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const padding = { left: 10, right: 65 };
    const chartWidth = rect.width - padding.left - padding.right;

    if (!isDraggingRef.current && x >= padding.left && x <= padding.left + chartWidth) {
      const relX = x - padding.left;
      const step = chartWidth / Math.max(1, visibleCount);
      const slotOffset = Math.floor(relX / step);
      const rightmostDataIdx = (total - 1) - rightOffset;
      const leftmostDataIdx = rightmostDataIdx - (visibleCount - 1);
      const computedIndex = leftmostDataIdx + slotOffset;

      if (computedIndex >= 0 && computedIndex < total) {
        setHoverIndex(computedIndex);
      } else {
        setHoverIndex(null);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = rightOffset;
    setIsDraggingState(true);
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) {
      setHoverIndex(null);
      setMousePos(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCount((prev) => Math.max(15, prev - 6));
    } else {
      // Zoom out
      setVisibleCount((prev) => Math.min(Math.min(240, total), prev + 6));
    }
  };

  return (
    <div className="bg-[#0e1319] border border-[#1d2631] rounded-lg overflow-hidden shadow-xl flex flex-col space-y-0">
      {/* Top Toolbar: Indicator Controls & Multi-MA Selector */}
      <div className="p-2.5 border-b border-[#1b2532] bg-[#0a0f16] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Left: Indicator overlays toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="px-2 py-0.5 rounded bg-[#16202c] text-[#d4a038] font-mono text-[11px] border border-[#233346] font-semibold flex items-center gap-1">
            <span>前复权</span>
          </div>

          <button
            onClick={() => setShowChannelLines(!showChannelLines)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showChannelLines
                ? 'bg-[#1a2330] border-lime-500/80 text-lime-400 font-bold shadow-[0_0_8px_rgba(163,230,53,0.2)]'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏 通道上下轨趋势线"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>通道线</span>
          </button>

          <button
            onClick={() => setShowPatterns(!showPatterns)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showPatterns
                ? 'bg-[#1a2330] border-purple-500/80 text-purple-300 font-bold shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏 V形反转标线与收敛三角区域"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>形态分析</span>
          </button>

          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showBoxes
                ? 'bg-[#1a2330] border-amber-500/80 text-amber-400 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏 承压阻力框与筑底支撑框"
          >
            <Square className="w-3.5 h-3.5" />
            <span>形态框选</span>
          </button>

          <button
            onClick={() => setShowSupportResistance(!showSupportResistance)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showSupportResistance
                ? 'bg-[#1a2330] border-cyan-500/80 text-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏 S1/R1 关键支撑阻力水平带"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>S1/R1带</span>
          </button>

          <button
            onClick={() => setShowTradePlan(!showTradePlan)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showTradePlan
                ? 'bg-[#1a2330] border-emerald-500/80 text-emerald-400 font-bold shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏 止盈/入场/止损 策略标线与风险收益区间"
          >
            <Target className="w-3.5 h-3.5" />
            <span>止盈止损</span>
          </button>

          <button
            onClick={() => setShowMA(!showMA)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showMA
                ? 'bg-[#1a2330] border-[#d4a038]/70 text-[#d4a038]'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>均线 MA</span>
          </button>

          {/* Flexible MA Selector Pills (MA5, MA10, MA20, MA30, MA60, MA120, MA250) */}
          {showMA && (
            <div className="flex items-center gap-1 bg-[#101721] px-1.5 py-0.5 rounded border border-[#1e2a3a]">
              {MA_CONFIGS.map((cfg) => {
                const isActive = !!activeMAs[cfg.period];
                return (
                  <button
                    key={cfg.period}
                    onClick={() => toggleMA(cfg.period)}
                    title={`点击${isActive ? '隐藏' : '显示'} ${cfg.label}`}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium transition cursor-pointer ${
                      isActive
                        ? 'font-bold'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                    style={{
                      color: isActive ? cfg.color : '#94a3b8',
                      backgroundColor: isActive ? `${cfg.color}15` : 'transparent',
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setShowBOLL(!showBOLL)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              showBOLL
                ? 'bg-[#1a2330] border-pink-500/70 text-pink-400'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>布林 BOLL</span>
          </button>
        </div>

        {/* Right: Sub-chart selector & Zoom controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#101721] rounded p-0.5 border border-[#1e2a3a]">
            {(['MACD', 'RSI', 'KDJ'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setSubIndicator(sub)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  subIndicator === sub
                    ? 'bg-[#1d293a] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setVisibleCount((c) => Math.max(15, c - 15))}
              className="p-1.5 hover:bg-[#16212e] rounded hover:text-slate-200 transition cursor-pointer"
              title="放大图表"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVisibleCount((c) => Math.min(Math.min(240, data.length), c + 15))}
              className="p-1.5 hover:bg-[#16212e] rounded hover:text-slate-200 transition cursor-pointer"
              title="缩小图表"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setRightOffset(-12);
                setVisibleCount(65);
              }}
              className="p-1.5 hover:bg-[#16212e] rounded hover:text-slate-200 transition cursor-pointer"
              title="重置视图至最新K线"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic HUD Indicator Legend Bar */}
      <div className="px-3.5 py-2 bg-[#0c1117] border-b border-[#18222e] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
        {activeCandle ? (
          <>
            <div className="text-slate-400 flex items-center gap-1">
              <span>时间:</span>
              <span className="text-slate-200 font-bold">{activeCandle.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">开: <b className="text-slate-200">{activeCandle.open}</b></span>
              <span className="text-slate-400">高: <b className="text-rose-400">{activeCandle.high}</b></span>
              <span className="text-slate-400">低: <b className="text-emerald-400">{activeCandle.low}</b></span>
              <span className="text-slate-400">收: <b className={activeCandle.close >= activeCandle.open ? 'text-rose-400' : 'text-emerald-400'}>{activeCandle.close}</b></span>
              <span className="text-slate-400">量: <b className="text-slate-200">{formatVolume(activeCandle.volume)}</b></span>
            </div>

            {/* Selected Active MAs in Legend */}
            {showMA && (
              <div className="flex items-center gap-2.5 ml-auto text-[11px] flex-wrap">
                {MA_CONFIGS.filter((cfg) => activeMAs[cfg.period]).map((cfg) => (
                  <span key={cfg.period} style={{ color: cfg.color }}>
                    {cfg.label}: {mas[cfg.key][activeIndex] ?? '--'}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <span className="text-slate-500">正在加载行情图表...</span>
        )}
      </div>

      {/* Main Canvas Chart Area */}
      <div
        ref={containerRef}
        className={`relative w-full h-[500px] flex-1 bg-[#070a0e] select-none ${
          isDraggingState ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
