import type { StockDragonTigerDetail, StockDragonTigerSeatItem } from '../src/types';
import { getRealTimeLimitUpBoardData } from './realtimeLimitUpService';
import { getBeijingDate, formatBeijingDateStr, isTradingDay } from './sampleData';
import { resolveSeatMeta } from './seatMeta';

export { FAMOUS_HOT_MONEY_MAP } from './seatMeta';

/**
 * Get the most recent trading day date string (YYYY-MM-DD)
 */
function getRecentTradingDayStr(): string {
  const today = getBeijingDate();
  if (isTradingDay(today)) {
    return formatBeijingDateStr(today);
  }
  const recent = new Date(today);
  while (!isTradingDay(recent)) {
    recent.setDate(recent.getDate() - 1);
  }
  return formatBeijingDateStr(recent);
}

/**
 * Resolves comprehensive Dragon-Tiger detail for a given stock code
 * ONLY returns hasDragonTiger: true if the latest data is from today (or most recent trading day)
 */
export async function fetchStockDragonTigerDetail(code: string): Promise<StockDragonTigerDetail> {
  const cleanCode = code.replace(/[^0-9]/g, '').padStart(6, '0');

  // Check limit-up cache first to see if stock is in today's limit-up pool
  let matchedLimitUpStock: any = null;
  try {
    const limitUpData = await getRealTimeLimitUpBoardData();
    matchedLimitUpStock = limitUpData.stocks.find((s) => s.code === cleanCode) || null;
  } catch {
    // ignore
  }

  // Target date: today if trading day, otherwise most recent trading day
  const targetDateStr = getRecentTradingDayStr();

  try {
    const buyUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSBUY&columns=ALL&filter=(SECURITY_CODE%3D%22${cleanCode}%22)&sortColumns=TRADE_DATE,BUY&sortTypes=-1,-1&pageSize=20`;
    const sellUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSSELL&columns=ALL&filter=(SECURITY_CODE%3D%22${cleanCode}%22)&sortColumns=TRADE_DATE,SELL&sortTypes=-1,-1&pageSize=20`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const [bResp, sResp] = await Promise.all([
      fetch(buyUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0', Connection: 'close' } }),
      fetch(sellUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0', Connection: 'close' } }),
    ]);
    clearTimeout(timer);

    let bList: any[] = [];
    let sList: any[] = [];

    if (bResp.ok) {
      const bJson = await bResp.json();
      bList = bJson?.result?.data || [];
    }
    if (sResp.ok) {
      const sJson = await sResp.json();
      sList = sJson?.result?.data || [];
    }

    if (bList.length > 0 || sList.length > 0) {
      // Find latest TRADE_DATE
      const latestDate = bList[0]?.TRADE_DATE || sList[0]?.TRADE_DATE;
      const latestDateStr = String(latestDate).split(' ')[0];

      // CRITICAL: Only process if latest data is from target date (today or most recent trading day)
      if (latestDateStr !== targetDateStr) {
        // Latest data is stale - NOT from today/recent trading day
        // Return hasDragonTiger: false (no dragon tiger data for today)
      } else {
        // Latest data IS from target date - process normally
        const latestBuyRows = bList.filter((item) => item.TRADE_DATE === latestDate);
        const latestSellRows = sList.filter((item) => item.TRADE_DATE === latestDate);

        // Deduplicate by OPERATEDEPT_NAME
        const deduplicatedBuy: any[] = [];
        const seenBuy = new Set<string>();
        for (const row of latestBuyRows) {
          const dept = String(row.OPERATEDEPT_NAME || '').trim();
          if (dept && !seenBuy.has(dept)) {
            seenBuy.add(dept);
            deduplicatedBuy.push(row);
          }
        }

        const deduplicatedSell: any[] = [];
        const seenSell = new Set<string>();
        for (const row of latestSellRows) {
          const dept = String(row.OPERATEDEPT_NAME || '').trim();
          if (dept && !seenSell.has(dept)) {
            seenSell.add(dept);
            deduplicatedSell.push(row);
          }
        }

        // Sort buy descending by BUY
        deduplicatedBuy.sort((a, b) => (parseFloat(b.BUY) || 0) - (parseFloat(a.BUY) || 0));
        // Sort sell descending by SELL
        deduplicatedSell.sort((a, b) => (parseFloat(b.SELL) || 0) - (parseFloat(a.SELL) || 0));

        const top5Buy = deduplicatedBuy.slice(0, 5);
        const top5Sell = deduplicatedSell.slice(0, 5);

        const buySeats: StockDragonTigerSeatItem[] = top5Buy.map((row, idx) => {
          const rawDept = String(row.OPERATEDEPT_NAME || '').trim();
          const meta = resolveSeatMeta(rawDept);
          const buyAmt = parseFloat(row.BUY) || 0;
          const sellAmt = parseFloat(row.SELL) || 0;
          const netAmt = parseFloat(row.NET) || (buyAmt - sellAmt);
          const ratio = (parseFloat(row.TOTAL_BUYRIO) || 0) * 100;

          return {
            rank: idx + 1,
            seatName: meta.seatName,
            rawDeptName: rawDept,
            seatType: meta.seatType,
            hotMoneyTag: meta.hotMoneyTag,
            hotMoneyDesc: meta.hotMoneyDesc,
            winRate30d: meta.winRate30d,
            buyAmount: buyAmt,
            sellAmount: sellAmt,
            netAmount: netAmt,
            ratio,
          };
        });

        const sellSeats: StockDragonTigerSeatItem[] = top5Sell.map((row, idx) => {
          const rawDept = String(row.OPERATEDEPT_NAME || '').trim();
          const meta = resolveSeatMeta(rawDept);
          const buyAmt = parseFloat(row.BUY) || 0;
          const sellAmt = parseFloat(row.SELL) || 0;
          const netAmt = parseFloat(row.NET) || (buyAmt - sellAmt);
          const ratio = (parseFloat(row.TOTAL_SELLRIO) || 0) * 100;

          return {
            rank: idx + 1,
            seatName: meta.seatName,
            rawDeptName: rawDept,
            seatType: meta.seatType,
            hotMoneyTag: meta.hotMoneyTag,
            hotMoneyDesc: meta.hotMoneyDesc,
            winRate30d: meta.winRate30d,
            buyAmount: buyAmt,
            sellAmount: sellAmt,
            netAmount: netAmt,
            ratio,
          };
        });

        // Calculate totals
        const totalBuy5 = buySeats.reduce((acc, cur) => acc + cur.buyAmount, 0);
        const totalSell5 = sellSeats.reduce((acc, cur) => acc + cur.sellAmount, 0);
        const netBuyTotal = totalBuy5 - totalSell5;

        const institutionBuyTotal = buySeats
          .filter((s) => s.seatType === 'institution')
          .reduce((acc, cur) => acc + cur.buyAmount, 0);
        const institutionSellTotal = sellSeats
          .filter((s) => s.seatType === 'institution')
          .reduce((acc, cur) => acc + cur.sellAmount, 0);
        const institutionNetTotal = institutionBuyTotal - institutionSellTotal;

        const northboundNetTotal =
          buySeats.filter((s) => s.seatType === 'northbound').reduce((acc, cur) => acc + cur.netAmount, 0) +
          sellSeats.filter((s) => s.seatType === 'northbound').reduce((acc, cur) => acc + cur.netAmount, 0);

        const hotMoneyNetTotal =
          buySeats.filter((s) => s.seatType === 'hot_money').reduce((acc, cur) => acc + cur.netAmount, 0);

        const retailNetTotal =
          buySeats.filter((s) => s.seatType === 'retail').reduce((acc, cur) => acc + cur.netAmount, 0);

        const firstRow = top5Buy[0] || top5Sell[0] || {};
        const stockName = String(firstRow.SECURITY_NAME_ABBR || matchedLimitUpStock?.name || `标的${cleanCode}`).trim();
        const explanation = String(firstRow.EXPLANATION || '日涨幅偏离值达标或日内换手率异常异动披露');
        const formattedDate = latestDate ? String(latestDate).split(' ')[0] : '最新交易日';

        // Interpret dragon tiger sentiment
        let sentiment = '游资机构分歧震荡';
        let hotMoneySummary = '席位呈现游资与多方主力博弈态势。';
        let institutionSummary = '机构资金参与度温和。';
        let tacticalAdvice = '关注次日开盘承接力度与分歧转一致机会。';

        if (institutionNetTotal > 30000000 && netBuyTotal > 0) {
          sentiment = '机构大单重仓主买';
          institutionSummary = `机构专用席位合计净买入 ¥${(institutionNetTotal / 100000000).toFixed(2)} 亿元，机构资金表现积极。`;
        } else if (institutionNetTotal < -30000000) {
          sentiment = '游资买入但机构大额减持';
          institutionSummary = `机构专用席位大额净卖出 ¥${(Math.abs(institutionNetTotal) / 100000000).toFixed(2)} 亿元，需防范机构砸盘风险。`;
        } else if (hotMoneyNetTotal > 50000000) {
          sentiment = '顶级游资合力抢筹封板';
          hotMoneySummary = `买一及买入席位汇集了知名顶级游资大单抢筹，买五合计买入达 ¥${(totalBuy5 / 100000000).toFixed(2)} 亿元。`;
        }

        if (netBuyTotal > 100000000) {
          tacticalAdvice = '龙虎榜主力资金呈大幅净流入状态，次日大概率享有高溢价，可观察集合竞价弱转强抢筹信号。';
        } else if (netBuyTotal < -50000000) {
          tacticalAdvice = '龙虎榜呈现主力资金净流出，上方抛压较重，次日若开盘不及预期需防范冲高回落风险。';
        } else {
          tacticalAdvice = '买卖双方力量相对均衡，属于良性换手分歧，关注5日线支撑与主线题材持续性。';
        }

        return {
          code: cleanCode,
          name: stockName,
          hasDragonTiger: true,
          tradeDate: formattedDate,
          reason: explanation,
          closePrice: parseFloat(firstRow.CLOSE_PRICE) || undefined,
          changeRate: parseFloat(firstRow.CHANGE_RATE) || undefined,
          accumAmount: parseFloat(firstRow.ACCUM_AMOUNT) || undefined,
          totalBuy5,
          totalSell5,
          netBuyTotal,
          institutionBuyTotal,
          institutionSellTotal,
          institutionNetTotal,
          northboundNetTotal,
          hotMoneyNetTotal,
          retailNetTotal,
          buySeats,
          sellSeats,
          verdictAnalysis: {
            dragonTigerSentiment: sentiment,
            hotMoneySummary,
            institutionSummary,
            tacticalAdvice,
          },
          limitUpInference: matchedLimitUpStock
            ? {
                isLimitUp: true,
                consecutiveBoards: matchedLimitUpStock.consecutiveBoards,
                boardText: matchedLimitUpStock.boardText,
                sector: matchedLimitUpStock.sector,
                sealAmount: matchedLimitUpStock.sealAmount,
                turnover: matchedLimitUpStock.turnover,
                reason: matchedLimitUpStock.reason,
              }
            : undefined,
        };
      }
    }
  } catch (err) {
    console.error('fetchStockDragonTigerDetail error:', err);
  }

  // If no Dragon Tiger record exists for this stock TODAY
  return {
    code: cleanCode,
    name: matchedLimitUpStock?.name || `标的${cleanCode}`,
    hasDragonTiger: false,
    totalBuy5: 0,
    totalSell5: 0,
    netBuyTotal: 0,
    institutionBuyTotal: 0,
    institutionSellTotal: 0,
    institutionNetTotal: 0,
    northboundNetTotal: 0,
    hotMoneyNetTotal: 0,
    retailNetTotal: 0,
    buySeats: [],
    sellSeats: [],
    notOnBoardReason:
      '当日未触发交易所龙虎榜公开披露标准（沪深交易所规则：仅披露日涨跌幅偏离值达±7%、日振幅达15%、日换手率达20%或连续3个交易日偏离值达20%等异动标的）。',
    limitUpInference: matchedLimitUpStock
      ? {
          isLimitUp: true,
          consecutiveBoards: matchedLimitUpStock.consecutiveBoards,
          boardText: matchedLimitUpStock.boardText,
          sector: matchedLimitUpStock.sector,
          sealAmount: matchedLimitUpStock.sealAmount,
          turnover: matchedLimitUpStock.turnover,
          reason: matchedLimitUpStock.reason,
        }
      : undefined,
  };
}
