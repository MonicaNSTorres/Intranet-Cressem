import fs from "fs";
import path from "path";
import { PDFDocument, degrees } from "pdf-lib";

export async function aplicarMarcaDaguaPdf(
  pdfBuffer: Buffer | Uint8Array
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const imagePath = path.join(__dirname, "../assets/marca-dagua.png");
  const imageBytes = fs.readFileSync(imagePath);

  const image = await pdfDoc.embedPng(imageBytes);

  const angle = -45;      // rotacao
  const xPct = 0.5;       // centro horizontal
  const yPct = 0.6;       // centro vertical
  const scale = 1.0;      // tamanho relativo
  const opacity = 0.15;   // transparencia

  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const imgWidth = image.width;
    const imgHeight = image.height;

    const maxW = pageWidth * scale;
    const maxH = pageHeight * scale;

    const factor = Math.min(maxW / imgWidth, maxH / imgHeight);

    const drawW = imgWidth * factor;
    const drawH = imgHeight * factor;

    const xCenter = pageWidth * xPct;
    const yCenter = pageHeight * yPct;

    const x = xCenter - drawW / 2;
    const y = yCenter - drawH / 2;

    page.drawImage(image, {
      x,
      y,
      width: drawW,
      height: drawH,
      rotate: degrees(angle),
      opacity,
    });
  }

  return await pdfDoc.save();
}