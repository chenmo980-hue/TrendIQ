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
} from '../../lib/indicators';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Eye, Layers } from 'lucide-react';

interface KlineChartProps {
  data: KlinePoint[];
  period: KlinePeriod;
  onPeriodChange: (p: KlinePeriod) => void;
  stockName?: string;
  stockCode?: string;
}

export const KlineChart: React.FC<KlineChartProps> = ({
  data,
  period,
  onPeriodChange,
  stockName = '',
  stockCode = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport / Zoom & Pan state
  const [zoomIndex, setZoomIndex] = useState(0); // offset from right
  const [visibleCount, setVisibleCount] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Hover Crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Indicator Visibility Toggles
  const [showMA, setShowMA] = useState(true);
  const [showBOLL, setShowBOLL] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showTrendlines, setShowTrendlines] = useState(true);
  const [subIndicator, setSubIndicator] = useState<'MACD' | 'RSI' | 'KDJ'>('MACD');

  // Precalculate technical indicators
  const mas = useMemo(() => calculateAllMA(data), [data]);
  const macd = useMemo(() => calculateMACD(data), [data]);
  const rsi = useMemo(() => calculateRSI(data), [data]);
  const boll = useMemo(() => calculateBOLL(data), [data]);
  const kdj = useMemo(() => calculateKDJ(data), [data]);
  const { supports, resistances, levels } = useMemo(() => detectSupportResistance(data), [data]);
  const trendlines = useMemo(() => detectTrendlines(data), [data]);

  // Adjust visible bounds
  const total = data.length;
  const endIndex = Math.min(total, total - zoomIndex);
  const startIndex = Math.max(0, endIndex - visibleCount);
  const visibleData = useMemo(() => data.slice(startIndex, endIndex), [data, startIndex, endIndex]);

  // Active candle to show in HUD (hovered or latest)
  const activeIndex = hoverIndex !== null && hoverIndex >= startIndex && hoverIndex < endIndex
    ? hoverIndex
    : endIndex - 1;
  const activeCandle = data[activeIndex] || data[data.length - 1];

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current || visibleData.length === 0) return;

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

    // 3 vertically stacked regions: Main K-line (60%), Volume (18%), Sub-indicator (22%)
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

    // 1. Calculate price range for main chart
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const p = data[i];
      if (!p) continue;
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
      if (p.volume > maxVol) maxVol = p.volume;

      if (showMA) {
        if (mas.ma5[i]) { minPrice = Math.min(minPrice, mas.ma5[i]!); maxPrice = Math.max(maxPrice, mas.ma5[i]!); }
        if (mas.ma20[i]) { minPrice = Math.min(minPrice, mas.ma20[i]!); maxPrice = Math.max(maxPrice, mas.ma20[i]!); }
        if (mas.ma60[i]) { minPrice = Math.min(minPrice, mas.ma60[i]!); maxPrice = Math.max(maxPrice, mas.ma60[i]!); }
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

    // Add 5% headroom to price scale
    const priceRange = maxPrice - minPrice || 1;
    const paddedMinPrice = minPrice - priceRange * 0.05;
    const paddedMaxPrice = maxPrice + priceRange * 0.05;
    const finalPriceRange = paddedMaxPrice - paddedMinPrice;

    // Helper functions for coordinates
    const getX = (idx: number) => {
      const relIdx = idx - startIndex;
      const step = chartWidth / visibleData.length;
      return padding.left + relIdx * step + step / 2;
    };

    const getPriceY = (price: number) => {
      return mainY + (1 - (price - paddedMinPrice) / finalPriceRange) * mainHeight;
    };

    const getVolY = (vol: number) => {
      const safeMax = maxVol || 1;
      return volY + (1 - vol / safeMax) * volHeight;
    };

    const candleWidth = Math.max(2, (chartWidth / visibleData.length) * 0.72);

    // Grid lines & Axis lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const monoFont = '10px "JetBrains Mono", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
    const labelFont = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';

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

    // 2. Draw Support & Resistance Horizontal Dashed Lines
    if (showSupportResistance) {
      ctx.setLineDash([4, 4]);
      // Supports (Emerald)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
      for (const sup of supports) {
        if (sup >= paddedMinPrice && sup <= paddedMaxPrice) {
          const y = getPriceY(sup);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartWidth, y);
          ctx.stroke();

          ctx.font = labelFont;
          ctx.fillStyle = '#22c55e';
          ctx.fillText(`支撑 ${sup}`, padding.left + chartWidth + 4, y - 2);
        }
      }

      // Resistances (Rose)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      for (const res of resistances) {
        if (res >= paddedMinPrice && res <= paddedMaxPrice) {
          const y = getPriceY(res);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartWidth, y);
          ctx.stroke();

          ctx.font = labelFont;
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`阻力 ${res}`, padding.left + chartWidth + 4, y - 2);
        }
      }
      ctx.setLineDash([]);
    }

    // 3. Draw Candlesticks and Volume Bars
    let highestCandle = { idx: startIndex, price: -Infinity };
    let lowestCandle = { idx: startIndex, price: Infinity };

    for (let i = startIndex; i < endIndex; i++) {
      const p = data[i];
      if (!p) continue;
      const x = getX(i);
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
      ctx.fillStyle = '#f59e0b';
      ctx.font = labelFont;
      ctx.fillText(`▲ 高 ${highestCandle.price}`, hx - 20, Math.max(mainY + 12, hy - 4));
    }
    if (lowestCandle.price !== Infinity) {
      const lx = getX(lowestCandle.idx);
      const ly = getPriceY(lowestCandle.price);
      ctx.fillStyle = '#38bdf8';
      ctx.font = labelFont;
      ctx.fillText(`▼ 低 ${lowestCandle.price}`, lx - 20, Math.min(mainY + mainHeight - 4, ly + 14));
    }

    // 4. Draw Bollinger Bands
    if (showBOLL) {
      const drawBollLine = (lineData: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (let i = startIndex; i < endIndex; i++) {
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

    // 5. Draw Moving Averages
    if (showMA) {
      const drawMALine = (maData: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        let started = false;
        for (let i = startIndex; i < endIndex; i++) {
          const val = maData[i];
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

      drawMALine(mas.ma5, '#fbbf24');  // MA5 Yellow
      drawMALine(mas.ma10, '#38bdf8'); // MA10 Cyan
      drawMALine(mas.ma20, '#c084fc'); // MA20 Purple
      drawMALine(mas.ma60, '#4ade80'); // MA60 Green
    }

    // 6. Draw Auto Trendlines
    if (showTrendlines && trendlines.length > 0) {
      for (const line of trendlines) {
        if (line.endIndex < startIndex || line.startIndex > endIndex) continue;
        const x1 = getX(Math.max(startIndex, line.startIndex));
        const y1 = getPriceY(line.startPrice);
        const x2 = getX(Math.min(endIndex - 1, line.endIndex));
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

    // 7. Draw Sub-Indicator (MACD / RSI / KDJ)
    if (subIndicator === 'MACD') {
      let maxMacdAbs = 0.01;
      for (let i = startIndex; i < endIndex; i++) {
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
      for (let i = startIndex; i < endIndex; i++) {
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
      for (let i = startIndex; i < endIndex; i++) {
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
      for (let i = startIndex; i < endIndex; i++) {
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
        for (let i = startIndex; i < endIndex; i++) {
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
        for (let i = startIndex; i < endIndex; i++) {
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

    const dateStep = Math.max(1, Math.floor(visibleData.length / 5));
    for (let i = 0; i < visibleData.length; i += dateStep) {
      const item = visibleData[i];
      if (!item) continue;
      const x = getX(startIndex + i);
      const displayDate = item.time.includes(' ') ? item.time.split(' ')[1] : item.time.slice(5);
      ctx.fillText(displayDate, x, height - 8);
    }

    // 9. Draw Crosshair Hover Line
    if (mousePos && hoverIndex !== null && hoverIndex >= startIndex && hoverIndex < endIndex) {
      const x = getX(hoverIndex);
      const y = Math.min(subY + subHeight, Math.max(mainY, mousePos.y));

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
  }, [
    data,
    visibleData,
    startIndex,
    endIndex,
    showMA,
    showBOLL,
    showSupportResistance,
    showTrendlines,
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
  ]);

  // Mouse event handlers for pan, zoom, hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const padding = { left: 10, right: 65 };
    const chartWidth = rect.width - padding.left - padding.right;

    if (x >= padding.left && x <= padding.left + chartWidth) {
      const relX = x - padding.left;
      const step = chartWidth / visibleData.length;
      const indexOffset = Math.floor(relX / step);
      const computedIndex = Math.min(endIndex - 1, Math.max(startIndex, startIndex + indexOffset));
      setHoverIndex(computedIndex);
    }

    // Handle dragging/panning
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const candlesMoved = Math.round(deltaX / 8);
      if (candlesMoved !== 0) {
        setZoomIndex((prev) => Math.max(0, Math.min(data.length - visibleCount, prev + candlesMoved)));
        setDragStartX(e.clientX);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverIndex(null);
    setMousePos(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCount((prev) => Math.max(25, prev - 6));
    } else {
      // Zoom out
      setVisibleCount((prev) => Math.min(Math.min(220, data.length), prev + 6));
    }
  };

  const periods: { id: KlinePeriod; label: string }[] = [
    { id: 'day', label: '日线' },
    { id: '1m', label: '1分' },
    { id: '5m', label: '5分' },
    { id: '15m', label: '15分' },
    { id: '30m', label: '30分' },
    { id: '60m', label: '60分' },
    { id: '90m', label: '90分' },
    { id: '120m', label: '120分' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Top Toolbar: Timeframe Selector & Indicators Toggle */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Period switches */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                period === p.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Center: Overlays toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowMA(!showMA)}
            className={`px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1 ${
              showMA
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>均线 MA</span>
          </button>
          <button
            onClick={() => setShowBOLL(!showBOLL)}
            className={`px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1 ${
              showBOLL
                ? 'bg-pink-500/10 border-pink-500/40 text-pink-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>布林 BOLL</span>
          </button>
          <button
            onClick={() => setShowSupportResistance(!showSupportResistance)}
            className={`px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1 ${
              showSupportResistance
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>支撑压力位</span>
          </button>
          <button
            onClick={() => setShowTrendlines(!showTrendlines)}
            className={`px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1 ${
              showTrendlines
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>自动趋势线</span>
          </button>
        </div>

        {/* Right: Sub-chart selector & Zoom controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            {(['MACD', 'RSI', 'KDJ'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setSubIndicator(sub)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  subIndicator === sub
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setVisibleCount((c) => Math.max(25, c - 15))}
              className="p-1 hover:bg-slate-800 rounded hover:text-slate-200"
              title="放大图表"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVisibleCount((c) => Math.min(Math.min(220, data.length), c + 15))}
              className="p-1 hover:bg-slate-800 rounded hover:text-slate-200"
              title="缩小图表"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomIndex(0);
                setVisibleCount(80);
              }}
              className="p-1 hover:bg-slate-800 rounded hover:text-slate-200"
              title="重置视图"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic HUD Indicator Legend Bar */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-num">
        {activeCandle ? (
          <>
            <div className="text-slate-400 flex items-center gap-1">
              <span>时间:</span>
              <span className="text-slate-200 font-semibold">{activeCandle.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">开: <b className="text-slate-200">{activeCandle.open}</b></span>
              <span className="text-slate-400">高: <b className="text-rose-400">{activeCandle.high}</b></span>
              <span className="text-slate-400">低: <b className="text-emerald-400">{activeCandle.low}</b></span>
              <span className="text-slate-400">收: <b className={activeCandle.close >= activeCandle.open ? 'text-rose-400' : 'text-emerald-400'}>{activeCandle.close}</b></span>
              <span className="text-slate-400">量: <b className="text-slate-200">{formatVolume(activeCandle.volume)}</b></span>
            </div>

            {/* MAs in Legend */}
            {showMA && (
              <div className="flex items-center gap-2 ml-auto text-[11px]">
                <span className="text-amber-400">MA5: {mas.ma5[activeIndex] ?? '--'}</span>
                <span className="text-sky-400">MA10: {mas.ma10[activeIndex] ?? '--'}</span>
                <span className="text-purple-400">MA20: {mas.ma20[activeIndex] ?? '--'}</span>
                <span className="text-emerald-400">MA60: {mas.ma60[activeIndex] ?? '--'}</span>
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
        className="relative w-full h-[500px] flex-1 bg-slate-950 cursor-crosshair select-none"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
