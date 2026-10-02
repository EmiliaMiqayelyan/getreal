const fs = require("fs");
const s = fs.readFileSync(process.env.TEMP + "\\figma-pricing.js", "utf8");
const start = s.indexOf("Sourced per Case");
console.log("start", start);
console.log(s.slice(start, start + 12000));
