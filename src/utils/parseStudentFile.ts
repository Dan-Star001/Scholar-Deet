/**
 * parseStudentFile.ts
 *
 * Parses student name + matric number from various file formats.
 * Uses specialized libraries to prevent "garbage character" issues 
 * caused by reading binary files as plain text.
 *
 * Supported formats:
 *   - Excel (.xlsx, .xls) - uses xlsx
 *   - CSV (.csv)          - uses xlsx or plain text parser
 *   - PDF (.pdf)          - uses pdfjs-dist
 *   - Word (.docx)        - uses mammoth.js
 *   - Plain text (.txt)   - line-by-line parsing
 */

export interface ParsedStudent {
  name: string;
  matricNo: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
function isMatricLikely(val: any): boolean {
  if (!val) return false;
  const s = String(val).trim();
  const matricPattern = /(\b[A-Z]{1,4}[/\\.-]\d{3,10}\b|\b[A-Z0-9]{2,}[/\\.-][A-Z0-9./\\-]{2,30}\b|\b[A-Z0-9.\-]{4,20}\d[A-Z0-9.\-]*\b|\b\d{5,15}\b|\b[A-Z]{1,3}[-]?\d{4,12}\b|\b[A-Z]{2,4}\d{4,}\b)/i;
  return matricPattern.test(s);
}

// ─── Excel / CSV ────────────────────────────────────────────────────
async function parseExcelOrCsv(file: File): Promise<ParsedStudent[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    
    // Explicit header match
    const nameKey = keys.find((k) => /^name$/i.test(k.trim())) ||
                    keys.find((k) => /student.*name|full.*name/i.test(k)) ||
                    keys.find((k) => /name/i.test(k));
    
    let matricKey = keys.find((k) => /matric|mat\.?\s*no|student.*id|reg\.?\s*no|reg|registration|sn|s\/n|serial|no\b|id.*no|roll/i.test(k));

    // Heuristic fallback: scan column content
    if (!matricKey) {
      let bestKey = "";
      let bestScore = 0;
      for (const key of keys) {
        if (key === nameKey) continue;
        let score = 0;
        const sampleSize = Math.min(rows.length, 10);
        for (let i = 0; i < sampleSize; i++) {
          if (isMatricLikely(rows[i][key])) score += 2;
          else if (/^\d{5,12}$/.test(String(rows[i][key]))) score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }
      if (bestScore >= 2) matricKey = bestKey;
    }

    if (nameKey) {
      return rows
        .map((row) => ({
          name: String(row[nameKey] ?? "").trim(),
          matricNo: matricKey ? String(row[matricKey] ?? "").trim() : "",
        }))
        .filter((s) => s.name.length > 1);
    }
  }

  const raw = XLSX.utils.sheet_to_csv(sheet);
  return extractStudentsFromText(raw);
}

// ─── PDF ─────────────────────────────────────────────────────────────
async function parsePdf(file: File): Promise<ParsedStudent[]> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    const lib = (pdfjsLib as any).default || pdfjsLib;
    
    // Use unpkg as a fallback for the worker if the version-specific cdnjs fails
    const version = lib.version || "5.6.205";
    lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = lib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        const linesMap: Record<number, any[]> = {};
        for (const item of items) {
          if (!item.str || item.transform === undefined) continue;
          const y = Math.round(item.transform[5]);
          let foundY = Object.keys(linesMap).map(Number).find(key => Math.abs(key - y) < 4);
          if (foundY === undefined) {
            foundY = y;
            linesMap[foundY] = [];
          }
          linesMap[foundY].push(item);
        }
        
        const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
        for (const y of sortedY) {
          const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
          // Using single space to preserve words, extractStudentsFromText handles the rest
          fullText += lineItems.map(it => it.str).join(" ") + "\n";
        }
    }
    
    return extractStudentsFromText(fullText);
  } catch (err) {
    console.error("PDF parsing error:", err);
    return [];
  }
}

// ─── Word (.docx) ──────────────────────────────────────────────────
async function parseDocx(file: File): Promise<ParsedStudent[]> {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return extractStudentsFromText(result.value);
  } catch (err) {
    console.error("Docx parsing error:", err);
    return [];
  }
}

// ─── Plain Text ─────────────────────────────────────────────────────
async function parseTextFile(file: File): Promise<ParsedStudent[]> {
  const text = await file.text();
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 100))) {
    return [];
  }
  return extractStudentsFromText(text);
}

// ─── Extraction Logic ───────────────────────────────────────────────
export function extractStudentsFromText(text: string): ParsedStudent[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedStudent[] = [];
  const seenNames = new Set<string>();
  const seenMatrics = new Set<string>();
  
  // More inclusive matric pattern: 
  // 1. Triple-part IDs like 2021 / CSC / 001
  // 2. Double-part IDs like 2021 / 12345
  // 3. IDs with letters and digits like VUG-12345 or CSC12345 (min 5 digits if no delimiter)
  // 4. Pure numeric IDs (4-15 digits)
  const matricPattern = /(\b[A-Z0-9]{2,}\s?[/\\.-]\s?[A-Z0-9]{2,}\s?[/\\.-]\s?[A-Z0-9]{1,10}\b|\b[A-Z]{1,4}\s?[/\\.-]\s?\d{3,10}\b|\b[A-Z0-9]{2,}\s?[/\\.-]\s?[A-Z0-9./\\-]{2,30}\b|\b[A-Z0-9.\-]{4,20}\d[A-Z0-9.\-]*\b|\b\d{4,15}\b|\b[A-Z]{2,4}\d{5,}\b)/i;

  let pendingName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^(s\.?\s*n\.?o?\.?|serial|#|name|student|matric|id|reg|attendance|list|roster|page|total|department|faculty|course|level|session|date)/i.test(line)) {
      continue;
    }

    const parts = line.split(/\t|,\s*|\s{2,}/).map((p) => p.trim()).filter(p => p.length > 0);

    if (parts.length >= 2) {
      let nameCandidate = "";
      let matricCandidate = "";

      const m0 = parts[0].match(matricPattern);
      const m1 = parts[1].match(matricPattern);

      if (m1 && !m0) {
        nameCandidate = parts[0];
        matricCandidate = m1[0];
      } else if (m0 && !m1) {
        nameCandidate = parts[1];
        matricCandidate = m0[0];
      } else if (m0 && m1) {
        nameCandidate = parts[0];
        matricCandidate = parts[1];
      } else {
        nameCandidate = parts[0];
        matricCandidate = parts[1].length >= 4 ? parts[1] : "";
      }

      if (nameCandidate && nameCandidate.length > 1) {
        const cleanName = cleanupName(nameCandidate);
        if (cleanName && !seenNames.has(cleanName.toLowerCase())) {
          seenNames.add(cleanName.toLowerCase());
          results.push({ name: toTitleCase(cleanName), matricNo: matricCandidate });
          pendingName = "";
          continue;
        }
      }
    }

    const matricMatch = line.match(matricPattern);

    if (matricMatch) {
      const matricNo = matricMatch[0].trim();
      // Use word boundaries to remove matricNo so we don't eat parts of the name if the ID is purely numeric
      const escapedMatric = matricNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePart = line.replace(new RegExp(escapedMatric, 'i'), "").trim();
      
      let name = "";
      if (namePart.length > 2) {
        name = cleanupName(namePart);
      } else if (pendingName) {
        name = pendingName;
        pendingName = "";
      }

      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        results.push({ name: toTitleCase(name), matricNo });
        continue;
      } else if (!name && matricNo && !seenMatrics.has(matricNo.toLowerCase())) {
        results.push({ name: "Unknown Student", matricNo });
        seenMatrics.add(matricNo.toLowerCase());
        continue;
      }
    } else {
      const cleanLine = cleanupName(line);
      const wordCount = cleanLine.split(/\s+/).length;
      if (wordCount >= 2 && wordCount <= 6 && /^[A-Za-zÀ-ÿ\s'.&-]+$/.test(cleanLine)) {
        pendingName = cleanLine;
      }
    }
  }

  return results;
}

function cleanupName(name: string): string {
  return name
    .replace(/^[\d+.)\-\s|]+/, "")
    .replace(/[-–|,\s]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Entry Point ────────────────────────────────────────────────────
export async function parseStudentFile(file: File): Promise<ParsedStudent[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["xlsx", "xls"].includes(ext)) {
    return parseExcelOrCsv(file);
  }

  if (ext === "csv") {
    return parseExcelOrCsv(file);
  }

  if (ext === "pdf") {
    return parsePdf(file);
  }

  if (ext === "docx") {
    return parseDocx(file);
  }

  return parseTextFile(file);
}
