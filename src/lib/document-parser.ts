'use client';

// Parses a resume file into plain text in the browser so the file itself never
// leaves the device. PDF text extraction is best-effort: resumes built with
// unusual layouts (columns, tables, images) may come out jumbled, so the UI
// always lets the user review and edit the result before saving.

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ParseOutcome = { text: string; warning?: string };

function normalise(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parsePdf(file: File): Promise<ParseOutcome> {
  const { PDFParse } = await import('pdf-parse');
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    const text = normalise(result.text ?? '');
    const warning =
      text.length < 80
        ? 'Almost no text found. This PDF is probably image-based or heavily formatted — paste the text manually instead.'
        : 'Check the text below. Multi-column resumes often come out out of order.';
    return { text, warning };
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(file: File): Promise<ParseOutcome> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: normalise(value), warning: 'Check the text below before saving.' };
}

export async function parseResumeFile(file: File): Promise<ParseOutcome> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File is larger than 5 MB. Paste the text instead.');
  }

  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx');

  if (isPdf) return parsePdf(file);
  if (isDocx) return parseDocx(file);

  if (file.type.startsWith('text/')) {
    return { text: normalise(await file.text()), warning: 'Check the text below before saving.' };
  }

  throw new Error('Unsupported file type. Upload a PDF or DOCX, or paste the text.');
}
