const fs = require("fs");
const s = fs.readFileSync(process.env.TEMP + "\\figma-pricing.js", "utf8");
const i = s.indexOf("2 oz");
console.log(s.slice(i - 200, i + 500));
console.log("\n\n===== LBS BLOCK =====\n");
const j = s.indexOf("Total case weight");
console.log(s.slice(j - 1500, j + 2500));
