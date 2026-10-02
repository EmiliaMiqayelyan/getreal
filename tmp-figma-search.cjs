const fs = require("fs");
const s = fs.readFileSync(process.env.TEMP + "\\figma-pricing.js", "utf8");
const keys = [
  "Single Item",
  "single item",
  "Pieces per case",
  "Units / case",
  "Lbs / case",
  "Weight Per Piece",
  "Piece weight",
  "1 steak",
  "Dozen",
  "Each",
  "Cost per piece",
];
for (const k of keys) {
  let i = 0;
  let n = 0;
  while ((i = s.indexOf(k, i)) !== -1 && n < 2) {
    console.log("\n--- " + k + " @ " + i + " ---");
    console.log(s.slice(Math.max(0, i - 120), i + 220));
    i += k.length;
    n++;
  }
  if (n === 0) console.log("\nMISSING " + k);
}
