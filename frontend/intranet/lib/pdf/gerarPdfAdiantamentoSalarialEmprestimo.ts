import jsPDF from "jspdf";

type PdfOpts = {
  tipoFormulario: "CANCELAMENTO" | "RETORNO";
  empresaCancelamento?: string;
  solicita?: string;
  nome: string;
  matricula: string;
  cpf: string;
  empresaRetorno?: string;
  motivoRetorno?: string;
  dataInicio?: string;
  dataFim?: string;
  documento?: string;
  reativacaoMeses?: string;
  dataHoje: string;
  atendente: string;
};

export async function gerarPdfAdiantamentoSalarialEmprestimo(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 50;
  const colW = pageW - margin * 2;
  let y = 40;

  const bottomLimit = () => doc.internal.pageSize.getHeight() - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  const addLogo = async (logoUrl: string, width = 120, ratio = 0.5) => {
    try {
      const dataUrl = await toDataURL(logoUrl);
      const h = width * ratio;
      ensureSpace(h + 20);
      doc.addImage(dataUrl, "PNG", 30, y - 8, width, h);
      y = y - 8 + h + 18;
    } catch {
      y += 24;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (o.tipoFormulario === "RETORNO") {
    await addLogo("/sicoob-cressem-logo.png", 120, 0.5);

    doc.text(`São José dos Campos, ${o.dataHoje}.`, margin, y);
    y += 26;

    doc.text(`${o.empresaRetorno || ""}`, margin, y);
    y += 16;
    doc.text("A/C: DRH - Folha de Pagamento", margin, y);
    y += 26;

    doc.text("Prezados Senhores,", margin, y);
    y += 26;

    const texto = `Solicito a V. Sas, ${String(
      o.solicita || ""
    ).toLowerCase()} o adiantamento salarial do(a) funcionário(a), associado(a) da CRESSEM, o(a) Sr(a) ${o.nome}, matrícula ${o.matricula}.`;

    const lines = doc.splitTextToSize(texto, colW);
    lines.forEach((ln: string) => {
      doc.text(ln, margin, y);
      y += 16;
    });

    doc.text(`Motivo reativação: ${o.motivoRetorno || ""}.`, margin, y);
    y += 28;

    doc.text("Atenciosamente,", margin, y);
    y += 60;

    desenharAssinaturas(doc, pageW, y, o.nome, o.atendente);
    doc.save(`adiantamento_retorno_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }

  if (o.empresaCancelamento === "IPSM") {
    await addLogo("/logoipsm.png", 110, 0.55);

    doc.text(`São José dos Campos, ${o.dataHoje}.`, margin, y);
    y += 28;

    doc.text("Ao", margin, y);
    y += 16;
    doc.text("Instituto de Previdência do Servidor Municipal - IPSM", margin, y);
    y += 26;

    doc.text(
      `Solicito cancelamento do meu adiantamento a partir de ${o.dataInicio || ""} até ${o.dataFim || ""}.`,
      margin,
      y
    );
    y += 26;
    doc.text("Atenciosamente,", margin, y);
    y += 40;

    doc.text(`Nome: ${o.nome}`, margin, y);
    y += 16;
    doc.text(`Matrícula: ${o.matricula}`, margin, y);
    y += 50;

    desenharAssinaturas(doc, pageW, y, o.nome, o.atendente);
    doc.save(`adiantamento_ipsm_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }

  if (o.empresaCancelamento === "URBAM") {
    await addLogo("/logourban.png", 150, 0.45);

    doc.setFont("helvetica", "bold");
    doc.text("CANCELAMENTO DE ADIANTAMENTO SALARIAL", pageW / 2, y, {
      align: "center",
    });
    y += 28;

    doc.setFont("helvetica", "normal");
    doc.text(`Matrícula: ${o.matricula}`, margin, y);
    y += 16;
    doc.text(`Nome: ${o.nome}`, margin, y);
    y += 16;
    doc.text(`Data: ${o.dataHoje}`, margin, y);
    y += 26;

    const texto = `Solicito suspensão do adiantamento salarial, a partir de ${o.dataInicio || ""} a ${o.dataFim || ""}, em razão de empréstimo na Cressem.`;

    const lines = doc.splitTextToSize(texto, colW);
    lines.forEach((ln: string) => {
      doc.text(ln, margin, y);
      y += 16;
    });

    const texto2 =
      "Desde já, estou ciente que o adiantamento estará suspenso até a quitação do referido empréstimo, ocasião em que a Cressem informará à área de Recursos Humanos da Urbam, em impresso próprio, até o dia 05 (cinco) do mês seguinte à quitação, a solicitação de retorno do pagamento do referido adiantamento salarial.";

    const lines2 = doc.splitTextToSize(texto2, colW);
    lines2.forEach((ln: string) => {
      doc.text(ln, margin, y);
      y += 16;
    });

    y += 30;
    desenharAssinaturas(doc, pageW, y, o.nome, o.atendente);
    doc.save(`adiantamento_urbam_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }

  if (o.empresaCancelamento === "PMSJC") {
    await addLogo("/logopmsjc.png", 100, 0.8);

    doc.text("DEPARTAMENTO DE RECURSOS HUMANOS", pageW / 2, y, {
      align: "center",
    });
    y += 16;
    doc.text("DIVISÃO DE ADMINISTRAÇÃO DE PESSOAL", pageW / 2, y, {
      align: "center",
    });
    y += 16;
    doc.text("SUPERVISÃO DE CADASTRO E ASSENTAMENTO DE PESSOAL", pageW / 2, y, {
      align: "center",
    });
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.text("ADIANTAMENTO SALARIAL CANCELAMENTO", pageW / 2, y, {
      align: "center",
    });
    y += 28;

    doc.setFont("helvetica", "normal");

    const texto = `Eu, ${o.nome}, matrícula ${o.matricula}, RG: ${
      o.documento || ""
    } e CPF: ${o.cpf}, autorizo, em caráter irrevogável, o cancelamento do meu adiantamento salarial. Estando ciente que somente poderei reativá-lo após ${o.reativacaoMeses || ""} meses.`;

    const lines = doc.splitTextToSize(texto, colW);
    lines.forEach((ln: string) => {
      doc.text(ln, margin, y);
      y += 16;
    });

    y += 8;
    doc.text(
      `OBS.: Cancelar a partir de ${o.dataInicio || ""} à ${o.dataFim || ""}.`,
      margin,
      y
    );
    y += 28;

    doc.text(`São José dos Campos, ${o.dataHoje}.`, margin, y);
    y += 50;

    desenharAssinaturas(doc, pageW, y, o.nome, o.atendente);
    doc.save(`adiantamento_pmsjc_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }
}

function desenharAssinaturas(
  doc: jsPDF,
  pageW: number,
  y: number,
  associado: string,
  atendente: string
) {
  const w = 180;
  const x1a = 70;
  const x2a = x1a + w;
  const x1b = pageW - 70 - w;
  const x2b = x1b + w;

  doc.line(x1a, y, x2a, y);
  doc.line(x1b, y, x2b, y);

  y += 16;

  doc.text(toUpper(associado || ""), (x1a + x2a) / 2, y, { align: "center" });
  doc.text(toUpper(atendente || ""), (x1b + x2b) / 2, y, { align: "center" });
}

function toUpper(s?: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
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