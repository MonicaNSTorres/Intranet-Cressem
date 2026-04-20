import jsPDF from "jspdf";
import type { ReciboFinanceiroResponse } from "@/services/consulta_recibo_financeiro.service";

export async function gerarPdfReciboFinanceiro(recibo: ReciboFinanceiroResponse) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 38;
  const contentW = pageW - margin * 2;
  let y = 32;

  const colors = {
    border: 215,
    soft: 245,
    title: [15, 23, 42] as [number, number, number],
    text: [31, 41, 55] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
  };

  const bottomLimit = () => pageH - margin;

  const ensureSpace = (needed = 20) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");

  const fmtDate = (value?: string | null) => {
    if (!value) return "";
    const raw = String(value).slice(0, 10);
    const [yy, mm, dd] = raw.split("-");
    if (!yy || !mm || !dd) return String(value);
    return `${dd}/${mm}/${yy}`;
  };

  const fmtMoney = (n: number) =>
    Number(n || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const formatCpfCnpj = (value?: string | null) => {
    const digits = onlyDigits(String(value || ""));

    if (!digits) return "";

    if (digits.length <= 11) {
      return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2")
        .slice(0, 14);
    }

    return digits
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const sanitize = (s: string) => s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");

  const text = (
    value: string,
    x: number,
    top: number,
    opts?: {
      bold?: boolean;
      size?: number;
      color?: [number, number, number];
      align?: "left" | "center" | "right";
    }
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size || 10);
    const c = opts?.color || colors.text;
    doc.setTextColor(c[0], c[1], c[2]);

    if (opts?.align) {
      doc.text(value, x, top, { align: opts.align });
    } else {
      doc.text(value, x, top);
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(28);
    doc.setFillColor(colors.soft, colors.soft, colors.soft);
    doc.roundedRect(margin, y, contentW, 28, 9, 9, "F");
    text(title, margin + 14, y + 19, { bold: true, size: 12, color: colors.title });
    y += 42;
  };

  const drawInfoCell = (
    x: number,
    top: number,
    width: number,
    label: string,
    value: string,
    minHeight = 54
  ) => {
    const valueLines = doc.splitTextToSize(value || "", width - 16);
    const lineHeight = 13;
    const valueHeight = Math.max(valueLines.length * lineHeight, 14);
    const cellHeight = Math.max(minHeight, 28 + valueHeight);

    doc.setDrawColor(colors.border, colors.border, colors.border);
    doc.roundedRect(x, top, width, cellHeight, 6, 6);

    text(label, x + 8, top + 16, { bold: true, size: 9, color: colors.muted });
    text(valueLines.join("\n"), x + 8, top + 35, { size: 10, color: colors.text });

    return cellHeight;
  };

  const drawSimpleTable = (
    columns: { label: string; width: number; align?: "left" | "center" | "right" }[],
    rows: string[][],
    totalLabel?: string,
    totalValue?: string
  ) => {
    ensureSpace(50);

    let x = margin;
    const headerH = 26;
    doc.setFillColor(colors.soft, colors.soft, colors.soft);

    columns.forEach((col) => {
      doc.rect(x, y, col.width, headerH);
      text(col.label, x + 8, y + 17, { bold: true, size: 9, color: colors.title });
      x += col.width;
    });

    y += headerH;

    if (!rows.length) {
      const emptyH = 28;
      doc.rect(margin, y, contentW, emptyH);
      text("Nenhum registro encontrado.", margin + contentW / 2, y + 18, {
        size: 10,
        color: colors.muted,
        align: "center",
      });
      y += emptyH;
    } else {
      rows.forEach((row) => {
        const heights = row.map((value, index) => {
          const lines = doc.splitTextToSize(String(value || ""), columns[index].width - 12);
          return Math.max(22, 10 + lines.length * 12);
        });

        const rowH = Math.max(...heights);
        ensureSpace(rowH + 2);

        let rowX = margin;
        row.forEach((value, index) => {
          doc.rect(rowX, y, columns[index].width, rowH);

          const lines = doc.splitTextToSize(String(value || ""), columns[index].width - 12);
          const align = columns[index].align || "left";

          if (align === "right") {
            text(lines.join("\n"), rowX + columns[index].width - 6, y + 15, {
              size: 9,
              color: colors.text,
              align: "right",
            });
          } else if (align === "center") {
            text(lines.join("\n"), rowX + columns[index].width / 2, y + 15, {
              size: 9,
              color: colors.text,
              align: "center",
            });
          } else {
            text(lines.join("\n"), rowX + 6, y + 15, { size: 9, color: colors.text });
          }

          rowX += columns[index].width;
        });

        y += rowH;
      });
    }

    if (totalLabel && totalValue) {
      ensureSpace(28);
      const totalLabelW = contentW - 130;
      const totalValueW = 130;

      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, totalLabelW, 26, "F");
      doc.rect(margin + totalLabelW, y, totalValueW, 26, "F");

      doc.rect(margin, y, totalLabelW, 26);
      doc.rect(margin + totalLabelW, y, totalValueW, 26);

      text(totalLabel, margin + totalLabelW - 10, y + 17, {
        bold: true,
        size: 10,
        color: colors.title,
        align: "right",
      });

      text(totalValue, margin + totalLabelW + totalValueW - 10, y + 17, {
        bold: true,
        size: 10,
        color: colors.title,
        align: "right",
      });

      y += 38;
    } else {
      y += 14;
    }
  };

  const isPJ = onlyDigits(recibo.NR_CPF_CNPJ).length === 14;

  const totalParcelas = (recibo.PARCELAS || []).reduce(
    (acc, item) => acc + Number(item.VL_PARCELA_CRM || 0),
    0
  );

  const totalPagamentos = (recibo.PAGAMENTOS || []).reduce(
    (acc, item) => acc + Number(item.VL_PAGAMENTO || 0),
    0
  );

  // HEADER CORRIGIDO
  const headerTop = y;
  const headerHeight = 68;
  const logoW = 118;
  const logoH = logoW * (500 / 1000);
  const logoX = margin;
  const logoY = headerTop + (headerHeight - logoH) / 2 + 2;

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const dataUrl = await toDataURL(logoUrl);
    doc.addImage(dataUrl, "PNG", logoX, logoY, logoW, logoH);
  } catch {}

  text("Recibo de Pagamento", pageW / 2, headerTop + 34, {
    bold: true,
    size: 21,
    color: colors.title,
    align: "center",
  });

  y = headerTop + headerHeight + 8;

  ensureSpace(120);

  const colW = contentW / 3;
  const row1Height = Math.max(
    drawInfoCell(margin, y, colW, "Data", fmtDate(recibo.DT_DIA)),
    drawInfoCell(margin + colW, y, colW, "Nome", recibo.NM_ASSOCIADO || ""),
    drawInfoCell(margin + colW * 2, y, colW, "CPF/CNPJ", formatCpfCnpj(recibo.NR_CPF_CNPJ))
  );

  y += row1Height + 14;

  ensureSpace(120);

  if (isPJ) {
    const rowHeight = drawInfoCell(margin, y, contentW, "Cidade", recibo.CIDADE || "", 54);
    y += rowHeight + 18;
  } else {
    const row2Height = Math.max(
      drawInfoCell(margin, y, colW, "Matrícula", recibo.NR_MATRICULA || ""),
      drawInfoCell(margin + colW, y, colW, "Empresa", recibo.NM_EMPRESA || ""),
      drawInfoCell(margin + colW * 2, y, colW, "Cidade", recibo.CIDADE || "")
    );

    y += row2Height + 18;
  }

  drawSectionTitle("Parcelas e Valores");

  drawSimpleTable(
    [
      { label: "Contrato", width: 92 },
      { label: "Item", width: 150 },
      { label: "Quitação", width: 72, align: "center" },
      { label: "Data", width: 80, align: "center" },
      { label: "Parcela", width: 70, align: "center" },
      { label: "Valor", width: contentW - (92 + 150 + 72 + 80 + 70), align: "right" },
    ],
    (recibo.PARCELAS || []).map((parcela) => [
      String(parcela.NR_CONTRATO || ""),
      String(parcela.NM_CATEGORIA || ""),
      Number(parcela.SN_QUITACAO) === 1 ? "Sim" : "Não",
      fmtDate(parcela.DT_PERIODO),
      String(parcela.NR_PARCELA || ""),
      fmtMoney(Number(parcela.VL_PARCELA_CRM || 0)),
    ]),
    "TOTAL:",
    fmtMoney(totalParcelas)
  );

  drawSectionTitle("Forma de Pagamento");

  drawSimpleTable(
    [
      { label: "Forma", width: contentW - 140 },
      { label: "Valor", width: 140, align: "right" },
    ],
    (recibo.PAGAMENTOS || []).map((pagamento) => [
      String(pagamento.NM_FORMA_PAGAMENTO || ""),
      fmtMoney(Number(pagamento.VL_PAGAMENTO || 0)),
    ]),
    "TOTAL:",
    fmtMoney(totalPagamentos)
  );

  drawSectionTitle("Observação");

  ensureSpace(90);
  const obsLines = doc.splitTextToSize(recibo.OBSERVACAO || "-", contentW - 20);
  const obsH = Math.max(54, obsLines.length * 14 + 20);

  doc.roundedRect(margin, y, contentW, obsH, 8, 8);
  text(obsLines.join("\n"), margin + 10, y + 20, { size: 10, color: colors.text });
  y += obsH + 56;

  ensureSpace(70);

  const assinaturaW = 220;
  const leftX = margin + 55;
  const rightX = pageW - margin - assinaturaW - 55;

  doc.setDrawColor(colors.border, colors.border, colors.border);
  doc.line(leftX, y, leftX + assinaturaW, y);
  doc.line(rightX, y, rightX + assinaturaW, y);

  text(recibo.NM_ASSOCIADO || "", leftX + assinaturaW / 2, y + 16, {
    size: 10,
    color: colors.text,
    align: "center",
  });

  text(recibo.NM_FUNCIONARIO || "", rightX + assinaturaW / 2, y + 16, {
    size: 10,
    color: colors.text,
    align: "center",
  });

  doc.save(
    `recibo_financeiro_${sanitize(recibo.NM_ASSOCIADO || "recibo")}_${recibo.ID_RECIBO_CRM || "arquivo"}.pdf`
  );
}

async function toDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");
  const b = await r.blob();
  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}