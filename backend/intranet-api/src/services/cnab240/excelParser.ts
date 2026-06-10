import * as XLSX from "xlsx";
import {
    ICnabExcelParseResult,
    ICnabTransferencia,
    TipoTransferenciaCnab,
} from "./types";

function somenteNumeros(value: any): string {
    return String(value ?? "").replace(/\D/g, "");
}

function texto(value: any): string {
    return String(value ?? "").trim();
}

function numero(value: any): number {
    if (typeof value === "number") return value;

    const raw = String(value ?? "").trim();

    if (!raw) return 0;

    const cleaned = raw.replace(/[^\d.,-]/g, "");

    const temVirgula = cleaned.includes(",");
    const temPonto = cleaned.includes(".");

    let normalized = cleaned;

    if (temVirgula && temPonto) {
        normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (temVirgula) {
        normalized = cleaned.replace(",", ".");
    } else {
        normalized = cleaned;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizarTexto(value: any): string {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function normalizarTipo(value: any, banco: string): TipoTransferenciaCnab {
    const tipo = Number(value);

    if (tipo === 1 || tipo === 2) return tipo;

    return banco === "033" || banco === "33" ? 1 : 2;
}

function buscarAbaTransferencias(workbook: XLSX.WorkBook) {
    const nomes = workbook.SheetNames;

    const aba = nomes.find((nome) => {
        const normalizado = normalizarTexto(nome);

        return (
            normalizado.includes("TRANSFERENCIA") ||
            normalizado.includes("TRANSFERENCIAS") ||
            normalizado.includes("PAGAMENTO") ||
            normalizado.includes("PAGAMENTOS")
        );
    });

    if (!aba) {
        throw new Error(
            `A aba de transferências não foi encontrada no Excel. Abas encontradas: ${nomes.join(", ")}`
        );
    }

    return workbook.Sheets[aba];
}

function acharIndiceCabecalho(rows: any[][]): number {
    const index = rows.findIndex((row) => {
        const colunas = row.map(normalizarTexto);

        return (
            colunas.includes("BANCO") &&
            (colunas.includes("AGENCIA") || colunas.includes("AGÊNCIA")) &&
            colunas.includes("CONTA")
        );
    });

    return index >= 0 ? index : 0;
}

function getValue(row: any[], headers: string[], nomesPossiveis: string[]) {
    for (const nome of nomesPossiveis) {
        const index = headers.findIndex((h) => h === normalizarTexto(nome));

        if (index >= 0) {
            return row[index];
        }
    }

    return "";
}

function lerAbaTransferencias(workbook: XLSX.WorkBook): ICnabTransferencia[] {
    const sheet = buscarAbaTransferencias(workbook);

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
    });

    const headerIndex = acharIndiceCabecalho(rows);
    const headers = rows[headerIndex].map(normalizarTexto);

    const transferencias: ICnabTransferencia[] = [];

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];

        if (!row) continue;

        const banco = somenteNumeros(
            getValue(row, headers, ["BANCO", "COD_BANCO", "BANCO_FAVORECIDO"])
        );

        const agencia = somenteNumeros(
            getValue(row, headers, ["AGENCIA", "AGÊNCIA"])
        );

        const conta = somenteNumeros(
            getValue(row, headers, ["CONTA", "CONTA_CORRENTE"])
        );

        const cpfCnpj = somenteNumeros(
            getValue(row, headers, ["CPF_CNPJ", "CPF", "CNPJ"])
        );

        const nome = texto(
            getValue(row, headers, ["NOME_FAVORECIDO", "NOME", "FAVORECIDO"])
        );

        const valor = numero(
            getValue(row, headers, ["VALOR", "VALOR_PAGAMENTO", "VL_PAGAMENTO"])
        );

        if (!banco && !agencia && !conta && !cpfCnpj && !nome && !valor) {
            continue;
        }

        transferencias.push({
            sequencia: transferencias.length + 1,
            cpfCnpj,
            banco,
            agencia,
            conta,
            dvConta: somenteNumeros(getValue(row, headers, ["DV", "DIGITO", "DÍGITO"])).slice(-1),
            nome,
            valor,
            tipo: normalizarTipo(getValue(row, headers, ["TIPO"]), banco),
            descricao: texto(getValue(row, headers, ["DESCRICAO", "DESCRIÇÃO"])),
        });
    }

    return transferencias;
}

export function parseCnabExcel(buffer: Buffer): ICnabExcelParseResult {
    const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: true,
    });

    const transferencias = lerAbaTransferencias(workbook);

    const valorTotal = transferencias.reduce(
        (acc, item) => acc + Number(item.valor || 0),
        0
    );

    return {
        transferencias,
        totalRegistros: transferencias.length,
        valorTotal,
    };
}