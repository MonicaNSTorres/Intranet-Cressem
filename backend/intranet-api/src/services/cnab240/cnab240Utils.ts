export function removerAcentos(value: string): string {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function alpha(
    value: string | number | null | undefined,
    size: number
): string {
    const text = removerAcentos(String(value ?? ""))
        .toUpperCase()
        .replace(/[^\w\s]/g, "")
        .slice(0, size);

    return text.padEnd(size, " ");
}

export function numeric(
    value: string | number | null | undefined,
    size: number
): string {
    const text = String(value ?? "")
        .replace(/\D/g, "")
        .slice(0, size);

    return text.padStart(size, "0");
}

export function money(value: number, size: number): string {
    const cents = Math.round(Number(value || 0) * 100);

    return numeric(cents, size);
}

export function spaces(size: number): string {
    return " ".repeat(size);
}

export function zeros(size: number): string {
    return "0".repeat(size);
}

export function assert240(line: string, nome: string): string {
    if (line.length !== 240) {
        throw new Error(
            `${nome} inválido: esperado 240 posições, recebido ${line.length}.`
        );
    }

    return line;
}