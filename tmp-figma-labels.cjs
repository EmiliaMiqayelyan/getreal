const fs = require("fs");
const s = fs.readFileSync(process.env.TEMP + "\\figma-pricing.js", "utf8");
const start = s.lastIndexOf("function re()");
const chunk = s.slice(start, start + 20000);
const labels = [...chunk.matchAll(/label:`([^`]+)`/g)].map((m) => m[1]);
console.log(labels.join("\n"));
console.log("\n--- headings ---");
const heads = [...chunk.matchAll(/>([^<]{8,80})</g)].map((m) => m[1]);
console.log(heads.slice(0, 40).join("\n"));
