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
                style="max-width:700px;background:white;margin:auto;border-radius:16px;overflow:hidden">

                <tr>
                  <td style="background:#00AE9D;padding:30px;color:white;text-align:center">
                    <h1 style="margin:0">🏆 Parabéns!</h1>
                    <p>Você foi o vencedor do leilão.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px">

                    <p>
                      Olá <strong>${vencedor.NM_USUARIO}</strong>,
                    </p>

                    <p>
                      Seu lance foi o maior até o encerramento do leilão.
                    </p>

                    <div style="
                      background:#f9fafb;
                      border:1px solid #e5e7eb;
                      border-radius:12px;
                      padding:20px">

                      <table width="100%">
                        <tr>
                          <td>Produto</td>
                          <td><strong>${leilao.NM_PRODUTO}</strong></td>
                        </tr>

                        <tr>
                          <td>Lance vencedor</td>
                          <td style="color:#16a34a;font-size:22px;font-weight:bold">
                            ${formatCurrency(vencedor.VL_LANCE)}
                          </td>
                        </tr>

                        <tr>
                          <td>Encerramento</td>
                          <td>${leilao.DT_FIM}</td>
                        </tr>
                      </table>

                    </div>

                    <br>

                    <div style="
                      background:#dcfce7;
                      color:#166534;
                      padding:16px;
                      border-radius:10px">

                      A equipe responsável entrará em contato para dar sequência à entrega do item.

                    </div>

                  </td>
                </tr>

                <tr>
                  <td style="
                    background:#f9fafb;
                    text-align:center;
                    color:#6b7280;
                    padding:20px;
                    font-size:12px">

                    Este email foi enviado automaticamente pela Intranet Sicoob Cressem.

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
      } catch {}
    }
  }
}

export function iniciarCronLeiloes() {
  cron.schedule("* * * * *", async () => {
    await processarLeiloesEncerrados();
  });

  console.log("[CRON LEILÃO] Cron iniciado.");
}