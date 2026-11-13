/**
 * End-to-end encrypted sharing without a server.
 *
 * The payload is compressed, encrypted with AES-GCM using a key derived from a
 * share code (PBKDF2-SHA-256), and placed in the URL *fragment* (after "#").
 * Browsers never send the fragment to the web server, so GitHub Pages only ever
 * serves static files and never sees health data. The share code travels
 * separately (e.g. read out over the phone).
 */

const FORMAT_VERSION = 1;
const ITERATIONS = 210_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export function generateShareCode(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(rnd, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join("")).join("-");
}

export function normalizeShareCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function deriveKey(code: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizeShareCode(code)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPayload(value: unknown, code: string): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(value));
  const compressed = await pipe(json, new CompressionStream("deflate-raw"));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, compressed));
  const out = new Uint8Array(1 + salt.length + iv.length + cipher.length);
  out[0] = FORMAT_VERSION;
  out.set(salt, 1);
  out.set(iv, 17);
  out.set(cipher, 29);
  return bytesToBase64Url(out);
}

export class ShareError extends Error {
  constructor(public reason: "format" | "code") {
    super(reason === "code" ? "Wrong share code" : "This link is damaged or not a DoseRelay link");
  }
}

export async function decryptPayload<T = unknown>(payload: string, code: string): Promise<T> {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = base64UrlToBytes(payload.trim());
  } catch {
    throw new ShareError("format");
  }
  if (bytes.length < 30 || bytes[0] !== FORMAT_VERSION) throw new ShareError("format");
  const salt = bytes.slice(1, 17);
  const iv = bytes.slice(17, 29);
  const cipher = bytes.slice(29);
  let plain: Uint8Array<ArrayBuffer>;
  try {
    const key = await deriveKey(code, salt);
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
  } catch {
    throw new ShareError("code");
  }
  try {
    const json = await pipe(plain, new DecompressionStream("deflate-raw"));
    return JSON.parse(new TextDecoder().decode(json)) as T;
  } catch {
    throw new ShareError("format");
  }
}
