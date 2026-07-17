import BigNumber from 'bignumber.js';

export function formatNumber(num: string | number, decimals: string | number = 2): string {
  const bigNum = new BigNumber(num);
  return bigNum.dividedBy(new BigNumber(10).pow(decimals)).toFixed();
}

export function parseNumber(num: string | number, decimals: string | number = 0): string {
  const bigNum = new BigNumber(num);
  return bigNum.multipliedBy(new BigNumber(10).pow(decimals)).toFixed(0);
}
