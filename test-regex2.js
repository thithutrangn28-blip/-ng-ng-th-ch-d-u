const rawText = "PART 1: " + "A".repeat(100000);
const start = Date.now();
const altRegex = /(?:^|\n)(?:\*\*|\#\#)?\s*(?:PART|PHẦN|Phần)\s*(\d+[^:\n]*?:?)(.*?)(?=(?:\n(?:\*\*|\#\#)?\s*(?:PART|PHẦN|Phần)\s*\d+|\n---|$))/gsi;
let altMatches = [...rawText.matchAll(altRegex)];
console.log("Time:", Date.now() - start, "ms");
