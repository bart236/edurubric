import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docx")) return extractDocxText(buffer);
  if (lower.endsWith(".pdf")) return extractPdfText(buffer);
  throw new Error("Alleen .docx en .pdf worden ondersteund.");
}
