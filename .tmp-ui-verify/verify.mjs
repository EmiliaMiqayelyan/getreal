import { chromium } from "playwright";
import fs from "fs";

const outDir = "C:/Users/Dev/Desktop/real/getreal/.tmp-ui-verify";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.locator('input[name="username"], input[type="text"]').first().fill("admin");
await page.locator('input[type="password"]').fill("getreal");
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(1200);
await page.goto("http://localhost:3000/inventory", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const banner = page.locator("button").filter({ hasText: "Order Received" }).first();
await banner.waitFor({ state: "visible" });

// Close-up of left segment around divider
const box = await banner.boundingBox();
if (box) {
  await page.screenshot({
    path: `${outDir}/divider-closeup.png`,
    clip: { x: box.x, y: box.y, width: Math.min(420, box.width), height: box.height },
  });
}
await page.screenshot({ path: `${outDir}/inventory-full.png`, fullPage: false });

const metrics = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Order Received"),
  );
  if (!btn) return { error: "no banner" };
  const kids = [...btn.children];
  const label = kids[0].getBoundingClientRect();
  const divider = kids[1].getBoundingClientRect();
  const supplier = kids[2].getBoundingClientRect();
  return {
    dividerClass: kids[1].className,
    labelClass: kids[0].className,
    padLeft: Math.round(divider.left - label.right),
    padRight: Math.round(supplier.left - divider.right),
    dividerW: Math.round(divider.width),
    dividerH: Math.round(divider.height),
    hasBorderR:
      getComputedStyle(kids[0]).borderRightWidth !== "0px" &&
      getComputedStyle(kids[0]).borderRightStyle !== "none",
  };
});
console.log("BANNER", JSON.stringify(metrics, null, 2));

await page.getByRole("button", { name: "All Items" }).click();
await page.waitForTimeout(400);

const list = page.locator('ul[role="listbox"].ui-select-menu');
await list.waitFor({ state: "visible" });
const listBox = await list.boundingBox();
if (listBox) {
  await page.screenshot({
    path: `${outDir}/dropdown-closeup.png`,
    clip: {
      x: Math.max(0, listBox.x - 8),
      y: Math.max(0, listBox.y - 48),
      width: listBox.width + 16,
      height: Math.min(360, listBox.height + 56),
    },
  });
}

const drop = await page.evaluate(() => {
  const menu = document.querySelector('ul[role="listbox"].ui-select-menu');
  const lis = [...menu.querySelectorAll("li")];
  const rows = lis.map((li) => {
    const btn = li.querySelector("button");
    const cs = getComputedStyle(btn);
    return {
      label: (li.textContent || "").trim(),
      h: Math.round(li.getBoundingClientRect().height),
      bg: cs.backgroundColor,
      whiteSpace: cs.whiteSpace,
      overflow: cs.overflow,
    };
  });
  return {
    width: Math.round(menu.getBoundingClientRect().width),
    uniqueH: [...new Set(rows.map((r) => r.h))],
    rows,
    scrollbarWidth: getComputedStyle(menu).scrollbarWidth,
  };
});
console.log("DROPDOWN", JSON.stringify(drop, null, 2));
await browser.close();
