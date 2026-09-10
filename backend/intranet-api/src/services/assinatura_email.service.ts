import oracledb from "oracledb";
import { oracleExecute } from "./oracle.service";

export type DadosFuncionarioAssinatura = {
  ID_FUNCIONARIO?: number;
  NM_FUNCIONARIO?: string;
  EMAIL?: string;
  NR_RAMAL?: string;
  NR_CELULAR?: string;
  SN_ATIVO?: number;
  NM_SETOR?: string;
  NM_ENDERECO?: string;
  NM_CARGO?: string;
  NM_NIVEL?: string;
};

export async function buscarDadosFuncionarioParaAssinatura(
  nome: string,
  email: string
) {
  const nomeBusca = String(nome || "").trim();
  const emailBusca = String(email || "").trim();
  const partesNome = nomeBusca.split(/\s+/).filter(Boolean);
  const primeiroNome = partesNome[0] || "";
  const ultimoNome =
    partesNome.length > 1 ? partesNome[partesNome.length - 1] : "";

  if (!nomeBusca && !emailBusca) return null;

  const result = await oracleExecute(
    `
      SELECT
        f.ID_FUNCIONARIO,
        f.NM_FUNCIONARIO,
        f.EMAIL,
        f.NR_RAMAL,
        f.NR_CELULAR,
        f.SN_ATIVO,
        s.NM_SETOR,
        s.NM_ENDERECO,
        c.NM_CARGO,
        c.NM_NIVEL
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
        ON s.ID_SETOR = f.ID_SETOR
      LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        ON c.ID_CARGO = f.ID_CARGO
      WHERE
        (
          :nomeBusca IS NOT NULL
          AND UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nomeBusca))
        )
        OR (
          :emailBusca IS NOT NULL
          AND UPPER(TRIM(f.EMAIL)) = UPPER(TRIM(:emailBusca))
        )
        OR (
          :primeiroNome IS NOT NULL
          AND :ultimoNome IS NOT NULL
          AND INSTR(UPPER(f.NM_FUNCIONARIO), UPPER(:primeiroNome)) > 0
          AND INSTR(UPPER(f.NM_FUNCIONARIO), UPPER(:ultimoNome)) > 0
        )
      ORDER BY
        CASE
          WHEN UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nomeBusca)) THEN 0
          WHEN UPPER(TRIM(f.EMAIL)) = UPPER(TRIM(:emailBusca)) THEN 1
          WHEN :primeiroNome IS NOT NULL
            AND :ultimoNome IS NOT NULL
            AND INSTR(UPPER(f.NM_FUNCIONARIO), UPPER(:primeiroNome)) > 0
            AND INSTR(UPPER(f.NM_FUNCIONARIO), UPPER(:ultimoNome)) > 0 THEN 2
          ELSE 3
        END,
        NVL(f.SN_ATIVO, 0) DESC
      FETCH FIRST 1 ROW ONLY
    `,
    {
      nomeBusca,
      emailBusca,
      primeiroNome,
      ultimoNome,
    },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows?.[0] || null) as DadosFuncionarioAssinatura | null;
}
