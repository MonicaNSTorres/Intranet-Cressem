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
        const w = 90;
        const h = 50;
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
        "Sicoob Cressem, inscrita no CNPJ sob o nº 54.190.525/0001-66, com sede à Rua Henrique Dias, 1000, Monte Castelo, São José dos Campos - SP, doravante denominada EMPREGADORA;"
    );
    y += 4;

    write(
        `FUNCIONÁRIO: ${o.nome}, portador do CPF nº ${o.cpf}, doravante denominado USUÁRIO.`
    );
    y += 4;

    write("Têm entre si justo e acordado o seguinte:");
    y += 10;

    doc.setFont("helvetica", "bold");
    write("1. OBJETO");
    doc.setFont("helvetica", "normal");

    write(`A Sicoob Cressem entrega ao ${o.nome} os seguintes equipamentos de TI:`);

    writeBullet(`Equipamento: ${o.modelo};`);
    writeBullet(`Número de Série: ${o.numeroSerie};`);

    if (o.equipamento === "celular") {
        writeBullet(`Número da Linha: ${o.linha};`);
        writeBullet(`Acessórios: ${o.acessorios || "Carregador"};`);
    } else {
        writeBullet("Carregador e kit teclado e mouse sem fio;");
    }

    writeBullet(`Data da Entrega: ${formatarDataBrasil(o.entrega)}.`);
    y += 8;

    doc.setFont("helvetica", "bold");
    write("2. RESPONSABILIDADES DO USUÁRIO");
    doc.setFont("helvetica", "normal");

    write("O USUÁRIO declara-se ciente de que:");

    if (o.equipamento === "celular") {
        writeBullet("É responsável pela guarda e conservação;");
        writeBullet("Deve comunicar qualquer dano ou perda imediatamente;");
        writeBullet("Poderá arcar com custos em caso de negligência ou imprudência;");
        writeBullet(
            "O equipamento e acessórios deste termo destina-se exclusivamente ao uso profissional. O empregado compromete-se a utilizar o dispositivo e seus aplicativos de comunicação apenas durante sua jornada de trabalho contratual, sendo vedada a utilização para fins particulares ou fora do horário de expediente, salvo em casos de regime de sobreaviso formalmente estabelecido."
        );
        writeBullet(
            "Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o empregado está ciente e concorda de que o dispositivo corporativo está sujeito a monitoramento remoto. O monitoramento visa garantir a segurança das informações da Cooperativa, a integridade dos dados dos cooperados e o cumprimento de políticas de conformidade. Privacidade: Não haverá coleta de dados de natureza estritamente pessoal, reforçando-se a proibição do uso do aparelho para fins particulares."
        );
    } else {
        writeBullet("É responsável pela guarda e conservação;");
        writeBullet("Deve comunicar qualquer dano ou perda imediatamente;");
        writeBullet("Poderá arcar com custos em caso de negligência ou imprudência;");
    }

    y += 8;

    doc.setFont("helvetica", "bold");
    write("3. DEVOLUÇÃO");
    doc.setFont("helvetica", "normal");

    write(
        "O empregado reitera o compromisso de devolução do equipamento e acessórios em perfeito estado de conservação no ato do desligamento ou encerramento do vínculo com a Cooperativa. A não devolução do equipamento e acessórios no prazo de 2 dias úteis após o desligamento, ou a entrega do mesmo com danos decorrentes de mau uso, autoriza a Cooperativa a proceder ao desconto do valor de mercado do dispositivo (ou valor residual conforme nota fiscal) diretamente nas verbas rescisórias, conforme facultado pelo Art. 462, § 1º da CLT. Para fins de desconto, será considerado o valor de substituição do aparelho por um modelo idêntico ou equivalente na data da rescisão."
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
    doc.line(
        margin + colW + colGap,
        assinaturaY,
        margin + colW + colGap + colW,
        assinaturaY
    );

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