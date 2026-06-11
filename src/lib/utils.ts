import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { nodeRgbUtxos } from "./commands";
import { WalletUtxoDto } from "./sdk/generated-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getRandomColor(str: string) {
  let asciiSum = 0;
  for (let i = 0; i < str.length; i++) {
    asciiSum += str.charCodeAt(i);
  }

  const red = Math.abs(Math.sin(asciiSum) * 256).toFixed(0);
  const green = Math.abs(Math.sin(asciiSum + 1) * 256).toFixed(0);
  const blue = Math.abs(Math.sin(asciiSum + 2) * 256).toFixed(0);
  return (alpha: number) => `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getGradientStyle(text: string) {
  const color = getRandomColor(text);
  const color1 = color(1);
  const color2 = color(0.6);

  return `linear-gradient(135deg, ${color1}, ${color2})`;
}


export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export function getDirname(dir: string): string {
  dir = dir.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');

  return '' === dir ? '/' : dir;
}

export function trimChar(str: string, char: string): string {
  if(!str) {
    return '';
  }
  if (char === str.charAt(0)) {
    str = str.substring(1);
  }
  if (str.length > 0 && char === str.charAt(str.length - 1)) {
    str = str.substring(0, str.length - 1);
  }

  return str;
}

export function formatAddress(address: string | undefined, show = 20): string {
  if (!address) {
    return '';
  }

  const len = address.length;
  if (len <= show) {
    return address;
  }

  const half = Math.floor(show / 2);
  return `${address.substring(0, half)}...${address.substring(len - half)}`;
}

export function sortHttpParams(params: Record<string, any>) {
  const filteredParams: any = {};

  for (const key in params) {
    const value = params[key];
    if (value === null || value === undefined) {
      continue;
    }
    filteredParams[key] = value;
  }

  const sortedKeys = Object.keys(filteredParams).sort();
  const result = sortedKeys.map(key => {
    return `${key}=${filteredParams[key]}`;
  }).join('&');

  return result;
}

export function stringToHex(str: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function safeSubstring(str: string | undefined, len = 8, subFix = '...'): string {
  if (!str) {
    return '';
  }

  if (str.length <= len) {
    return str;
  }

  return str.substring(0, len) + subFix;
}

export async function classifyUtxos(nodeId: string) {
  try {
    const used: Record<string, string> = {};
    const available: Record<string, string> = {};

    // 1. Fetch all RGB UTXOs
    const all = await nodeRgbUtxos(nodeId);

    // 2. Occupied and available (unused & confirmed) UTXOs
    all.utxos.forEach(item => {
      const outpoint = item.outpoint;
      const assets = item.rgb.allocations
      if (assets && assets.length > 0) {
        used[outpoint] = item.value_sats

      } else {
        const confirmed = item.confirmation && item.confirmation.status === 'confirmed';
        if (/* !outpoint.endsWith(':1') && */ confirmed) {
          available[outpoint] = item.value_sats;
        }
      }
    });

    return {
      used,
      available,
    }
  } catch(e) {}

  return null
}

export function selectUtxos(utxos: WalletUtxoDto[], valueSats: string | number) {
  // Sort UTXOs by value in ascending order
  const list = [...utxos].sort((a, b) => {
    return BigInt(a.value_sats) - BigInt(b.value_sats) >= 0n ? 1 : -1;
  });
  const value = BigInt(valueSats);

  const selected: WalletUtxoDto[] = [];
  let total = BigInt(0);
  for (const item of list) {
    selected.push(item);
    total += BigInt(item.value_sats);

    if (total >= value) {
      break;
    }
  }

  if (total < value) {
    throw new Error('Insufficient balance');
  }

  return selected;
}
