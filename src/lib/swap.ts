import { formatNumber } from "./number"
import type { RgbContractDto, SwapInfo } from "./sdk/types"

export function ensureSendAsset(isMaker: boolean, makerGivesRgb: boolean, contract?: RgbContractDto | null) {
  let sendAsset = ''
  if(isMaker) {
    if(makerGivesRgb) {
      sendAsset = contract?.name ?? ''
    } else {
      sendAsset = 'BTC'
    }
  } else {
    // Taker
    if(makerGivesRgb) {
      sendAsset = 'BTC'
    } else {
      sendAsset = contract?.name ?? ''
    }
  }

  return sendAsset
}

export function parseSwapInfo(data: SwapInfo | undefined | null, contract: RgbContractDto | undefined | null) {
  if(!data) {
    return {}
  }

  const isMaker = data.role === 'Maker'
  const makerGivesRgb = data.maker_gives_rgb
  const precision = contract?.precision ?? 0

  const fromAssetName = ensureSendAsset(isMaker, makerGivesRgb, contract)
  const fromAssetAmount = fromAssetName === 'BTC' ?
      (BigInt(data.btc_amount_msat) / BigInt(1000)).toString() :
      formatNumber(data.asset_amount, precision)
  const fromAssetUnit = fromAssetName === 'BTC' ? 'sats' : contract?.name

  const toAssetName = fromAssetName === 'BTC' ? contract?.name : 'BTC'
  const toAssetAmount = fromAssetName === 'BTC' ?
    formatNumber(data.asset_amount, precision) :
    (BigInt(data.btc_amount_msat) / BigInt(1000)).toString()
  const toAssetUnit = toAssetName === 'BTC' ? 'sats' : contract?.name

  return {
    fromAssetName,
    fromAssetAmount,
    fromAssetUnit,
    toAssetName,
    toAssetAmount,
    toAssetUnit,
  }
}
