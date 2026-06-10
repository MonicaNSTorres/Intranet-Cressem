export type TipoTransferenciaCnab = 1 | 2;

export interface ICnabTransferencia {
    sequencia: number;
    cpfCnpj: string;
    banco: string;
    agencia: string;
    conta: string;
    dvConta: string;
    nome: string;
    valor: number;
    tipo: TipoTransferenciaCnab;
    descricao: string;
}

export interface ICnabExcelParseResult {
    transferencias: ICnabTransferencia[];
    totalRegistros: number;
    valorTotal: number;
}