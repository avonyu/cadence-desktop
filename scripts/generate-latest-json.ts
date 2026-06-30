/// <reference types="bun" />
// generate-latest-json.ts — Generate latest.json for Tauri updater
//
// Reads version from tauri.conf.json and signatures from bundle .sig files.
// Outputs to src-tauri/target/release/bundle/latest.json by default.
//
// Usage:
//   bun run scripts/generate-latest-json.ts [--out <FILE>] [--version <VER>] [--notes <NOTES>]

import { resolve } from "node:path";

const REPO_OWNER = "avonyu";
const REPO_NAME = "cadence-desktop";
const RELEASES_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download`;

interface PlatformEntry {
  signature: string;
  url: string;
}

interface LatestJson {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, PlatformEntry>;
}

async function pathExists(p: string): Promise<boolean> {
  return Bun.file(p).exists();
}

async function main() {
  const args = process.argv.slice(2);

  let outFile = "";
  let versionOverride = "";
  let notes = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--out":
        outFile = args[++i] ?? "";
        if (!outFile) {
          console.error("Missing file path after --out");
          process.exit(1);
        }
        break;
      case "--version":
        versionOverride = args[++i] ?? "";
        if (!versionOverride) {
          console.error("Missing version after --version");
          process.exit(1);
        }
        break;
      case "--notes":
        notes = args[++i] ?? "";
        if (!notes) {
          console.error("Missing notes after --notes");
          process.exit(1);
        }
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        console.error("Usage: bun run scripts/generate-latest-json.ts [--out <FILE>] [--version <VER>] [--notes <NOTES>]");
        process.exit(1);
    }
  }

  // Resolve paths relative to the project root (where package.json lives)
  const projectRoot = resolve(import.meta.dirname, "..");
  const tauriConfPath = resolve(projectRoot, "src-tauri", "tauri.conf.json");
  const bundleDir = resolve(projectRoot, "src-tauri", "target", "release", "bundle");

  // Read version from tauri.conf.json
  const confRaw = await Bun.file(tauriConfPath).text();
  const conf = JSON.parse(confRaw);
  const version = versionOverride || conf.version;
  const productName: string = conf.productName ?? "Cadence Desktop";

  if (!version) {
    console.error("Could not determine version from tauri.conf.json");
    process.exit(1);
  }

  // Product name with dots for the URL (matches tauri's release asset naming)
  const productNameDots = productName.replace(/\s+/g, ".");

  outFile ||= resolve(bundleDir, "latest.json");

  // Platform definitions: [key, sig glob, url suffix]
  const platforms: Array<{
    key: string;
    sigPath: string;
    assetName: string;
  }> = [
    {
      key: "windows-x86_64",
      sigPath: resolve(bundleDir, "nsis", `${productName}_${version}_x64-setup.exe.sig`),
      assetName: `${productNameDots}_${version}_x64-setup.exe`,
    },
    {
      key: "darwin-aarch64",
      sigPath: resolve(bundleDir, "macos", `${productName}_${version}_aarch64.dmg.sig`),
      assetName: `${productNameDots}_${version}_aarch64.dmg`,
    },
    {
      key: "darwin-x86_64",
      sigPath: resolve(bundleDir, "macos", `${productName}_${version}_x64.dmg.sig`),
      assetName: `${productNameDots}_${version}_x64.dmg`,
    },
    {
      key: "linux-x86_64",
      sigPath: resolve(bundleDir, "appimage", `${productName}_${version}_amd64.AppImage.sig`),
      assetName: `${productNameDots}_${version}_amd64.AppImage`,
    },
  ];

  const platformsMap: Record<string, PlatformEntry> = {};

  for (const { key, sigPath, assetName } of platforms) {
    if (await pathExists(sigPath)) {
      const signature = (await Bun.file(sigPath).text()).trim();
      const url = `${RELEASES_BASE}/v${version}/${assetName}`;
      platformsMap[key] = { signature, url };
      console.log(`  ✓ ${key}`);
    } else {
      console.log(`  ✗ ${key} (no signature found — skipping)`);
    }
  }

  if (Object.keys(platformsMap).length === 0) {
    console.error("No platform signatures found. Run `tauri build` first.");
    process.exit(1);
  }

  const latestJson: LatestJson = {
    version,
    notes: notes || `Cadence Desktop v${version}`,
    pub_date: new Date().toISOString(),
    platforms: platformsMap,
  };

  const jsonStr = JSON.stringify(latestJson, null, 2) + "\n";
  await Bun.write(outFile, jsonStr);

  console.log(`\nGenerated ${outFile}`);
  console.log(`Version: ${version}`);
  console.log(`Platforms: ${Object.keys(platformsMap).join(", ")}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
