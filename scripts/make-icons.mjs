// Renders the PNG app icons from public/icon.svg. Run: node scripts/make-icons.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync(new URL("../public/icon.svg", import.meta.url));
// Maskable icons need a safe zone, so draw the mark smaller on a full-bleed background.
const inner = svg.toString().trim().replace('<rect width="64" height="64" rx="16" fill="#0f766e"/>', "");
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0f766e"/><g transform="translate(9.6 9.6) scale(0.7)">${inner.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g></svg>`,
);

const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;
await sharp(svg, { density: 1200 }).resize(192, 192).png().toFile(out("icon-192.png"));
await sharp(svg, { density: 1200 }).resize(512, 512).png().toFile(out("icon-512.png"));
await sharp(maskable, { density: 1200 }).resize(512, 512).png().toFile(out("icon-maskable-512.png"));
await sharp(maskable, { density: 1200 }).resize(180, 180).png().toFile(out("apple-touch-icon.png"));
console.log("icons written");
