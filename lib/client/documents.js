import { LIMITS } from "../limits.js";
/** Load the heavy PDF parser only when a PDF is selected. */
async function loadPdf() {
  const [pdf, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdf.GlobalWorkerOptions.workerSrc = worker.default;
  return pdf;
}
/** Extract locally; always release the worker, including on timeout or bad pages. */
export async function extractDocument(file, loader = loadPdf) {
  if (file.size > LIMITS.fileBytes)
    throw Error("Choose a file smaller than 5 MB.");
  if (!/\.(pdf|txt)$/i.test(file.name))
    throw Error("Choose a PDF or TXT file.");
  if (/\.txt$/i.test(file.name)) {
    const text = await file.text();
    if (text.length > LIMITS.documentCharacters)
      throw Error("Text is too long. Use a smaller section.");
    if (text.trim().length < 30)
      throw Error("The file contains insufficient text.");
    return text;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw Error("This file is not a PDF.");
  const pdf = await loader();
  const task = pdf.getDocument({ data: bytes, isEvalSupported: false });
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const doc = await task.promise;
        if (doc.numPages > LIMITS.pdfPages)
          throw Error("Choose a PDF with 20 pages or fewer.");
        let text = "";
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
          const page = await doc.getPage(pageNumber);
          const content = await page.getTextContent();
          const line = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          if (line.trim().length < 20)
            throw Error(
              `Page ${pageNumber} has insufficient text. Paste readable text instead.`,
            );
          text += `\n[Page ${pageNumber}]\n${line}\n`;
          if (text.length > LIMITS.documentCharacters)
            throw Error("Extracted text is too long. Use a smaller section.");
        }
        return text;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Error("PDF extraction timed out. Try a smaller file.")),
          LIMITS.extractionMilliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    await task.destroy();
  }
}
