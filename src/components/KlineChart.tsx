import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  KlinePoint,
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
  const [zoomIndex, setZoomIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Hover Crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Precalculate technical indicators
  const mas = useMemo(() => calculateAllMA(data), [data]);
  const { supports, resistances } = useMemo(() => detectSupportResistance(data), [data]);

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

    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(480, rect.height || 520);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Padding & Layout
    const padding = { top: 32, right: 64, bottom: 28, left: 16 };
    const chartWidth = width - padding.left - padding.right;
    const totalHeight = height - padding.top - padding.bottom;

    const mainHeight = totalHeight * 0.72;
    const volHeight = totalHeight * 0.22;
    const gap = totalHeight * 0.06;

    const mainY = padding.top;
    const volY = mainY + mainHeight + gap;

    // Clear background matching screenshot
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, width, height);

    // 1. Calculate price scale
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const p = data[i];
      if (!p) continue;
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
      if (p.volume > maxVol) maxVol = p.volume;

      if (mas.ma5[i]) { minPrice = Math.min(minPrice, mas.ma5[i]!); maxPrice = Math.max(maxPrice, mas.ma5[i]!); }
      if (mas.ma20[i]) { minPrice = Math.min(minPrice, mas.ma20[i]!); maxPrice = Math.max(maxPrice, mas.ma20[i]!); }
      if (mas.ma60[i]) { minPrice = Math.min(minPrice, mas.ma60[i]!); maxPrice = Math.max(maxPrice, mas.ma60[i]!); }
    }

    if (minPrice === Infinity || maxPrice === -Infinity) {
      minPrice = 5;
      maxPrice = 15;
    }

    const priceRange = maxPrice - minPrice || 1;
    const paddedMinPrice = minPrice - priceRange * 0.06;
    const paddedMaxPrice = maxPrice + priceRange * 0.06;
    const finalPriceRange = paddedMaxPrice - paddedMinPrice;

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

    const candleWidth = Math.max(2, (chartWidth / visibleData.length) * 0.70);

    // Grid lines
    ctx.strokeStyle = '#141c26';
    ctx.lineWidth = 1;

    const monoFont = '11px "JetBrains Mono", Consolas, monospace';
    const labelFont = '11px sans-serif';

    // Horizontal grid & price labels
    const gridSteps = 5;
    ctx.font = monoFont;
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridSteps; i++) {
      const y = mainY + (i / gridSteps) * mainHeight;
      const price = paddedMaxPrice - (i / gridSteps) * finalPriceRange;

      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillText(price.toFixed(2), padding.left + chartWidth + 8, y + 4);
    }

    // 2. Draw Support & Resistance Dashed Lines with solid badges
    // Resistance (Red dashed line + Red tag)
    ctx.setLineDash([4, 4]);
    for (const res of resistances.slice(0, 3)) {
      if (res >= paddedMinPrice && res <= paddedMaxPrice) {
        const y = getPriceY(res);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Tag badge on right Y axis
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(padding.left + chartWidth + 2, y - 8, 54, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = labelFont;
        ctx.textAlign = 'center';
        ctx.fillText(`压力 ${res}`, padding.left + chartWidth + 29, y + 4);
      }
    }

    // Support (Green dashed line + Green tag)
    for (const sup of supports.slice(0, 3)) {
      if (sup >= paddedMinPrice && sup <= paddedMaxPrice) {
        const y = getPriceY(sup);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Tag badge on right Y axis
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(padding.left + chartWidth + 2, y - 8, 54, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = labelFont;
        ctx.textAlign = 'center';
        ctx.fillText(`支撑 ${sup}`, padding.left + chartWidth + 29, y + 4);
      }
    }
    ctx.setLineDash([]);

    // 3. Draw Candlesticks & Volume Bars
    for (let i = startIndex; i < endIndex; i++) {
      const p = data[i];
      if (!p) continue;
      const x = getX(i);
      const isUp = p.close >= p.open;
      const candleColor = isUp ? '#ef4444' : '#22c55e';

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
      ctx.fillStyle = isUp ? 'rgba(239, 68, 68, 0.65)' : 'rgba(34, 197, 94, 0.65)';
      ctx.fillRect(x - candleWidth / 2, vY, candleWidth, vH);
    }

    // 4. Draw Moving Averages (MA5: Yellow, MA20: Sky, MA60: Purple)
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

    drawMALine(mas.ma5, '#eab308');  // MA5 Yellow
    drawMALine(mas.ma20, '#06b6d4'); // MA20 Cyan
    drawMALine(mas.ma60, '#a855f7'); // MA60 Purple

    // 5. Volume Tag on right side
    if (activeCandle) {
      const volFormatted = formatVolume(activeCandle.volume);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(padding.left + chartWidth + 2, volY + volHeight - 16, 54, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = labelFont;
      ctx.textAlign = 'center';
      ctx.fillText(volFormatted, padding.left + chartWidth + 29, volY + volHeight - 4);
    }

    // 6. Current Price Tag on right axis
    if (activeCandle) {
      const cy = getPriceY(activeCandle.close);
      ctx.fillStyle = activeCandle.close >= activeCandle.open ? '#dc2626' : '#16a34a';
      ctx.fillRect(padding.left + chartWidth + 2, cy - 8, 54, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = monoFont;
      ctx.textAlign = 'center';
      ctx.fillText(activeCandle.close.toFixed(2), padding.left + chartWidth + 29, cy + 4);
    }

    // 7. Draw Top-Left HUD inside Canvas matching screenshot
    // O 10.25 H 10.30 L 9.45 C 9.45 MA5 10.04 MA20 9.05 MA60 8.85
    if (activeCandle) {
      ctx.textAlign = 'left';
      ctx.font = monoFont;

      let hudX = padding.left + 4;
      const hudY = mainY - 12;

      // O, H, L, C in green/emerald
      ctx.fillStyle = '#22c55e';
      ctx.fillText(`O ${activeCandle.open.toFixed(2)}`, hudX, hudY);
      hudX += 60;
      ctx.fillText(`H ${activeCandle.high.toFixed(2)}`, hudX, hudY);
      hudX += 60;
      ctx.fillText(`L ${activeCandle.low.toFixed(2)}`, hudX, hudY);
      hudX += 60;
      ctx.fillText(`C ${activeCandle.close.toFixed(2)}`, hudX, hudY);
      hudX += 68;

      // MA5 in yellow
      ctx.fillStyle = '#eab308';
      ctx.fillText(`MA5 ${mas.ma5[activeIndex]?.toFixed(2) || '--'}`, hudX, hudY);
      hudX += 78;

      // MA20 in cyan
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(`MA20 ${mas.ma20[activeIndex]?.toFixed(2) || '--'}`, hudX, hudY);
      hudX += 82;

      // MA60 in purple
      ctx.fillStyle = '#a855f7';
      ctx.fillText(`MA60 ${mas.ma60[activeIndex]?.toFixed(2) || '--'}`, hudX, hudY);
    }

    // 8. Date labels on bottom
    ctx.fillStyle = '#475569';
    ctx.font = monoFont;
    ctx.textAlign = 'center';

    const step = Math.max(1, Math.floor(visibleData.length / 6));
    for (let i = 0; i < visibleData.length; i += step) {
      const p = visibleData[i];
      if (!p) continue;
      const x = getX(startIndex + i);
      const displayDate = p.time.includes(' ') ? p.time.split(' ')[1] : p.time.slice(5);
      ctx.fillText(displayDate, x, height - 8);
    }

    // 9. Crosshair hover lines
    if (mousePos && hoverIndex !== null && hoverIndex >= startIndex && hoverIndex < endIndex) {
      const x = getX(hoverIndex);
      const y = Math.min(volY + volHeight, Math.max(mainY, mousePos.y));

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(x, mainY);
      ctx.lineTo(x, volY + volHeight);
      ctx.stroke();

      if (mousePos.y <= mainY + mainHeight) {
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [
    data,
    visibleData,
    startIndex,
    endIndex,
    hoverIndex,
    mousePos,
    mas,
    supports,
    resistances,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const padding = { left: 16, right: 64 };
    const chartWidth = rect.width - padding.left - padding.right;

    if (x >= padding.left && x <= padding.left + chartWidth) {
      const relX = x - padding.left;
      const step = chartWidth / visibleData.length;
      const indexOffset = Math.floor(relX / step);
      const computedIndex = Math.min(endIndex - 1, Math.max(startIndex, startIndex + indexOffset));
      setHoverIndex(computedIndex);
    }

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

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverIndex(null);
    setMousePos(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setVisibleCount((prev) => Math.max(25, prev - 5));
    } else {
      setVisibleCount((prev) => Math.min(Math.min(200, data.length), prev + 5));
    }
  };

  return (
    <div className="bg-[#0a0e14] border border-[#1d2631] rounded-lg overflow-hidden flex flex-col">
      {/* Chart Canvas Area */}
      <div
        ref={containerRef}
        className="relative w-full h-[520px] bg-[#0a0e14] cursor-crosshair select-none"
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

      {/* Bottom Footer Legend matching screenshot */}
      <div className="px-4 py-2.5 bg-[#080c10] border-t border-[#161f28] flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#eab308]">
            <span className="w-3 h-0.5 bg-[#eab308]" /> MA5
          </span>
          <span className="flex items-center gap-1 text-[#06b6d4]">
            <span className="w-3 h-0.5 bg-[#06b6d4]" /> MA20
          </span>
          <span className="flex items-center gap-1 text-[#a855f7]">
            <span className="w-3 h-0.5 bg-[#a855f7]" /> MA60
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          数据来源: 公开行情接口，延迟以实际为准，仅供参考
        </div>
      </div>
    </div>
  );
};
