const fs = require("fs");
const path =
  "C:\\Users\\ASUS\\.cursor\\projects\\c-Users-ASUS-Desktop-getreal\\agent-transcripts\\4780037d-a827-489b-9043-641a6300cf7b\\4780037d-a827-489b-9043-641a6300cf7b.jsonl";
const lines = fs.readFileSync(path, "utf8").split(/\n/);
for (const n of [2, 13, 24, 48, 52]) {
  const line = lines[n - 1];
  if (!line) continue;
  const obj = JSON.parse(line);
  const text = obj.message?.content
    ?.map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  console.log("\n\n======== LINE", n, "len", text?.length, "========\n");
  console.log((text || "").slice(0, 6000));
}
