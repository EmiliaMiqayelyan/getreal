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

async function clickVisible(text) {
  const clicked = await page.evaluate((label) => {
    const buttons = [...document.querySelectorAll("button")];
    const match = buttons.find((button) => {
      const rect = button.getBoundingClientRect();
      return (
        button.textContent?.trim() === label &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
    if (!match) return false;
    match.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`Visible button not found: ${text}`);
}

await page.goto("http://localhost:3001/login", { waitUntil: "networkidle0" });
await page.evaluate(() => {
  localStorage.setItem("getreal.auth", "1");
  localStorage.setItem("getreal.role", "superadmin");
});
await page.goto("http://localhost:3001/distributors", {
  waitUntil: "networkidle0",
});
await page.waitForSelector("h1");

await page.screenshot({ path: join(outDir, "01-list.png") });

await clickVisible("View");
await new Promise((r) => setTimeout(r, 250));
await page.screenshot({ path: join(outDir, "02-notes.png") });
await page.mouse.move(0, 0);

await clickVisible("Files");
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: join(outDir, "03-files.png") });
await page.mouse.click(20, 20);

await clickVisible("Create Distributor");
await page.waitForFunction(() =>
  [...document.querySelectorAll("h2")].some(
    (node) => node.textContent === "Create Distributor",
  ),
);
await page.screenshot({ path: join(outDir, "04-add-empty.png") });

await page.click('button[aria-label="Add contact"]');
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: join(outDir, "04b-add-contact.png") });
await clickVisible("Cancel");
await page.waitForFunction(
  () =>
    ![...document.querySelectorAll("h2")].some(
      (node) => node.textContent === "Create Distributor",
    ),
);

await clickVisible("Edit");
await page.waitForFunction(() =>
  [...document.querySelectorAll("h2")].some(
    (node) => node.textContent === "Edit Distributor",
  ),
);
await page.screenshot({ path: join(outDir, "05-edit.png") });
await page.evaluate(() => {
  document.querySelector('[role="dialog"]')?.scrollTo(0, 800);
});
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: join(outDir, "05b-edit-bottom.png") });

await browser.close();
console.log("ok", outDir);
