/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

type Opts = {
    nome: string;
    matricula: string;
    percentual: 20 | 30;
    prontuario?: string;
    cidade: string;
    dataCabecalho: string;
    //acao: "Ativar" | "Reativar" | "Cancelar";
    acao: "Ativar" | "Cancelar";
};

export async function gerarPdfAdiantamentoSalarial(o: Opts) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 50;
    let y = margin;

    try {
        const logo = await toDataURL("/sicoob-cressem-logo.png");
        const w = 120;
        const h = (w * 300) / 500;
        //doc.addImage(logo, "PNG", margin - 4, y - 6, w, h);
        doc.addImage(logo, "PNG", margin - 28, y - 6, w, h);
    } catch {
    }

    y += 36;

    const frameX = margin - 14;
    const frameY = y + 36;
    const frameW = pageW - 2 * (margin - 14);
    const frameH = pageH - frameY - margin;

    const bandTop = frameY;
    const bandBottom = bandTop + 20;

    doc.setLineWidth(0.8);
    doc.line(frameX, bandTop, frameX + frameW, bandTop);
    doc.line(frameX, bandBottom, frameX + frameW, bandBottom);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ADIANTAMENTO SALARIAL", pageW / 2, bandTop + 14, { align: "center" });

    y = bandBottom + 26;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${o.cidade}, ${o.dataCabecalho}`, pageW - margin, y, { align: "right" });
    y += 100;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Ilmo. Sr.", margin, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text("PAULO DE TARSO DOS SANTOS CUNHA", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.text("Diretor Operacional", margin, y);
    y += 16;
    doc.text("SICOOB Cressem", margin, y);
    y += 28;
    const verbo =
        o.acao === "Ativar" ? "ativar" :
            //o.acao === "Reativar" ? "reativar" :
            o.acao === "Cancelar" ? "cancelar" :
                "cancelar";

    const paragrafo = `Solicito a V. Sa., ${verbo} o adiantamento salarial, referente a ${o.percentual}% ( ${o.percentual === 20 ? "vinte" : "trinta"} por cento ) de minha remuneração.`;
    const lines = doc.splitTextToSize(paragrafo, pageW - margin * 2);
    lines.forEach((ln: any) => {
        doc.text(ln, margin, y);
        y += 16;
    });
    y += 22;

    doc.text("Atenciosamente,", margin, y);
    y += 100;

    const sigWidth = 300;
    const sigX = (pageW - sigWidth) / 2;
    doc.line(sigX, y, sigX + sigWidth, y);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.text(toUpper(o.nome), pageW / 2, y, { align: "center" });
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.text("Funcionário(a) do SICOOB Cressem", pageW / 2, y, { align: "center" });

    if (o.matricula) {
        y += 16;
        doc.text(`Matricula: ${o.matricula}`, pageW / 2, y, { align: "center" });
    }

    doc.setLineWidth(0.8);
    doc.rect(frameX, frameY, frameW, frameH);

    doc.save(`adiantamento_salarial_${sanitize(o.nome || "funcionario")}.pdf`);
}

function toUpper(s?: string) {
    return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
function sanitize(s: string) {
    return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function toDataURL(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Logo não encontrado: " + url);
    const b = await r.blob();
    return await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result as string);
        fr.readAsDataURL(b);
    });
}
