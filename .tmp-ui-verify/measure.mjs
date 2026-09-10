import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem("getreal.auth", "1");
  localStorage.setItem("getreal.role", "superadmin");
  localStorage.setItem("getreal.lastActive", String(Date.now()));
});
await page.goto("http://localhost:3000/inventory", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const result = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Order Received"),
  );
  if (!btn) return { error: "no banner", body: document.body.innerText.slice(0, 200) };
  const label = btn.children[0];
  const divider = btn.children[1];
  const supplier = btn.children[2];
  const r1 = document.createRange();
  r1.selectNodeContents(label);
  const labelRects = [...r1.getClientRects()];
  const lastGlyph = labelRects[labelRects.length - 1];
  const r2 = document.createRange();
  r2.selectNodeContents(supplier);
  const firstGlyph = r2.getClientRects()[0];
  const d = divider.getBoundingClientRect();
  return {
    gapLabelToLine: Math.round(d.left - lastGlyph.right),
    gapLineToSupplier: Math.round(firstGlyph.left - d.right),
    dividerClass: divider.className,
    hasBorderR:
      getComputedStyle(label).borderRightWidth !== "0px" &&
      getComputedStyle(label).borderRightStyle !== "none",
  };
});
console.log("GLYPH_GAPS", JSON.stringify(result, null, 2));

await page.getByRole("button", { name: "All Items" }).click();
await page.waitForTimeout(300);
const gaps = await page.evaluate(() => {
  const lis = [...document.querySelectorAll("ul.ui-select-menu li")];
  const tops = lis.map((li) => li.getBoundingClientRect().top);
  const heights = lis.map((li) => Math.round(li.getBoundingClientRect().height));
  const deltas = tops.slice(1).map((t, i) => Math.round(t - tops[i]));
  const firstBtn = lis[0]?.querySelector("button");
  return {
    heights,
    deltas,
    uniqueDeltas: [...new Set(deltas)],
    firstBg: firstBtn ? getComputedStyle(firstBtn).backgroundColor : null,
    labels: lis.map((li) => (li.textContent || "").trim()),
  };
});
console.log("ROW_GAPS", JSON.stringify(gaps, null, 2));
await browser.close();
