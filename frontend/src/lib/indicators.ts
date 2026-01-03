import { CandleData } from "./types";
import { LineData, Time, HistogramData, WhitespaceData } from "lightweight-charts";

/**
 * Calculates ZigZag indicator data
 * @param data Array of CandleData
 * @param deviation Percentage deviation required to reverse trend (e.g., 5 for 5%)
 * @param depth Minimum bars back (optional, currently not strictly enforced in this simple deviation algorithm)
 * @returns Array of LineData points (pivots)
 */
export const calculateZigZag = (
  data: CandleData[],
  deviation: number = 0.1,
  depth: number = 10
): LineData<Time>[] => {
  if (!data || data.length < 2) return [];

  const points: LineData<Time>[] = [];
  const dev = deviation / 100;

  // Helper to get time
  const getTime = (index: number) => data[index].time as unknown as Time;

  // Find initial trend
  let trendDir = 0; // 1 = Up, -1 = Down
  let startStep = 0;
  
  // Scan for first significant move
  let firstHigh = data[0].high;
  let firstLow = data[0].low;
  
  for (let i = 1; i < data.length; i++) {
    const bar = data[i];
    if (bar.high > firstLow * (1 + dev) && bar.low > firstLow) {
      trendDir = 1; // Trend Up (looking for High)
      points.push({ time: getTime(0), value: data[0].low }); // Start at low
      startStep = i;
      break;
    }
    if (bar.low < firstHigh * (1 - dev) && bar.high < firstHigh) {
      trendDir = -1; // Trend Down (looking for Low)
      points.push({ time: getTime(0), value: data[0].high }); // Start at high
      startStep = i;
      break;
    }
    firstHigh = Math.max(firstHigh, bar.high);
    firstLow = Math.min(firstLow, bar.low);
  }

  if (trendDir === 0) return []; // No trend established

  let currentHigh = data[startStep].high;
  let currentHighIndex = startStep;
  let currentLow = data[startStep].low;
  let currentLowIndex = startStep;

  // Iterate from startStep
  for (let i = startStep; i < data.length; i++) {
    const bar = data[i];

    if (trendDir === 1) {
      // Trend UP: Looking for highest High
      if (bar.high > currentHigh) {
        currentHigh = bar.high;
        currentHighIndex = i;
      }

      // Check for Reversal to DOWN
      if (bar.low < currentHigh * (1 - dev)) {
        // Confirm the previous High
        if (
          points.length === 0 ||
          (getTime(currentHighIndex) as number) >
            (points[points.length - 1].time as number)
        ) {
          points.push({ time: getTime(currentHighIndex), value: currentHigh });
        }

        // Switch to Down
        trendDir = -1;
        currentLow = bar.low;
        currentLowIndex = i;
      }
    } else {
      // Trend DOWN: Looking for lowest Low
      if (bar.low < currentLow) {
        currentLow = bar.low;
        currentLowIndex = i;
      }

      // Check for Reversal to UP
      if (bar.high > currentLow * (1 + dev)) {
        // Confirm the previous Low
        if (
          points.length === 0 ||
          (getTime(currentLowIndex) as number) >
            (points[points.length - 1].time as number)
        ) {
          points.push({ time: getTime(currentLowIndex), value: currentLow });
        }

        // Switch to Up
        trendDir = 1;
        currentHigh = bar.high;
        currentHighIndex = i;
      }
    }
  }

  // Add the final loose end (last extreme found)
  if (trendDir === 1) {
    if (
      points.length === 0 ||
      (getTime(currentHighIndex) as number) >
        (points[points.length - 1].time as number)
    ) {
      points.push({ time: getTime(currentHighIndex), value: currentHigh });
    }
  } else {
    if (
      points.length === 0 ||
      (getTime(currentLowIndex) as number) >
        (points[points.length - 1].time as number)
    ) {
      points.push({ time: getTime(currentLowIndex), value: currentLow });
    }
  }

  return points;
};

// Helper to calculate SMA
export const calculateSMA = (
  data: CandleData[],
  period: number,
  source: "close" | "open" | "high" | "low" = "close"
): LineData<Time>[] => {
  const result: LineData<Time>[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j][source];
    }
    result.push({
      time: data[i].time as Time,
      value: sum / period,
    });
  }
  return result;
};

// Helper to calculate EMA
export const calculateEMA = (
  data: CandleData[],
  period: number,
  source: "close" | "open" | "high" | "low" = "close"
): LineData<Time>[] => {
  const result: LineData<Time>[] = [];
  const k = 2 / (period + 1);

  let ema = data[0][source];

  for (let i = 0; i < data.length; i++) {
    const price = data[i][source];
    if (i === 0) {
      ema = price; // Start with first price (or SMA of first N)
    } else {
      ema = price * k + ema * (1 - k);
    }

    if (i >= period - 1) {
      result.push({
        time: data[i].time as Time,
        value: ema,
      });
    }
  }
  return result;
};

// Helper to calculate WMA
export const calculateWMA = (
  data: CandleData[],
  period: number,
  source: "close" | "open" | "high" | "low" = "close"
): LineData<Time>[] => {
  const result: LineData<Time>[] = [];
  const weightSum = (period * (period + 1)) / 2;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;

    let sum = 0;
    for (let j = 0; j < period; j++) {
      // Weight: period for current (j=0), 1 for oldest (j=period-1)
      // So weight = period - j
      sum += data[i - j][source] * (period - j);
    }

    result.push({
      time: data[i].time as Time,
      value: sum / weightSum,
    });
  }
  return result;
};

// Helper to calculate RSI
export const calculateRSI = (
  data: CandleData[],
  period: number = 14
): LineData<Time>[] => {
  const result: LineData<Time>[] = [];
  if (data.length < period + 1) return result;

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  // First RSI value using SMA
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  result.push({
    time: data[period].time as Time,
    value: rsi,
  });

  // Subsequent RSI values using Wilder's smoothing (EMA-like)
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    result.push({
      time: data[i + 1].time as Time,
      value: rsi,
    });
  }

  return result;
};

// MACD Result Type
export interface MACDResult {
  macd: LineData<Time>[];
  signal: LineData<Time>[];
  histogram: HistogramData<Time>[];
}

// Helper to calculate MACD
export const calculateMACD = (
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult => {
  const macdData: LineData<Time>[] = [];
  const signalData: LineData<Time>[] = [];
  const histogramData: HistogramData<Time>[] = [];

  if (data.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  // Calculate Fast EMA
  const fastEMA = calculateEMA(data, fastPeriod, "close");
  // Calculate Slow EMA
  const slowEMA = calculateEMA(data, slowPeriod, "close");

  // Map EMAs by time for easy alignment
  // Since EMAs are calculated and return array of objects with time,
  // we need to align them.
  // Note: EMAs calculated above exclude the initial 'period-1' points.
  
  // We need to iterate and match timestamps
  const fastMap = new Map<number, number>();
  fastEMA.forEach(item => fastMap.set(item.time as number, item.value));

  const slowMap = new Map<number, number>();
  slowEMA.forEach(item => slowMap.set(item.time as number, item.value));

  // MACD Line = Fast EMA - Slow EMA
  const macdLinePoints: { time: Time; value: number }[] = [];

  // Iterate through data to maintain order
  for (let i = 0; i < data.length; i++) {
    const time = data[i].time as unknown as Time;
    const fastVal = fastMap.get(time as number);
    const slowVal = slowMap.get(time as number);

    if (fastVal !== undefined && slowVal !== undefined) {
      const macdVal = fastVal - slowVal;
      macdLinePoints.push({ time, value: macdVal });
      macdData.push({ time, value: macdVal });
    }
  }

  // Signal Line = EMA of MACD Line (period = signalPeriod)
  // We can't reuse calculateEMA directly because it expects CandleData[]
  // Let's implement simple EMA for number[] or adapt
  
  // Custom EMA for line data
  const calculateLineEMA = (sourceData: {time: Time, value: number}[], period: number) => {
    const result: LineData<Time>[] = [];
    const k = 2 / (period + 1);
    let ema = sourceData[0].value;

    for (let i = 0; i < sourceData.length; i++) {
      const val = sourceData[i].value;
      if (i === 0) {
        ema = val;
      } else {
        ema = val * k + ema * (1 - k);
      }
      
      if (i >= period - 1) {
        result.push({ time: sourceData[i].time, value: ema });
      }
    }
    return result;
  }

  if (macdLinePoints.length >= signalPeriod) {
    const signalLine = calculateLineEMA(macdLinePoints, signalPeriod);
    
    // Create map for signal line
    const signalMap = new Map<number, number>();
    signalLine.forEach(item => signalMap.set(item.time as number, item.value));

    signalData.push(...signalLine);

    // Histogram = MACD - Signal
    for (let i = 0; i < macdData.length; i++) {
      const item = macdData[i];
      const signalVal = signalMap.get(item.time as number);
      
      if (signalVal !== undefined) {
        const histVal = item.value - signalVal;
        histogramData.push({
          time: item.time,
          value: histVal,
          color: histVal >= 0 ? "#26a69a" : "#ef5350", // Green/Red
        });
      }
    }
  }

  return { macd: macdData, signal: signalData, histogram: histogramData };
};
