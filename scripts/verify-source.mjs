import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".verify");
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--window-size=1440,900"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

async function clickText(text) {
  await page.evaluate((label) => {
    const match = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === label,
    );
    match?.click();
  }, text);
}

await page.goto("http://localhost:3001/login", { waitUntil: "networkidle0" });
await page.evaluate(() => {
  localStorage.setItem("getreal.auth", "1");
  localStorage.setItem("getreal.role", "superadmin");
});
await page.goto("http://localhost:3001/source", { waitUntil: "networkidle0" });
await page.waitForSelector("h1");
await page.screenshot({ path: join(outDir, "07-source-list.png") });

const viewBox = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")].filter(
    (button) => button.textContent?.trim() === "View",
  );
  const target = buttons[5] ?? buttons[0];
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
});
if (viewBox) {
  await page.mouse.move(viewBox.x, viewBox.y);
  await new Promise((r) => setTimeout(r, 250));
}
await page.screenshot({ path: join(outDir, "08-source-desc.png") });

await clickText("Add Source");
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: join(outDir, "09-source-add.png") });
await clickText("Cancel");
await new Promise((r) => setTimeout(r, 200));

await clickText("Edit");
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: join(outDir, "10-source-edit.png") });

await browser.close();
console.log("ok", outDir);
