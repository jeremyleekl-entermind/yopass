// End-to-end check of Entermind Pass against a running Worker, in real Edge.
// Usage: node flow.mjs <baseUrl> <screenshotDir>
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const shots = process.argv[3] ?? "e2e/.shots/flow";
const SECRET = `entermind-e2e-${Date.now()}`;
const log = (ok, msg) => console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
let failed = 0;
const check = (ok, msg) => {
  log(ok, msg);
  if (!ok) failed++;
};

const browser = await chromium.launch({
  channel: process.env.E2E_CHANNEL ?? "msedge",
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// 1. Home page and branding
await page.goto(base + "/");
await page.locator('textarea[placeholder="Enter your secret..."]').waitFor();
check(
  (await page.title()).includes("EnterPass"),
  `title is "${await page.title()}"`,
);
const brand = (await page.locator('a[href="/"]').first().innerText()).trim();
check(brand === "EnterPass", `navbar brand is "${brand}"`);
check(
  (await page.locator('a[href="/"] img[src="/enterpass.svg"]').count()) === 1,
  "navbar uses enterpass.svg",
);
check(
  (await page.locator('a[href="#/upload"]').count()) === 0,
  "no upload link (uploads disabled)",
);
const primary = await page.evaluate(() =>
  getComputedStyle(
    document.querySelector(".ep-card") ?? document.documentElement,
  )
    .getPropertyValue("--color-primary")
    .trim(),
);
check(
  /1e40ff/i.test(primary) ||
    primary.includes("30 64 255") ||
    primary.includes("30, 64, 255"),
  `brand primary colour is Entermind blue (${primary})`,
);
await page.screenshot({ path: `${shots}/1-home.png` });

// 2. Create a one-time secret
await page.fill('textarea[placeholder="Enter your secret..."]', SECRET);
await page.click('button[type="submit"]');
await page.locator('h2:has-text("Secret stored securely")').waitFor();
const link = (await page.locator("code").first().textContent()).trim();
check(
  /\/#\/s\/[A-Za-z0-9]{22}\//.test(link),
  `one-click link created (${link.replace(/\/[^/]+$/, "/<key>")})`,
);
await page.screenshot({ path: `${shots}/2-created.png` });

// 3. Recipient opens the link and reveals it
const recipient = await ctx.newPage();
await recipient.goto(link);
const reveal = recipient.locator('button:has-text("Reveal Secure Message")');
if (
  await reveal
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false)
)
  await reveal.click();
const shown = await recipient
  .waitForFunction(
    (s) =>
      document.body.innerText.includes(s) ||
      [...document.querySelectorAll("textarea,input,pre,code")].some((e) =>
        (e.value ?? e.textContent ?? "").includes(s),
      ),
    SECRET,
    { timeout: 15000 },
  )
  .then(() => true)
  .catch(() => false);
check(shown, "recipient sees the decrypted secret");
await recipient.screenshot({ path: `${shots}/3-revealed.png` });

// 4. Second open: one-time secret is gone
const again = await ctx.newPage();
await again.goto(link);
const reveal2 = again.locator('button:has-text("Reveal Secure Message")');
if (
  await reveal2
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false)
)
  await reveal2.click();
const gone = await again
  .locator('h2:has-text("Secret does not exist")')
  .waitFor({ timeout: 10000 })
  .then(() => true)
  .catch(() => false);
check(gone, 'second open says "Secret does not exist"');
await again.screenshot({ path: `${shots}/4-gone.png` });

// 5. Password generator
const gen = await ctx.newPage();
await gen.goto(base + "/#/generate");
await gen.locator('button:has-text("Generate Password")').click();
const pw = await gen
  .locator("input[readonly]")
  .first()
  .inputValue()
  .catch(() => "");
check(pw.length >= 12, `password generator produced ${pw.length} characters`);
await gen.screenshot({ path: `${shots}/5-generator.png` });

// 6. Dark theme renders with the brand colour too
await page.emulateMedia({ colorScheme: "dark" });
await page.goto(base + "/");
await page.waitForTimeout(500);
await page.screenshot({ path: `${shots}/6-home-dark.png` });

// Cloudflare Web Analytics, when switched on for the zone, injects a beacon
// that the CSP blocks. That is zone configuration, not an app error: report it.
const beacon = (e) => e.includes("static.cloudflareinsights.com");
if (errors.some(beacon))
  console.log(
    "NOTE  zone-injected Cloudflare Web Analytics beacon blocked by CSP (turn Web Analytics off for this hostname)",
  );
const real = errors.filter((e) => !beacon(e));
check(
  real.length === 0,
  `no page errors${real.length ? ": " + real.slice(0, 3).join(" | ") : ""}`,
);
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
