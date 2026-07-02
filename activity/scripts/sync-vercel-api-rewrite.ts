import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const vercelPath = path.join(scriptDir, "..", "vercel.json");

function normalizeHost(raw: string): string {
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const host = process.env.VITE_API_HOST
  ? normalizeHost(process.env.VITE_API_HOST)
  : "";

if (!host) {
  console.warn("VITE_API_HOST not set — skipping vercel.json API rewrite sync");
  process.exit(0);
}

const config = JSON.parse(readFileSync(vercelPath, "utf8")) as {
  rewrites?: Array<{ source: string; destination: string }>;
};

const rewrite = config.rewrites?.find((entry) => entry.source === "/api/:path*");
if (!rewrite) {
  throw new Error("Missing /api/:path* rewrite in vercel.json");
}

rewrite.destination = `https://${host}/api/:path*`;
writeFileSync(vercelPath, `${JSON.stringify(config, null, 2)}\n`);
console.warn(`Synced vercel.json API rewrite → https://${host}/api/:path*`);
