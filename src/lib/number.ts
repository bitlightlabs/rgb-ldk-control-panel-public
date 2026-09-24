import BigNumber from 'bignumber.js';

export function formatNumber(num: string | number, decimals: string | number = 2): string {
  const bigNum = new BigNumber(num);
  return bigNum.dividedBy(new BigNumber(10).pow(decimals)).toFixed();
}

export function parseNumber(num: string | number, decimals: string | number = 0): string {
  const bigNum = new BigNumber(num);
  return bigNum.multipliedBy(new BigNumber(10).pow(decimals)).toFixed(0);
}

export function calculateIntersection(
  range1: [string | bigint, string | bigint],
  range2: [string | bigint, string | bigint]
 ): [bigint, bigint] {
  const [min1, max1] = range1;
  const [min2, max2] = range2;

  const intersectionMin = BigInt(min1) > BigInt(min2) ? BigInt(min1) : BigInt(min2);
  const intersectionMax = BigInt(max1) < BigInt(max2) ? BigInt(max1) : BigInt(max2);

  return [intersectionMin, intersectionMax] as [bigint, bigint];
}
