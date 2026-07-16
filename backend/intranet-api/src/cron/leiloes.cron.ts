import cron from "node-cron";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";

function formatCurrency(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function processarLeiloesEncerrados() {
  let conn: oracledb.Connection | undefined;

  try {
    conn = await getOraclePool().getConnection();

    const result = await conn.execute(
      `
      SELECT
        ID_LEILAO,
        NM_PRODUTO,
        TO_CHAR(DT_FIM,'DD/MM/YYYY HH24:MI:SS') DT_FIM
      FROM DBACRESSEM.LEILAO
      WHERE ST_STATUS = 'EM_ANDAMENTO'
        AND DT_FIM <= SYSDATE
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const leiloes = (result.rows || []) as any[];

    if (!leiloes.length) return;

    for (const leilao of leiloes) {
      try {
        const vencedorResult = await conn.execute(
          `
          SELECT
            ID_LANCE,
            NM_USUARIO,
            DS_LOGIN,
            DS_EMAIL,
            VL_LANCE,
            TO_CHAR(DT_LANCE,'DD/MM/YYYY HH24:MI:SS') DT_LANCE
          FROM DBACRESSEM.LEILAO_LANCE
          WHERE ID_LEILAO = :ID_LEILAO
          ORDER BY VL_LANCE DESC, DT_LANCE ASC
          FETCH FIRST 1 ROWS ONLY
          `,
          {
            ID_LEILAO: leilao.ID_LEILAO,
          },
          {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          }
        );

        const vencedor = vencedorResult.rows?.[0] as any;

        await conn.execute(
          `
          UPDATE DBACRESSEM.LEILAO
             SET ST_STATUS = 'FINALIZADO',
                 DT_ATUALIZACAO = SYSDATE
           WHERE ID_LEILAO = :ID_LEILAO
          `,
          {
            ID_LEILAO: leilao.ID_LEILAO,
          },
          { autoCommit: false } as any
        );

        if (vencedor?.DS_EMAIL) {
          await sendEmail(
            vencedor.DS_EMAIL,
            `🏆 Você venceu o leilão: ${leilao.NM_PRODUTO}`,
            `
            <div style="background:#79B729;padding:40px;font-family:Segoe UI,Arial,sans-serif">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:700px;background:white;margin:auto;border-radius:0;overflow:hidden">

                <tr>
                  <td style="background:#00AE9D;padding:34px 30px;color:white;text-align:center">
                    <h1 style="margin:0;font-size:28px;font-weight:700">
                      🏆 Parabéns!
                    </h1>
                    <p style="margin:18px 0 0;font-size:14px;font-weight:600">
                      Você foi o vencedor do leilão.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:38px 28px 28px;color:#222;font-size:14px;line-height:1.35">

                    <p style="margin:0 0 18px">
                      Olá, <strong>${vencedor.NM_USUARIO}</strong>,
                    </p>

                    <p style="margin:0 0 18px">
                      Seu lance foi o maior até o encerramento do leilão.
                    </p>

                    <table cellpadding="0" cellspacing="0" width="100%" style="font-size:14px">
                      <tr>
                        <td style="padding:3px 0;width:200px;color:#444">
                          Produto
                        </td>
                        <td style="padding:3px 0;font-weight:700;color:#333;text-transform:uppercase">
                          ${leilao.NM_PRODUTO}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:3px 0;color:#444">
                          Lance vencedor
                        </td>
                        <td style="padding:3px 0;color:#16a34a;font-size:18px;font-weight:800">
                          ${formatCurrency(vencedor.VL_LANCE)}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:3px 0;color:#444">
                          Número de Série
                        </td>
                        <td style="padding:3px 0;color:#333">
                          ${leilao.NR_SERIE_EQUIPAMENTO || "-"}
                        </td>
                      </tr>
                    </table>

                    <p style="margin:4px 0 0">
                      Você precisa realizar o pagamento em até 3 dias úteis após o recebimento deste e-mail.
                    </p>

                    <p style="margin:0">
                      <strong>Chave PIX:</strong> 54190525/0001-66 em nome de SICOOB CRESSEM.
                    </p>

                    <p style="margin:0">
                      Gentileza responder este e-mail com o comprovante de pagamento para posterior liberação
                      <br>
                      do equipamento.
                    </p>

                  </td>
                </tr>

                <tr>
                  <td style="
                    background:#f9fafb;
                    text-align:center;
                    color:#6b7280;
                    padding:22px;
                    font-size:11px">

                    Este e-mail foi enviado automaticamente pela Intranet Sicoob Cressem.

                  </td>
                </tr>

              </table>
            </div>
            `
          );
        }

        await conn.commit();

        console.log(
          `[CRON LEILÃO] Leilão ${leilao.ID_LEILAO} finalizado.`
        );
      } catch (err) {
        await conn.rollback();

        console.error(
          `[CRON LEILÃO] Erro no leilão ${leilao.ID_LEILAO}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[CRON LEILÃO] Erro geral:", err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch { }
    }
  }
}

export function iniciarCronLeiloes() {
  cron.schedule("* * * * *", async () => {
    await processarLeiloesEncerrados();
  });

  console.log("[CRON LEILÃO] Cron iniciado.");
}