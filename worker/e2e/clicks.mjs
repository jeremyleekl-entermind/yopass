// Dead-click detector: on each page, click every visible link and button (one
// fresh page load per click, scrolled to it first) and require a visible
// effect: URL change, scroll, focus move, DOM change or a new tab. External
// links (target=_blank) and mailto: are checked for a sane href, not opened.
// Usage: node clicks.mjs <baseUrl>
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const PAGES = ["/", "/#/generate"];
const SKIP = [/^Skip to main content$/]; // sr-only, tested by upstream
const browser = await chromium.launch({
  channel: process.env.E2E_CHANNEL ?? "msedge",
  headless: true,
});
let failed = 0;

for (const vp of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: vp });
    let page = await ctx.newPage();
    await page.goto(base + path);
    await page.waitForTimeout(700);
    const targets = await page.evaluate(() =>
      [...document.querySelectorAll("a[href], button")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return (
            b.width > 2 &&
            b.height > 2 &&
            cs.visibility !== "hidden" &&
            cs.display !== "none"
          );
        })
        .map((el, i) => {
          el.setAttribute("data-click-id", String(i));
          return {
            id: String(i),
            tag: el.tagName.toLowerCase(),
            text: (
              el.textContent ||
              el.getAttribute("aria-label") ||
              el.getAttribute("title") ||
              ""
            )
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 40),
            href: el.getAttribute("href"),
            target: el.getAttribute("target"),
            type: el.getAttribute("type"),
          };
        }),
    );

    for (const t of targets) {
      if (SKIP.some((r) => r.test(t.text))) continue;
      const label = `${vp.width}px ${path} ${t.tag} "${t.text || t.href}"`;
      if (t.target === "_blank" || t.href?.startsWith("mailto:")) {
        const ok = /^(https?:\/\/[^\s]+|mailto:[^@\s]+@[^@\s]+\.[a-z]+)$/i.test(
          t.href || "",
        );
        console.log(
          `${ok ? "ok  " : "FAIL"}  ${label} -> ${t.href} (not opened)`,
        );
        if (!ok) failed++;
        continue;
      }
      // A brand-new page per click: re-visiting a URL that differs only after
      // the # would be a same-document navigation, not a fresh load.
      await page.close();
      page = await ctx.newPage();
      await page.goto(base + path);
      await page.waitForTimeout(600);
      // re-tag in the fresh page (same order)
      await page.evaluate(() => {
        [...document.querySelectorAll("a[href], button")]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return (
              b.width > 2 &&
              b.height > 2 &&
              cs.visibility !== "hidden" &&
              cs.display !== "none"
            );
          })
          .forEach((el, i) => el.setAttribute("data-click-id", String(i)));
      });
      const el = page.locator(`[data-click-id="${t.id}"]`);
      if (!(await el.count())) {
        console.log(`FAIL  ${label} -> not found on reload`);
        failed++;
        continue;
      }
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const before = await page.evaluate(() => ({
        url: location.href,
        y: scrollY,
        focus: document.activeElement?.outerHTML.slice(0, 80),
        dom: document.body.innerHTML.length,
      }));
      const popup = page
        .context()
        .waitForEvent("page", { timeout: 1500 })
        .catch(() => null);
      await el
        .click({ timeout: 3000 })
        .catch((e) =>
          console.log("        click error:", e.message.split("\n")[0]),
        );
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => ({
        url: location.href,
        y: scrollY,
        focus: document.activeElement?.outerHTML.slice(0, 80),
        dom: document.body.innerHTML.length,
      }));
      const opened = await popup;
      const effects = [
        after.url !== before.url && "url",
        Math.abs(after.y - before.y) > 40 && "scroll",
        after.focus !== before.focus && "focus",
        after.dom !== before.dom && "dom",
        opened && "new tab",
      ].filter(Boolean);
      const ok = effects.length > 0;
      if (!ok) failed++;
      console.log(
        `${ok ? "ok  " : "FAIL"}  ${label} -> ${ok ? effects.join("+") : "NO VISIBLE EFFECT"}`,
      );
      if (opened) await opened.close();
    }
    await ctx.close();
  }
}
await browser.close();
console.log(
  failed
    ? `\n${failed} dead or broken click(s)`
    : "\nevery link and button does something",
);
process.exit(failed ? 1 : 0);
