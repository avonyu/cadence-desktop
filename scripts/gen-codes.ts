// gen-codes.ts — Generate activation codes for Cadence Desktop
//
// Reads CADENCE_ACTIVATION_SECRET and CADENCE_MAX_CODES from .env automatically.
// Outputs to ./activation_codes.txt by default.
//
// Usage:
//   bun run gen:codes [COUNT] [--out <FILE>]
//   COUNT defaults to CADENCE_MAX_CODES from .env

function loadEnv(): Record<string, string> {
  return Bun.env as Record<string, string>;
}

function toBeBytes(n: number): Uint8Array {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, n, false);
  return new Uint8Array(buf);
}

function formatCode(hex: string): string {
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

async function main() {
  const env = loadEnv();

  const secret = env["CADENCE_ACTIVATION_SECRET"];
  if (!secret) {
    console.error("Missing CADENCE_ACTIVATION_SECRET in .env");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  let countStr: string | null = null;
  let outFile: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--out":
        outFile = args[++i] ?? null;
        if (!outFile) {
          console.error("Missing file path after --out");
          process.exit(1);
        }
        break;
      default:
        if (!countStr && /^\d+$/.test(args[i])) {
          countStr = args[i];
        } else {
          console.error(`Unknown argument: ${args[i]}`);
          console.error("Usage: bun run gen:codes [COUNT] [--out <FILE>]");
          process.exit(1);
        }
    }
  }

  const count = countStr
    ? parseInt(countStr, 10)
    : parseInt(env["CADENCE_MAX_CODES"] ?? "0", 10);

  if (isNaN(count) || count <= 0) {
    console.error("COUNT must be a positive integer");
    process.exit(1);
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const codes: string[] = [];

  for (let index = 0; index < count; index++) {
    const indexBytes = toBeBytes(index);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, indexBytes);
    const hashBytes = new Uint8Array(signature, 0, 8);
    const hexStr = Array.from(hashBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(formatCode(hexStr));
  }

  outFile ??= "activation_codes.txt";
  await Bun.write(outFile, codes.join("\n") + "\n");

  console.log(`Saved ${codes.length} codes to ${outFile}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
