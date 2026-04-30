import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function base64Encode(str: string) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  const bytes = new TextEncoder().encode(str);

  let result = '';
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++] || 0;
    const byte2 = bytes[i++] || 0;
    const byte3 = bytes[i++] || 0;

    const index1 = (byte1 >> 2) & 0x3F;
    const index2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
    const index3 = ((byte2 & 0x0F) << 2) | (byte3 >> 6);
    const index4 = byte3 & 0x3F;

    result += CHARS[index1] + CHARS[index2] + CHARS[index3] + CHARS[index4];
  }

  const padLen = (3 - (bytes.length % 3)) % 3;
  return result.slice(0, result.length - padLen) + '='.repeat(padLen);
}

export function stringToHex(str: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
