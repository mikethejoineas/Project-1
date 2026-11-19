export interface PriorAddressInput {
  street?: string;
  city?: string;
  zip?: string;
  county?: string;
  moveInMonth: number | string;
  moveInYear: number | string;
  moveOutMonth: number | string;
  moveOutYear: number | string;
}

export interface AddressCoverageResult {
  monthsCovered: number;
  yearsCovered: number;
  yearsRequired: number;
  isComplete: boolean;
  missingMonths: number;
}

function toMonthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function parseIntSafe(val: number | string | undefined): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : Number.parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Calculates how many months of the past 10 years (120 months up to referenceDate)
 * are covered by the current address + prior addresses without double-counting overlaps.
 */
export function calculateAddressHistoryCoverage(
  currentMoveInMonth: number | string | undefined,
  currentMoveInYear: number | string | undefined,
  priorAddresses: PriorAddressInput[] = [],
  referenceDate: Date = new Date()
): AddressCoverageResult {
  const requiredMonths = 120;
  const endMonthIdx = toMonthIndex(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1
  );
  const windowStartIdx = endMonthIdx - requiredMonths;

  const intervals: Array<[number, number]> = [];

  const curM = parseIntSafe(currentMoveInMonth);
  const curY = parseIntSafe(currentMoveInYear);
  if (curM !== null && curY !== null && curM >= 1 && curM <= 12 && curY >= 1900) {
    const start = toMonthIndex(curY, curM);
    if (start <= endMonthIdx) {
      intervals.push([Math.max(start, windowStartIdx), endMonthIdx]);
    }
  }

  for (const addr of priorAddresses) {
    const inM = parseIntSafe(addr.moveInMonth);
    const inY = parseIntSafe(addr.moveInYear);
    const outM = parseIntSafe(addr.moveOutMonth);
    const outY = parseIntSafe(addr.moveOutYear);
    if (
      inM !== null &&
      inY !== null &&
      outM !== null &&
      outY !== null &&
      inM >= 1 &&
      inM <= 12 &&
      outM >= 1 &&
      outM <= 12 &&
      inY >= 1900 &&
      outY >= 1900
    ) {
      const start = toMonthIndex(inY, inM);
      const end = toMonthIndex(outY, outM);
      if (start <= end && end >= windowStartIdx && start <= endMonthIdx) {
        intervals.push([
          Math.max(start, windowStartIdx),
          Math.min(end, endMonthIdx),
        ]);
      }
    }
  }

  if (intervals.length === 0) {
    return {
      monthsCovered: 0,
      yearsCovered: 0,
      yearsRequired: 10,
      isComplete: false,
      missingMonths: requiredMonths,
    };
  }

  // Merge overlapping or adjacent month intervals
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = intervals[i];
    if (curr[0] <= prev[1] + 1) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }

  let totalMonths = 0;
  for (const [s, e] of merged) {
    // Count inclusive month span capped at requiredMonths
    totalMonths += e - s;
  }

  // Note: If current address started 10+ years ago (e.g., endMonthIdx - start >= 120),
  // e - s equals 120. If prior addresses meet seamlessly (e.g. moved out 2021-05, moved into current 2021-05),
  // merging adjacent/overlapping intervals sums the span cleanly.
  const clampedMonths = Math.min(requiredMonths, Math.max(0, totalMonths));
  const yearsCovered = Math.min(10, Math.floor((clampedMonths / 12) * 10) / 10);

  return {
    monthsCovered: clampedMonths,
    yearsCovered,
    yearsRequired: 10,
    isComplete: clampedMonths >= requiredMonths,
    missingMonths: Math.max(0, requiredMonths - clampedMonths),
  };
}
