// Mobile/tablet audit of every EnterPass screen: horizontal overflow, elements
// past the viewport edge, small text, small tap targets; full-page screenshots.
// Usage: node mobile.mjs <baseUrl> <outDir>
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const out = process.argv[3] ?? "e2e/.shots/mobile";
const VIEWPORTS = [
  { name: "360", width: 360, height: 740 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
];

const browser = await chromium.launch({
  channel: process.env.E2E_CHANNEL ?? "msedge",
  headless: true,
});
let problems = 0;

async function audit(page, label) {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflowX = document.documentElement.scrollWidth - vw;
    const offenders = [];
    const small = [];
    const taps = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      // ignore things clipped by an overflow:hidden ancestor (the board tiles, the field)
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        if (
          pcs.overflowX === "hidden" ||
          pcs.overflow === "hidden" ||
          pcs.overflowX === "auto" ||
          pcs.overflowX === "scroll"
        ) {
          if (
            p !== document.body &&
            p !== document.documentElement &&
            !p.matches(".min-h-svh")
          ) {
            clipped = true;
            break;
          }
        }
      }
      if (!clipped && (b.right > vw + 1 || b.left < -1)) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join(".")} [${Math.round(b.left)}..${Math.round(b.right)}]`,
        );
      }
      const own = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 2,
      );
      if (own && parseFloat(cs.fontSize) < 13)
        small.push(
          `${el.tagName.toLowerCase()} ${cs.fontSize} "${el.textContent.trim().slice(0, 30)}"`,
        );
      if (
        el.matches(
          "a[href], button, input[type=checkbox], input[type=radio], input[type=range], select",
        ) &&
        (b.height < 24 || b.width < 24)
      ) {
        taps.push(
          `${el.tagName.toLowerCase()} ${Math.round(b.width)}x${Math.round(b.height)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}"`,
        );
      }
    }
    return {
      overflowX,
      offenders: offenders.slice(0, 8),
      small: small.slice(0, 6),
      taps: taps.slice(0, 8),
    };
  });
  const bad = r.overflowX > 0 || r.offenders.length || r.small.length;
  if (bad) problems++;
  console.log(`${bad ? "FAIL" : "ok  "}  ${label}  overflowX=${r.overflowX}`);
  for (const o of r.offenders) console.log("        off-screen:", o);
  for (const s of r.small) console.log("        small text:", s);
  for (const t of r.taps) console.log("        small tap  :", t);
  await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width < 700,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(base + "/");
  await page.locator("#secret").waitFor();
  await audit(page, `${vp.name}-1-home`);

  await page.goto(base + "/#/generate");
  await page.locator('button:has-text("Generate Password")').waitFor();
  await audit(page, `${vp.name}-2-generator`);

  await page.goto(base + "/");
  await page.fill("#secret", `mobile-check-${vp.name}`);
  await page.click('button[type="submit"]');
  await page.locator('h2:has-text("Secret stored securely")').waitFor();
  await audit(page, `${vp.name}-3-created`);
  const link = (await page.locator("code").first().textContent()).trim();

  const r = await ctx.newPage();
  await r.goto(link);
  const reveal = r.locator('button:has-text("Reveal Secure Message")');
  await reveal.waitFor({ timeout: 10000 });
  await audit(r, `${vp.name}-4-before-reveal`);
  await reveal.click();
  await r.waitForFunction(
    (s) => document.body.innerText.includes(s),
    `mobile-check-${vp.name}`,
    { timeout: 15000 },
  );
  await audit(r, `${vp.name}-5-revealed`);

  const g = await ctx.newPage();
  await g.goto(link);
  const reveal2 = g.locator('button:has-text("Reveal Secure Message")');
  if (
    await reveal2
      .waitFor({ timeout: 8000 })
      .then(() => true)
      .catch(() => false)
  )
    await reveal2.click();
  await g
    .locator('h2:has-text("Secret does not exist")')
    .waitFor({ timeout: 10000 });
  await audit(g, `${vp.name}-6-gone`);
  await ctx.close();
}
await browser.close();
console.log(
  problems ? `\n${problems} screen(s) with problems` : "\nall screens clean",
);
