import { CandleData } from "./types";
import { LineData, Time } from "lightweight-charts";

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

