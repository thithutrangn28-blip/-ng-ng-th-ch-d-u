const rawText = "A".repeat(100000);
const start = Date.now();
const partRegex = /(?:^|\n)###\s*(.*?)(?=(?:\n###\s*|\n---|\n\*\*\*|$))/gs;
let matches = [...rawText.matchAll(partRegex)];
console.log("Time:", Date.now() - start, "ms");
