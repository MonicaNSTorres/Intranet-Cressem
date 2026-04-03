import { Request, Response } from "express";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";

type ResgatePayload = {
    resgate: {
        ID_CLIENTE?: number;
        NR_CPF_CNPJ: string;
        NM_CLIENTE: string;
        CD_MATRICULA?: string;
        NM_EMPRESA?: string;
        VL_CAPITAL_ATUAL: number;
        VL_CAPITAL_AMORTIZACAO: number;
        VL_SALDO_RESTANTE: number;
        DESC_MOTIVO?: string;
        NM_AUTORIZADO?: string;
        DT_CARENCIA?: string; // YYYY-MM-DD
        DT_RESGATE_PARCIAL_CAPITAL: string; // YYYY-MM-DD
        NM_ATENDENTE: string;
        NM_CIDADE?: string;
    };
    emprestimos?: Array<{
        DESC_TIPO?: string;
        NR_CONTRATO?: string;
        VL_SALDO_DEVEDOR?: number;
        VL_SALDO_AMORTIZADO: number;
    }>;
    contaCorrente?: {
        NR_CONTA?: string;
        VL_SALDO_DEVEDOR?: number;
        VL_SALDO_AMORTIZADO: number;
    };
    cartao?: {
        NR_CARTAO?: string;
        VL_SALDO_DEVEDOR?: number;
        VL_SALDO_AMORTIZADO: number;
    };
    deposito?: {
        CD_BANCO?: string;
        CD_AGENCIA?: string;
        CD_CONTA_CORRENTE?: string;
        parcelas: Array<{
            DT_PARCELA: string; // YYYY-MM-DD
            DT_PAGAMENTO?: string | null; // YYYY-MM-DD
            VL_PARCELA_RESGATE: number;
            SN_PAGO?: number;
            NM_ATENDENTE?: string;
        }>;
    };
};

function toNumber(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function isDateIso(v: unknown): boolean {
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function errMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return String(e);
}

function validarPayload(payload: ResgatePayload) {
    if (!payload?.resgate) throw new Error("Campo 'resgate' e obrigatorio.");

    const r = payload.resgate;

    if (!r.NR_CPF_CNPJ) throw new Error("NR_CPF_CNPJ obrigatorio.");
    if (!r.NM_CLIENTE) throw new Error("NM_CLIENTE obrigatorio.");
    if (!r.NM_ATENDENTE) throw new Error("NM_ATENDENTE obrigatorio.");
    if (!isDateIso(r.DT_RESGATE_PARCIAL_CAPITAL)) {
        throw new Error("DT_RESGATE_PARCIAL_CAPITAL deve estar em YYYY-MM-DD.");
    }
    if (r.DT_CARENCIA && !isDateIso(r.DT_CARENCIA)) {
        throw new Error("DT_CARENCIA deve estar em YYYY-MM-DD.");
    }

    const totalEmprestimos = (payload.emprestimos || []).reduce(
        (acc, e) => acc + toNumber(e.VL_SALDO_AMORTIZADO),
        0
    );

    const amortConta = toNumber(payload.contaCorrente?.VL_SALDO_AMORTIZADO);
    const amortCartao = toNumber(payload.cartao?.VL_SALDO_AMORTIZADO);

    const totalDeposito = (payload.deposito?.parcelas || []).reduce(
        (acc, p) => acc + toNumber(p.VL_PARCELA_RESGATE),
        0
    );

    const totalAmortizacao = totalEmprestimos + amortConta + amortCartao + totalDeposito;

    if (totalAmortizacao <= 0) {
        throw new Error("Informe pelo menos um valor de amortizacao/deposito maior que zero.");
    }

    const capitalAtual = toNumber(r.VL_CAPITAL_ATUAL);
    if (totalAmortizacao > capitalAtual) {
        throw new Error("Total de amortizacao/deposito nao pode ser maior que o capital atual.");
    }

    const capitalAmortizacao = toNumber(r.VL_CAPITAL_AMORTIZACAO);
    if (capitalAmortizacao > 0 && Math.abs(capitalAmortizacao - totalAmortizacao) > 0.01) {
        throw new Error("VL_CAPITAL_AMORTIZACAO diverge da soma de emprestimos/conta/cartao/deposito.");
    }

    if (payload.deposito && totalDeposito > 0) {
        if (!payload.deposito.CD_BANCO || !payload.deposito.CD_AGENCIA || !payload.deposito.CD_CONTA_CORRENTE) {
            throw new Error("Dados de conta deposito obrigatorios quando houver parcelas.");
        }

        for (const p of payload.deposito.parcelas) {
            if (!isDateIso(p.DT_PARCELA)) {
                throw new Error("Todas as parcelas devem ter DT_PARCELA em YYYY-MM-DD.");
            }
            if (p.DT_PAGAMENTO && !isDateIso(p.DT_PAGAMENTO)) {
                throw new Error("DT_PAGAMENTO invalida. Use YYYY-MM-DD.");
            }
            if (toNumber(p.VL_PARCELA_RESGATE) <= 0) {
                throw new Error("VL_PARCELA_RESGATE deve ser maior que zero.");
            }
        }
    }
}

export const resgateCapitalController = {
    async criar(req: Request, res: Response) {
        const conn = await getOraclePool().getConnection();

        try {
            const payload = req.body as ResgatePayload;
            validarPayload(payload);

            const r = payload.resgate;

            const insertResgateSql = `
        INSERT INTO DBACRESSEM.RESGATE_PARCIAL_CAPITAL (
          ID_CLIENTE,
          NR_CPF_CNPJ,
          NM_CLIENTE,
          CD_MATRICULA,
          NM_EMPRESA,
          VL_CAPITAL_ATUAL,
          VL_CAPITAL_AMORTIZACAO,
          VL_SALDO_RESTANTE,
          DESC_MOTIVO,
          NM_AUTORIZADO,
          DT_CARENCIA,
          DT_RESGATE_PARCIAL_CAPITAL,
          NM_ATENDENTE,
          NM_CIDADE
        ) VALUES (
          :ID_CLIENTE,
          :NR_CPF_CNPJ,
          :NM_CLIENTE,
          :CD_MATRICULA,
          :NM_EMPRESA,
          :VL_CAPITAL_ATUAL,
          :VL_CAPITAL_AMORTIZACAO,
          :VL_SALDO_RESTANTE,
          :DESC_MOTIVO,
          :NM_AUTORIZADO,
          TO_DATE(NULLIF(:DT_CARENCIA, ''), 'YYYY-MM-DD'),
          TO_DATE(:DT_RESGATE_PARCIAL_CAPITAL, 'YYYY-MM-DD'),
          :NM_ATENDENTE,
          :NM_CIDADE
        )
        RETURNING ID_RESGATE_PARCIAL_CAPITAL INTO :ID_RESGATE
      `;

            const resultResgate = await conn.execute(insertResgateSql, {
                ID_CLIENTE: r.ID_CLIENTE ?? null,
                NR_CPF_CNPJ: r.NR_CPF_CNPJ,
                NM_CLIENTE: r.NM_CLIENTE,
                CD_MATRICULA: r.CD_MATRICULA ?? null,
                NM_EMPRESA: r.NM_EMPRESA ?? null,
                VL_CAPITAL_ATUAL: toNumber(r.VL_CAPITAL_ATUAL),
                VL_CAPITAL_AMORTIZACAO: toNumber(r.VL_CAPITAL_AMORTIZACAO),
                VL_SALDO_RESTANTE: toNumber(r.VL_SALDO_RESTANTE),
                DESC_MOTIVO: r.DESC_MOTIVO ?? null,
                NM_AUTORIZADO: r.NM_AUTORIZADO ?? null,
                DT_CARENCIA: r.DT_CARENCIA ?? "",
                DT_RESGATE_PARCIAL_CAPITAL: r.DT_RESGATE_PARCIAL_CAPITAL,
                NM_ATENDENTE: r.NM_ATENDENTE,
                NM_CIDADE: r.NM_CIDADE ?? null,
                ID_RESGATE: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            });

            const outResgate = resultResgate.outBinds as { ID_RESGATE: number[] };
            const idResgate = Number(outResgate.ID_RESGATE[0]);

            if (payload.contaCorrente && toNumber(payload.contaCorrente.VL_SALDO_AMORTIZADO) > 0) {
                await conn.execute(
                    `
            INSERT INTO DBACRESSEM.CONTA_CORRENTE_RESGATE (
              NR_CONTA,
              VL_SALDO_DEVEDOR,
              VL_SALDO_AMORTIZADO,
              ID_RESGATE
            ) VALUES (
              :NR_CONTA,
              :VL_SALDO_DEVEDOR,
              :VL_SALDO_AMORTIZADO,
              :ID_RESGATE
            )
          `,
                    {
                        NR_CONTA: payload.contaCorrente.NR_CONTA ?? null,
                        VL_SALDO_DEVEDOR: toNumber(payload.contaCorrente.VL_SALDO_DEVEDOR),
                        VL_SALDO_AMORTIZADO: toNumber(payload.contaCorrente.VL_SALDO_AMORTIZADO),
                        ID_RESGATE: idResgate,
                    }
                );
            }

            if (payload.cartao && toNumber(payload.cartao.VL_SALDO_AMORTIZADO) > 0) {
                await conn.execute(
                    `
            INSERT INTO DBACRESSEM.CARTAO_CREDITO_RESGATE (
              NR_CARTAO,
              VL_SALDO_DEVEDOR,
              VL_SALDO_AMORTIZADO,
              ID_RESGATE
            ) VALUES (
              :NR_CARTAO,
              :VL_SALDO_DEVEDOR,
              :VL_SALDO_AMORTIZADO,
              :ID_RESGATE
            )
          `,
                    {
                        NR_CARTAO: payload.cartao.NR_CARTAO ?? null,
                        VL_SALDO_DEVEDOR: toNumber(payload.cartao.VL_SALDO_DEVEDOR),
                        VL_SALDO_AMORTIZADO: toNumber(payload.cartao.VL_SALDO_AMORTIZADO),
                        ID_RESGATE: idResgate,
                    }
                );
            }

            for (const emp of payload.emprestimos || []) {
                if (toNumber(emp.VL_SALDO_AMORTIZADO) <= 0) continue;

                await conn.execute(
                    `
            INSERT INTO DBACRESSEM.EMPRESTIMO_RESGATE (
              DESC_TIPO,
              NR_CONTRATO,
              VL_SALDO_DEVEDOR,
              VL_SALDO_AMORTIZADO,
              ID_RESGATE
            ) VALUES (
              :DESC_TIPO,
              :NR_CONTRATO,
              :VL_SALDO_DEVEDOR,
              :VL_SALDO_AMORTIZADO,
              :ID_RESGATE
            )
          `,
                    {
                        DESC_TIPO: emp.DESC_TIPO ?? null,
                        NR_CONTRATO: emp.NR_CONTRATO ?? null,
                        VL_SALDO_DEVEDOR: toNumber(emp.VL_SALDO_DEVEDOR),
                        VL_SALDO_AMORTIZADO: toNumber(emp.VL_SALDO_AMORTIZADO),
                        ID_RESGATE: idResgate,
                    }
                );
            }

            let idContaDeposito: number | null = null;

            if (payload.deposito && (payload.deposito.parcelas?.length || 0) > 0) {
                const resultDep = await conn.execute(
                    `
            INSERT INTO DBACRESSEM.CONTA_DEPOSITO_RESGATE (
              CD_BANCO,
              CD_AGENCIA,
              CD_CONTA_CORRENTE
            ) VALUES (
              :CD_BANCO,
              :CD_AGENCIA,
              :CD_CONTA_CORRENTE
            )
            RETURNING ID_CONTA_DEPOSITO_RESGATE INTO :ID_CONTA_DEPOSITO
          `,
                    {
                        CD_BANCO: payload.deposito.CD_BANCO ?? null,
                        CD_AGENCIA: payload.deposito.CD_AGENCIA ?? null,
                        CD_CONTA_CORRENTE: payload.deposito.CD_CONTA_CORRENTE ?? null,
                        ID_CONTA_DEPOSITO: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    }
                );

                const outDep = resultDep.outBinds as { ID_CONTA_DEPOSITO: number[] };
                idContaDeposito = Number(outDep.ID_CONTA_DEPOSITO[0]);

                for (const p of payload.deposito.parcelas) {
                    await conn.execute(
                        `
              INSERT INTO DBACRESSEM.PARCELA_RESGATE (
                DT_PARCELA,
                DT_PAGAMENTO,
                VL_PARCELA_RESGATE,
                SN_PAGO,
                NM_ATENDENTE,
                ID_CONTA_DEPOSITO,
                ID_RESGATE
              ) VALUES (
                TO_DATE(:DT_PARCELA, 'YYYY-MM-DD'),
                TO_DATE(NULLIF(:DT_PAGAMENTO, ''), 'YYYY-MM-DD'),
                :VL_PARCELA_RESGATE,
                :SN_PAGO,
                :NM_ATENDENTE,
                :ID_CONTA_DEPOSITO,
                :ID_RESGATE
              )
            `,
                        {
                            DT_PARCELA: p.DT_PARCELA,
                            DT_PAGAMENTO: p.DT_PAGAMENTO ?? "",
                            VL_PARCELA_RESGATE: toNumber(p.VL_PARCELA_RESGATE),
                            SN_PAGO: p.SN_PAGO ?? 0,
                            NM_ATENDENTE: p.NM_ATENDENTE ?? r.NM_ATENDENTE,
                            ID_CONTA_DEPOSITO: idContaDeposito,
                            ID_RESGATE: idResgate,
                        }
                    );
                }
            }

            await conn.commit();

            return res.status(201).json({
                success: true,
                idResgate,
                idContaDeposito,
            });
        } catch (e: unknown) {
            try {
                await conn.rollback();
            } catch {
                // ignore rollback error
            }

            return res.status(400).json({
                error: "Falha ao criar resgate capital.",
                details: errMessage(e),
            });
        } finally {
            await conn.close();
        }
    },
};
