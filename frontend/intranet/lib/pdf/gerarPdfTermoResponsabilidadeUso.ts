import jsPDF from "jspdf";

type PdfOpts = {
    cpf: string;
    nome: string;
    equipamento: "" | "celular" | "notebook";
    modelo: string;
    numeroSerie: string;
    linha: string;
    entrega: string;
    acessorios: string;
};

export async function gerarPdfTermoResponsabilidadeUso(o: PdfOpts) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentW = pageW - margin * 2;
    let y = 42;

    const ensureSpace = (needed = 18) => {
        if (y + needed > pageH - margin) {
            doc.addPage();
            y = margin;
        }
    };

    const write = (text: string, lineHeight = 16) => {
        const lines = doc.splitTextToSize(text, contentW);
        lines.forEach((ln: string) => {
            ensureSpace(lineHeight);
            doc.text(ln, margin, y);
            y += lineHeight;
        });
    };

    const writeBullet = (text: string, lineHeight = 16) => {
        const bulletX = margin + 10;
        const textX = margin + 24;
        const lines = doc.splitTextToSize(text, contentW - 24);

        lines.forEach((ln: string, index: number) => {
            ensureSpace(lineHeight);
            if (index === 0) {
                doc.text("•", bulletX, y);
            }
            doc.text(ln, textX, y);
            y += lineHeight;
        });
    };

    try {
        const logoUrl = "/sicoob-cressem-logo.png";
        const dataUrl = await toDataURL(logoUrl);
        const w = 90;//largura do logo
        const h = 50;//altura
        doc.addImage(dataUrl, "PNG", margin, y, w, h);
        y += h + 18;
    } catch {
        y += 12;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
        "TERMO DE RESPONSABILIDADE DE USO DE EQUIPAMENTOS DE TI",
        pageW / 2,
        y,
        { align: "center" }
    );
    y += 30;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    write("Pelo presente instrumento, as partes:");
    y += 4;

    write(
        "EMPRESA: Sicoob Cressem, inscrita no CNPJ sob o nº 54.190.525/0001-66, com sede à Rua Henrique Dias, 1000, Monte Castelo, São José dos Campos - SP, doravante denominada EMPREGADORA."
    );
    y += 4;

    write(
        `COLABORADOR: ${o.nome}, portador do CPF nº ${o.cpf}, doravante denominado USUÁRIO.`
    );
    y += 4;

    write("Têm entre si justo e acordado o seguinte:");
    y += 10;

    doc.setFont("helvetica", "bold");
    write("1. OBJETO");
    doc.setFont("helvetica", "normal");

    write("A EMPREGADORA entrega ao USUÁRIO os seguintes equipamentos de TI:");
    writeBullet(`Equipamento: ${o.modelo};`);
    writeBullet(`Número de Série: ${o.numeroSerie};`);

    if (o.equipamento === "celular") {
        writeBullet(`Número da Linha: ${o.linha};`);
    }

    writeBullet(`Acessórios: ${o.acessorios}`);
    writeBullet(`Data da Entrega: ${formatarDataBrasil(o.entrega)}.`);
    y += 8;

    doc.setFont("helvetica", "bold");
    write("2. RESPONSABILIDADES DO USUÁRIO");
    doc.setFont("helvetica", "normal");

    write("O USUÁRIO declara-se ciente de que:");
    writeBullet("O equipamento é de uso exclusivo profissional;");
    writeBullet("É responsável pela guarda e conservação;");
    writeBullet("Deve comunicar qualquer dano ou perda imediatamente;");
    writeBullet("Poderá arcar com custos em caso de negligência;");
    writeBullet("Compromete-se a seguir as normas internas e de segurança da informação.");

    if (o.equipamento === "celular") {
        writeBullet(
            "Atenção: Este dispositivo é monitorado. As mensagens e dados trafegados estão sujeitos a auditoria periódica pela equipe de Segurança da Informação da Sicoob Cressem."
        );
    }

    y += 8;

    doc.setFont("helvetica", "bold");
    write("3. DEVOLUÇÃO");
    doc.setFont("helvetica", "normal");

    write(
        "O USUÁRIO compromete-se a devolver todos os itens quando solicitado ou no fim do vínculo."
    );
    y += 10;

    const dataAtual = new Date();
    write(
        `São José dos Campos, ${dataAtual.getDate()} de ${dataAtual.toLocaleString(
            "pt-BR",
            { month: "long" }
        )} de ${dataAtual.getFullYear()}.`
    );

    y += 42;

    const assinaturaY = y;
    const colGap = 30;
    const colW = (contentW - colGap) / 2;

    doc.line(margin, assinaturaY, margin + colW, assinaturaY);
    doc.line(margin + colW + colGap, assinaturaY, margin + colW + colGap + colW, assinaturaY);

    y += 18;

    doc.setFont("helvetica", "normal");
    doc.text(o.nome, margin + colW / 2, y, { align: "center" });
    y += 14;
    doc.text(`CPF: ${o.cpf}`, margin + colW / 2, y, { align: "center" });

    const rightCenterX = margin + colW + colGap + colW / 2;
    doc.text("Departamento da Tecnologia da Informação", rightCenterX, y - 14, {
        align: "center",
    });

    doc.save(`termo_responsabilidade_${sanitize(o.nome || "funcionario")}.pdf`);
}

function formatarDataBrasil(data: string) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    if (!ano || !mes || !dia) return data;
    return `${dia}/${mes}/${ano}`;
}

function sanitize(s: string) {
    return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function toDataURL(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Logo não encontrada");
    const b = await r.blob();

    return await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result as string);
        fr.readAsDataURL(b);
    });
}