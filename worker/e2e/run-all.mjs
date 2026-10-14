// Runs every browser check against one URL and stops on the first failure.
// Usage: npm run e2e -- https://pass.entermind.my   (default http://127.0.0.1:8787)
// Needs Microsoft Edge installed, or set E2E_CHANNEL=chrome.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = process.argv[2] ?? "http://127.0.0.1:8787";
const checks = [
  [
    "flow.mjs",
    "create, reveal once, gone, generator, branding, no page errors",
  ],
  [
    "mobile.mjs",
    "every screen at 360/390/768: overflow, off-screen, small text",
  ],
  ["footer.mjs", "footer links take you somewhere visible"],
  ["clicks.mjs", "every link and button has a visible effect"],
];
for (const [file, what] of checks) {
  console.log(`\n=== ${file}: ${what}`);
  const r = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(file, import.meta.url)), url],
    { stdio: "inherit" },
  );
  if (r.status !== 0) {
    console.error(`\n${file} failed against ${url}`);
    process.exit(1);
  }
}
console.log(`\nAll browser checks passed against ${url}`);
