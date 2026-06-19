import { join } from "node:path";
import { mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const BIN_DIR = join(import.meta.dirname, "..", "src-tauri", "binaries");
const EXTRACT_DIR = join(BIN_DIR, "_extract");

const BASE_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest";

const PLATFORM_MAP: Record<string, { archive: string; files: [string, string] }> = {
  "win32-x64": {
    archive: "ffmpeg-master-latest-win64-gpl.zip",
    files: ["ffmpeg.exe", "ffprobe.exe"],
  },
  "darwin-arm64": {
    archive: "ffmpeg-master-latest-macos64lgpl.zip",
    files: ["ffmpeg", "ffprobe"],
  },
  "darwin-x64": {
    archive: "ffmpeg-master-latest-macos64lgpl.zip",
    files: ["ffmpeg", "ffprobe"],
  },
  "linux-x64": {
    archive: "ffmpeg-master-latest-linux64-gpl.tar.xz",
    files: ["ffmpeg", "ffprobe"],
  },
  "linux-arm64": {
    archive: "ffmpeg-master-latest-linuxarm64-gpl.tar.xz",
    files: ["ffmpeg", "ffprobe"],
  },
};

function getPlatformKey(): string {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return `${process.platform}-${arch}`;
}

function alreadyDownloaded(): boolean {
  const platform = getPlatformKey();
  const info = PLATFORM_MAP[platform];
  if (!info) return false;
  const [ffmpegName, ffprobeName] = info.files;
  return existsSync(join(BIN_DIR, ffmpegName)) && existsSync(join(BIN_DIR, ffprobeName));
}

function run(cmd: string, args: string[], cwd?: string): void {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0 && result.status !== null) {
    throw new Error(`${cmd} ${args.join(" ")} exited with ${result.status}`);
  }
}

function findFiles(dir: string, names: string[]): Map<string, string> {
  const found = new Map<string, string>();
  const stack = [dir];
  while (stack.length > 0 && found.size < names.length) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const name = entry.toLowerCase();
      if (names.some((n) => n.toLowerCase() === name)) {
        found.set(entry, full);
      }
      try { if (statSync(full).isDirectory()) stack.push(full); } catch {}
    }
  }
  return found;
}

async function main() {
  if (alreadyDownloaded()) {
    console.log("[download-ffmpeg] Binaries already present, skipping.");
    return;
  }

  mkdirSync(BIN_DIR, { recursive: true });
  mkdirSync(EXTRACT_DIR, { recursive: true });

  const platform = getPlatformKey();
  const info = PLATFORM_MAP[platform];
  if (!info) {
    console.error(`[download-ffmpeg] Unsupported platform: ${platform}`);
    process.exit(1);
  }

  const [ffmpegName, ffprobeName] = info.files;
  const url = `${BASE_URL}/${info.archive}`;
  const archivePath = join(BIN_DIR, info.archive);

  // Download archive if not already cached
  if (existsSync(archivePath)) {
    console.log("[download-ffmpeg] Archive already downloaded, reusing.");
  } else {
    console.log(`[download-ffmpeg] Downloading ${url} ...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await Bun.write(archivePath, res);
  }

  console.log("[download-ffmpeg] Extracting...");

  if (info.archive.endsWith(".zip")) {
    if (process.platform === "win32") {
      run("powershell", [
        "-Command",
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${EXTRACT_DIR}' -Force`,
      ]);
    } else {
      run("unzip", ["-o", archivePath, "-d", EXTRACT_DIR]);
    }
  } else {
    run("tar", ["-xJf", archivePath, "-C", EXTRACT_DIR]);
  }

  // Search recursively for ffmpeg and ffprobe inside EXTRACT_DIR
  const found = findFiles(EXTRACT_DIR, [ffmpegName, ffprobeName]);
  for (const [name, src] of found) {
    const dest = join(BIN_DIR, name);
    await Bun.write(dest, Bun.file(src));
    console.log(`[download-ffmpeg] Extracted: ${name}`);
  }

  if (found.size === 0) {
    console.error("[download-ffmpeg] ffmpeg/ffprobe not found in archive. Contents:");
    for (const entry of readdirSync(EXTRACT_DIR, { recursive: true })) {
      console.error(`  ${entry}`);
    }
    process.exit(1);
  }

  // Cleanup
  Bun.file(archivePath).delete?.();
  const { rmSync } = await import("node:fs");
  try { rmSync(EXTRACT_DIR, { recursive: true, force: true }); } catch {}

  console.log("[download-ffmpeg] Done.");
}

main().catch((err) => {
  console.error("[download-ffmpeg] Failed:", err);
  process.exit(1);
});
