import { FileItem } from "./prompt-context-db";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";

const textExt = ["txt", "md", "markdown", "json", "csv", "tsv", "html", "htm", "xml", "yaml", "yml", "log", "js", "ts", "tsx", "jsx", "css", "scss"];
const spreadsheetExt = ["xlsx", "xls", "csv", "tsv"];
const docxExt = ["docx"];
const pdfExt = ["pdf"];
const epubExt = ["epub"];
const pptxExt = ["pptx"];
const imageExt = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

async function extractPdfTextFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const raw = decoder.decode(bytes);
  const matches = raw.match(/\(([^()]+)\)\s*T[jJ]/g) || [];
  if (matches.length > 0) {
    return matches.map(m => m.replace(/^\(/, "").replace(/\)\s*T[jJ]$/, "").replace(/\\n/g, "\n").replace(/\\r/g, "")).join(" ");
  }
  const cleanLines = raw.split(/\r?\n/).filter(line => /^[a-zA-Z0-9\s,.\-?'"!:;À-ỹ]{15,}$/.test(line));
  return cleanLines.join("\n");
}

async function parsePdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
    } catch (e) {}
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || "").join(" ");
      if (pageText.trim()) {
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
    }
    if (fullText.trim().length > 0) return fullText.trim();
  } catch (err) {
    console.warn("pdfjs-dist error, using fallback PDF text extraction:", err);
  }
  return await extractPdfTextFallback(await file.arrayBuffer());
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || "").trim();
}

async function parseSpreadsheet(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  let text = "";
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    if (csv && csv.trim().length > 0) {
      text += `--- Sheet: ${sheetName} ---\n${csv.trim()}\n\n`;
    }
  });
  return text.trim();
}

async function parseEpub(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  let text = "";
  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir && (filename.endsWith(".html") || filename.endsWith(".xhtml") || filename.endsWith(".xml") || filename.endsWith(".txt") || filename.endsWith(".md"))) {
      const rawContent = await zipEntry.async("string");
      const cleanText = rawContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanText.length > 30 && !filename.includes("toc.") && !filename.includes("content.opf")) {
        text += `--- Section: ${filename.split("/").pop()} ---\n${cleanText}\n\n`;
      }
    }
  }
  return text.trim();
}

async function parsePptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  let text = "";
  const slideKeys = Object.keys(zip.files).filter(f => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "") || "0");
    const numB = parseInt(b.replace(/\D/g, "") || "0");
    return numA - numB;
  });
  for (const filename of slideKeys) {
    const zipEntry = zip.files[filename];
    if (zipEntry && !zipEntry.dir) {
      const xmlContent = await zipEntry.async("string");
      const matches = Array.from(xmlContent.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)).map(m => m[1]);
      if (matches.length > 0) {
        text += `--- Slide ${filename.replace("ppt/slides/", "").replace(".xml", "")} ---\n${matches.join(" ")}\n\n`;
      }
    }
  }
  return text.trim();
}

function extractFactsAndSummary(content: string, fileName: string): {
  summary: string;
  extractedSummary: string;
  importantFacts: {
    logline?: string[];
    characters?: string[];
    relationships?: string[];
    setting?: string[];
    timeline?: string[];
    canon?: string[];
    canonFacts?: string[];
    memory?: string[];
    worldbuilding?: string[];
    writingRules?: string[];
    specialRules?: string[];
    voiceDNA?: string[];
    promptRequirements?: string[];
    promptInstructions?: string[];
  };
} {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const firstFewLines = lines.slice(0, 10).join(". ");
  const summaryText = content.length > 500 ? `${content.slice(0, 500)}... [Tổng dung lượng: ${content.length} ký tự]` : content;
  
  const logline: string[] = [];
  const characters: string[] = [];
  const relationships: string[] = [];
  const setting: string[] = [];
  const timeline: string[] = [];
  const canonFacts: string[] = [];
  const memory: string[] = [];
  const worldbuilding: string[] = [];
  const specialRules: string[] = [];
  const voiceDNA: string[] = [];
  const promptInstructions: string[] = [];

  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes("logline") || lower.includes("tóm tắt truyện") || lower.includes("ý tưởng chính") || lower.includes("câu chuyện về")) {
      if (logline.length < 5) logline.push(line.slice(0, 150));
    }
    if (lower.includes("nhân vật") || lower.includes("character") || lower.includes("tên:") || lower.includes("name:") || lower.includes("nam chính") || lower.includes("nữ chính")) {
      if (characters.length < 5) characters.push(line.slice(0, 150));
    }
    if (lower.includes("quan hệ") || lower.includes("relationship") || lower.includes("bạn") || lower.includes("thù") || lower.includes("yêu") || lower.includes("gia đình") || lower.includes("vợ") || lower.includes("chồng")) {
      if (relationships.length < 5) relationships.push(line.slice(0, 150));
    }
    if (lower.includes("bối cảnh") || lower.includes("thế giới") || lower.includes("world") || lower.includes("setting") || lower.includes("nơi ") || lower.includes("tại ") || lower.includes("thành phố") || lower.includes("quốc gia")) {
      if (setting.length < 5) setting.push(line.slice(0, 150));
    }
    if (lower.includes("năm ") || lower.includes("thời gian") || lower.includes("timeline") || lower.includes("mốc") || lower.includes("ngày") || lower.includes("khi ") || lower.includes("thời kỳ")) {
      if (timeline.length < 5) timeline.push(line.slice(0, 150));
    }
    if (lower.includes("sự thật") || lower.includes("canon") || lower.includes("bất biến") || lower.includes("lịch sử") || lower.includes("cốt truyện") || lower.includes("bí mật")) {
      if (canonFacts.length < 5) canonFacts.push(line.slice(0, 150));
    }
    if (lower.includes("ký ức") || lower.includes("memory") || lower.includes("nhớ") || lower.includes("kỷ niệm") || lower.includes("quá khứ")) {
      if (memory.length < 5) memory.push(line.slice(0, 150));
    }
    if (lower.includes("worldbuilding") || lower.includes("hệ thống") || lower.includes("ma pháp") || lower.includes("công nghệ") || lower.includes("tổ chức") || lower.includes("quy luật thế giới")) {
      if (worldbuilding.length < 5) worldbuilding.push(line.slice(0, 150));
    }
    if (lower.includes("quy tắc") || lower.includes("rule") || lower.includes("cấm") || lower.includes("must") || lower.includes("bắt buộc") || lower.includes("luật") || lower.includes("writing")) {
      if (specialRules.length < 5) specialRules.push(line.slice(0, 150));
    }
    if (lower.includes("giọng") || lower.includes("lời thoại") || lower.includes("xưng hô") || lower.includes("voice") || lower.includes("nói:")) {
      if (voiceDNA.length < 5) voiceDNA.push(line.slice(0, 150));
    }
    if (lower.includes("prompt") || lower.includes("chỉ dẫn") || lower.includes("hướng dẫn") || lower.includes("instruction") || lower.includes("lệnh") || lower.includes("requirement")) {
      if (promptInstructions.length < 5) promptInstructions.push(line.slice(0, 150));
    }
  });

  if (logline.length === 0 && firstFewLines) logline.push(firstFewLines.slice(0, 150));

  return {
    summary: `Tóm tắt file "${fileName}" (${content.length} ký tự): ${firstFewLines.slice(0, 300)}...`,
    extractedSummary: summaryText,
    importantFacts: {
      logline: logline.length ? logline : ["[Chưa phát hiện logline]"],
      characters: characters.length ? characters : ["[Chưa phát hiện từ khóa nhân vật rõ ràng]"],
      relationships: relationships.length ? relationships : ["[Chưa phát hiện từ khóa quan hệ rõ ràng]"],
      setting: setting.length ? setting : ["[Chưa phát hiện mô tả không gian rõ ràng]"],
      timeline: timeline.length ? timeline : ["[Chưa phát hiện mốc thời gian rõ ràng]"],
      canon: canonFacts.length ? canonFacts : ["[Chưa phát hiện canon cốt lõi]"],
      canonFacts: canonFacts.length ? canonFacts : ["[Chưa phát hiện canon cốt lõi]"],
      memory: memory.length ? memory : ["[Chưa phát hiện ký ức]"],
      worldbuilding: worldbuilding.length ? worldbuilding : ["[Chưa phát hiện chi tiết worldbuilding]"],
      writingRules: specialRules.length ? specialRules : ["[Chưa phát hiện quy tắc viết]"],
      specialRules: specialRules.length ? specialRules : ["[Chưa phát hiện luật lệ đặc thù]"],
      voiceDNA: voiceDNA.length ? voiceDNA : ["[Chưa phát hiện mô tả giọng thoại]"],
      promptRequirements: promptInstructions.length ? promptInstructions : ["[Chưa phát hiện yêu cầu prompt]"],
      promptInstructions: promptInstructions.length ? promptInstructions : ["[Chưa phát hiện chỉ dẫn prompt đặc thù]"],
    }
  };
}

function splitTextIntoChunks(text: string, chunkSize: number = 4000): string[] {
  if (!text || !text.trim()) return [];
  const paragraphs = text.split(/\r?\n\r?\n/);
  const chunks: string[] = [];
  let currentChunk = "";
  for (const p of paragraphs) {
    if ((currentChunk + "\n\n" + p).length > chunkSize && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + p : p;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

export async function processImportedFiles(files: FileList | File[], storyId?: string): Promise<FileItem[]> {
  const result: FileItem[] = [];
  for (const file of Array.from(files)) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    let content = "";
    let parserStatus: "selected" | "reading" | "parsed" | "summarized" | "parser-needed" | "failed" | "empty" = "reading";
    let status = "reading";

    try {
      if (textExt.includes(ext)) {
        content = await file.text();
      } else if (docxExt.includes(ext)) {
        content = await parseDocx(file);
      } else if (spreadsheetExt.includes(ext)) {
        content = await parseSpreadsheet(file);
      } else if (pdfExt.includes(ext)) {
        content = await parsePdf(file);
      } else if (epubExt.includes(ext)) {
        content = await parseEpub(file);
      } else if (pptxExt.includes(ext)) {
        content = await parsePptx(file);
      } else if (imageExt.includes(ext)) {
        parserStatus = "parser-needed";
        status = "parser-needed";
        content = "";
      } else {
        try {
          const tryText = await file.text();
          if (tryText && tryText.length > 0 && !/\v/.test(tryText.slice(0, 100))) {
            content = tryText;
          } else {
            parserStatus = "parser-needed";
            status = "parser-needed";
          }
        } catch {
          parserStatus = "parser-needed";
          status = "parser-needed";
        }
      }

      if (parserStatus !== "parser-needed") {
        if (!content || !content.trim()) {
          parserStatus = "empty";
          status = "empty";
          content = "";
        } else {
          parserStatus = "parsed";
          status = "parsed";
        }
      }
    } catch (e) {
      console.error(`Error parsing file ${file.name}:`, e);
      parserStatus = "failed";
      status = "failed";
      content = "";
    }

    const relPath = (file as any).webkitRelativePath || file.name;
    const meta = extractFactsAndSummary(content, file.name);
    const charCount = content.length;
    const estTokens = Math.round(charCount / 3.8);
    const chunks = splitTextIntoChunks(content, 4000);

    result.push({
      name: relPath,
      size: file.size,
      ext,
      status,
      content,
      storyId,
      source: "local_device",
      fileName: file.name,
      relativePath: relPath,
      fileType: file.type || ext,
      fileSize: file.size,
      lastModified: file.lastModified || Date.now(),
      parserStatus,
      parsedText: content,
      summary: content ? `${content.slice(0, 300)}...` : undefined,
      extractedSummary: meta.extractedSummary,
      importantFacts: meta.importantFacts,
      characterCount: charCount,
      estimatedTokens: estTokens,
      chunks,
      importedAt: Date.now()
    });
  }
  return result;
}

export function reparseFileItem(fileItem: FileItem): FileItem {
  const content = fileItem.content || fileItem.parsedText || "";
  if (!content.trim()) {
    return {
      ...fileItem,
      status: "empty",
      parserStatus: "empty",
      parsedText: "",
      characterCount: 0,
      estimatedTokens: 0,
      chunks: []
    };
  }
  const meta = extractFactsAndSummary(content, fileItem.name);
  const status = "parsed";
  const chunks = splitTextIntoChunks(content, 4000);
  return {
    ...fileItem,
    status,
    parserStatus: status,
    content,
    parsedText: content,
    summary: meta.summary,
    extractedSummary: meta.extractedSummary,
    importantFacts: meta.importantFacts,
    characterCount: content.length,
    estimatedTokens: Math.round(content.length / 3.8),
    chunks
  };
}

export function summarizeFileItem(fileItem: FileItem): FileItem {
  const content = fileItem.content || fileItem.parsedText || "";
  if (!content.trim()) return fileItem;
  const meta = extractFactsAndSummary(content, fileItem.name);
  return {
    ...fileItem,
    status: "summarized",
    parserStatus: "summarized",
    summary: meta.summary,
    extractedSummary: meta.extractedSummary,
    importantFacts: meta.importantFacts
  };
}

export function formatImportedFileForContext(f: any, index: number = 1): string {
  const status = f.parserStatus || f.status || "file chưa được parse";
  const name = f.name || f.fileName || "Unnamed File";
  const facts = f.importantFacts || {};

  let rawText = f.parsedText || f.content || "";
  if (!rawText.trim()) {
    return `### File ${index}
File name:
${name}

Parser status:
file chưa được parse (File đã chọn nhưng chưa đọc được nội dung)

Parsed text:
[File chưa được parse — Nội dung trống. CẤM AI tự ý suy diễn cốt truyện, bối cảnh, nhân vật từ tên file ${name}.]

Extracted facts:
- nhân vật: không có
- quan hệ: không có
- timeline: không có
- canon: không có
- bối cảnh: không có
- mục tiêu truyện: không có
- chi tiết quan trọng: không có

Relevant chunks:
[không có đoạn nội dung nào]`;
  }

  const chunksList = (f.chunks && f.chunks.length > 0)
    ? f.chunks.slice(0, 5).map((c: string, idx: number) => `--- Đoạn ${idx + 1} ---\n${c}`).join("\n\n")
    : `--- Đoạn 1 ---\n${rawText.slice(0, 4000)}`;

  const factsFormatted = [
    `- nhân vật: ${(facts.characters || []).join(" | ") || "không có"}`,
    `- quan hệ: ${(facts.relationships || []).join(" | ") || "không có"}`,
    `- timeline: ${(facts.timeline || []).join(" | ") || "không có"}`,
    `- canon: ${(facts.canon || facts.canonFacts || []).join(" | ") || "không có"}`,
    `- bối cảnh: ${(facts.setting || []).join(" | ") || "không có"}`,
    `- mục tiêu truyện: ${(facts.logline || []).join(" | ") || "không có"}`,
    `- chi tiết quan trọng: ${(facts.worldbuilding || facts.memory || []).join(" | ") || "không có"}`
  ].join("\n");

  return `### File ${index}
File name:
${name}

Parser status:
${status}

Parsed text:
${rawText}

Extracted facts:
${factsFormatted}

Relevant chunks:
${chunksList}`;
}


