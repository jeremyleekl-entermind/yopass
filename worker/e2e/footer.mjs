// Footer links: each must visibly take the visitor somewhere.
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://127.0.0.1:8787";
const browser = await chromium.launch({
  channel: process.env.E2E_CHANNEL ?? "msedge",
  headless: true,
});
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failed++;
};
for (const vp of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const atBottom = async (path) => {
    await page.goto(base + path);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
  };
  const secretInView = () =>
    page.evaluate(() => {
      const b = document.getElementById("secret")?.getBoundingClientRect();
      return !!b && b.top >= 0 && b.bottom <= innerHeight;
    });

  for (const [name, sel] of [
    ["bottom button", "footer a.ep-top"],
    ["column link", 'footer .ep-foot-cols a:has-text("Send a secret")'],
  ]) {
    await atBottom("/");
    await page.click(sel);
    await page.waitForTimeout(1200);
    const focused = await page.evaluate(
      () => document.activeElement?.id === "secret",
    );
    check(
      focused && (await secretInView()),
      `${vp.width}px home: footer ${name} -> secret box in view and focused`,
    );
  }

  await atBottom("/#/generate");
  await page.click("footer a.ep-top");
  await page.waitForTimeout(1200);
  check(
    new URL(page.url()).hash === "#/" && (await secretInView()),
    `${vp.width}px generator: footer "Send a secret" -> encrypt form in view`,
  );

  await atBottom("/");
  await page.click('footer .ep-foot-cols a:has-text("Password generator")');
  await page.waitForTimeout(900);
  const genVisible = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((e) =>
      e.textContent.includes("Password Generator"),
    );
    const b = h?.getBoundingClientRect();
    return !!b && b.top >= 0 && b.top < innerHeight;
  });
  check(
    genVisible,
    `${vp.width}px home: footer "Password generator" -> generator heading in view`,
  );
}
await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall footer links work");
process.exit(failed ? 1 : 0);
