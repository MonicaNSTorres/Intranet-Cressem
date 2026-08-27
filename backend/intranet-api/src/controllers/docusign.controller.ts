import { Request, Response } from "express";
import fs from "fs/promises";
import os from "os";
import path from "path";
import oracledb from "oracledb";
import { execFile } from "child_process";
import { promisify } from "util";
import { oracleExecute } from "../services/oracle.service";

const execFileAsync = promisify(execFile);

const PDF_OUTPUT_BASE_DIR = process.env.PDF_STORAGE_PATH
  ? path.resolve(process.env.PDF_STORAGE_PATH)
  : "C:\\inetpub\\wwwroot\\docusign\\docusign_exported_pdfs\\pdfs";

type EnvelopeRow = {
  ENVELOPE_ID: string;
  ANO: string;
  MES: string;
};

function getSmbConfig() {
  const server = String(process.env.SMB_SERVER || "").trim();
  const share = String(process.env.SMB_SHARE || "").trim();
  const user = String(process.env.SMB_USER || "").trim();
  const password = String(process.env.SMB_PASSWORD || "");
  const domain = String(process.env.SMB_DOMAIN || "").trim();

  if (!server) throw new Error("SMB_SERVER não configurado.");
  if (!share) throw new Error("SMB_SHARE não configurado.");
  if (!user) throw new Error("SMB_USER não configurado.");
  if (!password) throw new Error("SMB_PASSWORD não configurado.");

  return { server, share, user, password, domain };
}

function getDocusignSmbBasePath() {
  return String(process.env.DOCUSIGN_SMB_BASE_PATH || "CRM/PDFS/pdfs")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function validarSegmentoCaminho(valor: string, campo: string) {
  const segmento = String(valor || "").trim();

  if (!/^[a-zA-Z0-9_-]+$/.test(segmento)) {
    throw new Error(`${campo} inválido para localizar o PDF.`);
  }

  return segmento;
}

async function execSmbClient(command: string) {
  const { server, share, user, password, domain } = getSmbConfig();
  const args = [`//${server}/${share}`];

  if (domain) args.push("-W", domain);

  args.push("-U", `${user}%${password}`, "-c", command);

  try {
    return await execFileAsync("smbclient", args);
  } catch (error: any) {
    throw new Error(
      `Falha ao acessar o servidor de arquivos via SMB. Detalhes: ${String(
        error?.stderr || error?.stdout || error?.message || error
      )}`
    );
  }
}

async function conectarShareWindows() {
  const { server, share, user, password, domain } = getSmbConfig();
  const remoto = `\\\\${server}\\${share}`;
  const usuarioCompleto = domain ? `${domain}\\${user}` : user;

  try {
    await execFileAsync("net", [
      "use",
      remoto,
      password,
      `/user:${usuarioCompleto}`,
      "/persistent:no",
    ]);
  } catch (error: any) {
    const detalhes = String(error?.stderr || error?.stdout || error?.message || error);

    // A conexão pode já existir com as mesmas credenciais; nesse caso, segue para a leitura.
    if (!/j[áa]\s+existe\s+uma\s+conex|already|existing connection|multiple connections|\b1219\b/i.test(detalhes)) {
      throw new Error(`Falha ao conectar ao servidor de arquivos via SMB. Detalhes: ${detalhes}`);
    }
  }

  return remoto;
}

async function readPdfFromSmb(ano: string, mes: string, envelopeId: string) {
  const anoSeguro = validarSegmentoCaminho(ano, "Ano");
  const mesSeguro = validarSegmentoCaminho(mes, "Mês");
  const envelopeSeguro = validarSegmentoCaminho(envelopeId, "ID do envelope");
  const diretorioRemoto = `${getDocusignSmbBasePath()}/${anoSeguro}/${mesSeguro}`;
  const fileName = `${envelopeSeguro}.pdf`;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docusign-smb-download-"));
  const tempFilePath = path.join(tempDir, fileName);

  try {
    await execSmbClient(`cd "${diretorioRemoto}"; get "${fileName}" "${tempFilePath}"`);
    return await fs.readFile(tempFilePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function readPdfFromSmbWindows(ano: string, mes: string, envelopeId: string) {
  const anoSeguro = validarSegmentoCaminho(ano, "Ano");
  const mesSeguro = validarSegmentoCaminho(mes, "Mês");
  const envelopeSeguro = validarSegmentoCaminho(envelopeId, "ID do envelope");
  const shareRoot = await conectarShareWindows();
  const remotePdfPath = path.win32.join(
    shareRoot,
    getDocusignSmbBasePath().replace(/\//g, "\\"),
    anoSeguro,
    mesSeguro,
    `${envelopeSeguro}.pdf`
  );

  return {
    buffer: await fs.readFile(remotePdfPath),
    path: remotePdfPath,
  };
}

export const docusignController = {
  async downloadFromDb(req: Request, res: Response) {
    try {
      const envelopeId = String(req.query.envelopeId || "").trim();
      const inline = String(req.query.inline || "false") === "true";

      if (!envelopeId) {
        return res.status(400).json({
          error: "envelopeId é obrigatório",
        });
      }

      const result = await oracleExecute(
        `
          SELECT
            ENVELOPE_ID,
            TO_CHAR(CREATED_AT, 'YYYY') AS ANO,
            TO_CHAR(CREATED_AT, 'MM') AS MES
          FROM DBACRESSEM.DOCUSIGN_ENVELOPES_RESOLVIDO
          WHERE ENVELOPE_ID = :envelopeId
        `,
        { envelopeId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (result.rows || []) as EnvelopeRow[];

      if (!rows.length) {
        return res.status(404).json({
          error: "Envelope não encontrado no banco.",
        });
      }

      const row = rows[0];

      if (!row?.ENVELOPE_ID || !row?.ANO || !row?.MES) {
        return res.status(404).json({
          error: "Dados insuficientes para localizar o PDF.",
          row,
        });
      }

      const pdfPath = path.join(
        PDF_OUTPUT_BASE_DIR,
        row.ANO,
        row.MES,
        `${row.ENVELOPE_ID}.pdf`
      );

      const isWindowsRuntime = process.platform === "win32";
      const smbPdfPath = `${getDocusignSmbBasePath()}/${row.ANO}/${row.MES}/${row.ENVELOPE_ID}.pdf`;
      let caminhoResolvido = isWindowsRuntime ? pdfPath : smbPdfPath;
      let pdfBuffer: Buffer;

      try {
        if (isWindowsRuntime) {
          try {
            pdfBuffer = await fs.readFile(pdfPath);
          } catch {
            const pdfRemoto = await readPdfFromSmbWindows(row.ANO, row.MES, row.ENVELOPE_ID);
            pdfBuffer = pdfRemoto.buffer;
            caminhoResolvido = pdfRemoto.path;
          }
        } else {
          pdfBuffer = await readPdfFromSmb(row.ANO, row.MES, row.ENVELOPE_ID);
        }
      } catch (err: any) {
        console.error("Erro ao ler PDF no disco:", err);

        return res.status(404).json({
          error: "PDF não encontrado no servidor de arquivos.",
          path: caminhoResolvido,
          details: err?.message,
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        inline
          ? `inline; filename="${row.ENVELOPE_ID}.pdf"`
          : `attachment; filename="${row.ENVELOPE_ID}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length.toString());
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(pdfBuffer);
    } catch (error: any) {
      console.error("Erro ao buscar/enviar PDF:", error);

      return res.status(500).json({
        error: "Erro interno do servidor ao buscar o PDF.",
        details: error?.message,
        oracleErrorCode: error?.errorNum ?? null,
      });
    }
  },
};
