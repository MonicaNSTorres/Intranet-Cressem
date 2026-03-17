/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { normalizeCnpj } from "@/lib/normalize";
import { sendNewCompaniesEmailGraph } from "@/lib/email-graph";
import * as iconv from "iconv-lite";

export const runtime = "nodejs";
export const revalidate = 0;
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "1";//ativa no 1 e desativa com 0 o processo de mandar e-mail

//caso nao seja o link, so colocar o caminho do arquivo no env
const GOV_URL =
    process.env.GOV_SOURCE ||
    "https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fdocs.dataprev.gov.br%2Fwp-content%2Fuploads%2F2025%2F11%2FCNPJs-dos-entes-publicos-que-nao-participarao-do-produto-Credito-do-Trabalhador-Atualizada-em-05-11-2025.xlsx&wdOrigin=BROWSELINK";

/*inclusoes manuais direto no codigo (por nome OU por CNPJ)*/
const MANUAL_INCLUDE: Array<{ name?: string; cnpj?: string }> = [
    { name: "CAMARA MUNICIPAL DE UBATUBA" },
    { name: "CAMARA MUNICULAR DE SAO SEBASTIAO" },
    { name: "JACAREI CAMARA MUNICIPAL" },
    { name: "CAMARA MUNICIPAL DE CACAPAVA" },
    { name: "SAO JOSE DOS CAMPOS CAMARA MUNICIPAL" },
    { name: "CAMARA MUNICIPAL DE CRUZEIRO" },
    { name: "CAMARA MUNICIPAL DE CACHOEIRA PAULISTA" },
    { name: "CAMARA MUNICIPAL DE MONTEIRO LOBATO" },
    { name: "CAMARA MUNICIPAL DA ESTANCIA CLIMATICA DE SANTO ANTONIO" },
    { name: "CAMARA MUNICIPAL DE CARAGUATATUBA" },
    { name: "CAMARA MUNICIPAL DE PARAIBUNA" },
    { name: "CAMPOS DO JORDAO CAMARA MUNICIPAL" },
    { name: "CAMARA MUNICIPAL DE JAMBEIRO" },
    //{ name: "FUSAM FUNDACAO DE SAUDE E ASSIST DO MUNIC DE CACAPAVA" },
    { name: "INSTITUTO PREVIDENCIARIO DO MUNICIPIO DE SAO SEBASTIAO - SAO SEBASTIAO PREV" },
    { name: "CAMARA MUNICIPAL DE ILHABELA" },
    //{ cnpj: "12345678000190" }, //teste por CNPJ
];

const SNAPSHOT_DIR =
    process.env.SNAPSHOT_DIR || path.join(process.cwd(), ".data", "checkpoints");

function ensureDir(p: string) {
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
}
function ymd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
function snapshotPathFor(dateStr: string) {
    return path.join(SNAPSHOT_DIR, `commons-${dateStr}.json`);
}
function loadSnapshotSet(dateStr: string): Set<string> {
    try {
        const p = snapshotPathFor(dateStr);
        if (!existsSync(p)) return new Set<string>();
        const j = JSON.parse(readFileSync(p, "utf8")) as { cnpj: string }[];
        return new Set(j.map((x) => x.cnpj));
    } catch {
        return new Set<string>();
    }
}
function saveSnapshot(dateStr: string, commons: Array<{ cnpj: string }>) {
    ensureDir(SNAPSHOT_DIR);
    const p = snapshotPathFor(dateStr);
    writeFileSync(p, JSON.stringify(commons.map((c) => ({ cnpj: c.cnpj })), null, 2));
}

function norm(s: string) {
    return String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function getField(
    obj: Record<string, any>,
    exactCandidates: string[],
    kind: "cnpj" | "nome" | "cidade"
) {
    const keys = Object.keys(obj);
    const keyByNorm = new Map(keys.map((k) => [norm(k), k]));

    for (const cand of exactCandidates) {
        const nk = norm(cand);
        if (keyByNorm.has(nk)) return obj[keyByNorm.get(nk)!];
    }

    const tokens =
        kind === "cnpj"
            ? ["cnpj"]
            : kind === "nome"
                ? [
                    "razao social",
                    "razao",
                    "social",
                    "nome do ente",
                    "nome ente",
                    "nome",
                    "denominacao social",
                    "denominacao",
                    "entidade",
                    "ente federativo",
                    "ente",
                    "orgao",
                    "empresa",
                    "NOEmpresarial",
                ]
                : [
                    "cidade conveniada",
                    "cidade convenente",
                    "cidade",
                    "municipio",
                    "municpio",
                    "municipio conveniado",
                    "municipio convenente",
                ];

    for (const t of tokens) {
        const hit = keys.find((k) => norm(k).includes(norm(t)));
        if (hit) return obj[hit];
    }

    return undefined;
}

type RowOut = { cnpj: string; nome?: string; cidade?: string };

function validCnpj14(cnpj: string) {
    return !!cnpj && cnpj.length === 14 && cnpj !== "00000000000000";
}

function findByNameLoose<T extends { nome?: string }>(arr: T[], want: string): T | undefined {
    const w = norm(want);
    return (
        arr.find((x) => x.nome && norm(x.nome) === w) ||
        arr.find((x) => x.nome && norm(x.nome)!.includes(w)) ||
        arr.find((x) => x.nome && w.includes(norm(x.nome)!))
    );
}


function normalizeGovUrl(url: string) {
    try {
        const u = new URL(url);
        if (u.hostname.includes("view.officeapps.live.com")) {
            const src = u.searchParams.get("src");
            if (src) return decodeURIComponent(src);
        }
        return url;
    } catch {
        return url;
    }
}

async function fetchXlsxBuffer(source: string) {
    if (/^https?:\/\//i.test(source) || source.includes("view.officeapps.live.com")) {
        const direct = normalizeGovUrl(source);
        const res = await fetch(direct, { cache: "no-store", redirect: "follow" });
        if (!res.ok) throw new Error("Falha ao baixar XLSX do GOV");
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("text/html")) {
            throw new Error("Link recebido não é um arquivo XLSX (recebi HTML). Use a URL direta do arquivo.");
        }
        return Buffer.from(await res.arrayBuffer());
    }

    const filePath = path.isAbsolute(source)
        ? source
        : path.join(process.cwd(), source);

    if (!existsSync(filePath)) {
        throw new Error(`Arquivo XLSX local não encontrado em: ${filePath}`);
    }

    return readFileSync(filePath);
}

async function getGovList(): Promise<RowOut[]> {
    const buf = await fetchXlsxBuffer(GOV_URL);
    const wb = XLSX.read(buf, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    const json: any[] = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { raw: false });

    return json
        .map((row): RowOut | null => {
            const cnpjRaw =
                getField(
                    row,
                    ["CNPJ", "CNPJ_ENTE", "CNPJ Ente", "CNPJ do Ente", "CNPJ do ente", "nrcnpj", "cnpj"],
                    "cnpj"
                ) ?? "";

            const nomeRaw =
                getField(
                    row,
                    [
                        "Razão Social",
                        "Razao Social",
                        "NOME",
                        "Nome",
                        "NOME_ENTE",
                        "Nome do Ente",
                        "Denominação",
                        "Denominação Social",
                        "Denominacao",
                        "Entidade",
                        "Ente Federativo",
                        "Órgão",
                        "Orgao",
                        "Empresa",
                        "NOEmpresarial",
                    ],
                    "nome"
                ) ?? "";

            const cnpj = normalizeCnpj(String(cnpjRaw));
            if (!validCnpj14(cnpj)) return null;

            const nome = String(nomeRaw || "").trim() || undefined;
            return { cnpj, nome };
        })
        .filter((x): x is RowOut => Boolean(x));
}

function readCsvText(csvPath: string): string {
    const buf = readFileSync(csvPath);

    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        return iconv.decode(buf, "utf8");
    }

    const asUtf8 = iconv.decode(buf, "utf8");
    if (/\uFFFD/.test(asUtf8) || /Ã|Â| /.test(asUtf8)) {
        return iconv.decode(buf, "win1252");
    }
    return asUtf8;
}


function getBaseListFromCSV(): RowOut[] {
    const candidates = [
        path.join(process.cwd(), "public", "Empresas.xlsx"),
        path.join(process.cwd(), "Empresas.xlsx"),
        path.resolve("public", "Empresas.xlsx"),
    ];
    const extCsv = path.join(process.cwd(), "public", "Empresas.csv");

    for (const p of candidates) {
        if (existsSync(p)) {
            try {
                const buf = readFileSync(p);
                const wb = XLSX.read(buf, { type: "buffer" });
                const sheet = wb.SheetNames[0];
                const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheet], {
                    raw: false,
                    defval: "",
                });

                return rows
                    .map((r): RowOut | null => {
                        const cnpjRaw =
                            getField(
                                r,
                                ["CNPJ", "cnpj", "Cnpj", "CNPJ_ENTE", "CNPJ Ente", "CNPJ do Ente"],
                                "cnpj"
                            ) ?? "";

                        const nomeRaw =
                            getField(
                                r,
                                [
                                    "RAZAO_SOCIAL",
                                    "Razao Social",
                                    "Razão Social",
                                    "NOME",
                                    "Nome",
                                    "Denominação",
                                    "Nome Empresarial",
                                    "NOME_EMPRESARIAL",
                                    "Nome Fantasia",
                                    "NOME_FANTASIA",
                                    "EMPRESA",
                                ],
                                "nome"
                            ) ?? "";

                        const cidadeRaw =
                            getField(
                                r,
                                ["Cidade Conveniada", "Cidade", "Município", "Municipio", "Município Conveniado"],
                                "cidade"
                            ) ?? "";

                        const cnpj = normalizeCnpj(String(cnpjRaw));
                        if (!validCnpj14(cnpj)) return null;

                        const nome = String(nomeRaw || "").trim() || undefined;
                        const cidade = String(cidadeRaw || "").trim() || undefined;

                        return { cnpj, nome, cidade };
                    })
                    .filter((x): x is RowOut => Boolean(x));
            } catch (e: any) {
            }
        }
    }

    if (!existsSync(extCsv)) {
        throw new Error(
            `Não foi possível acessar o arquivo Empresas.xlsx. Caminhos tentados:\n` +
            candidates.join("\n") +
            `\n(Como fallback, tente colocar um Empresas.csv em /public/).`
        );
    }

    const file = readCsvText(extCsv);

    const firstNonEmpty = file.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    const countComma = (firstNonEmpty.match(/,/g) || []).length;
    const countSemi = (firstNonEmpty.match(/;/g) || []).length;
    const delimiter: "," | ";" = countSemi > countComma ? ";" : ",";

    let records: Record<string, string>[] = [];
    try {
        records = parse<Record<string, string>>(file, {
            columns: (header: string[]) => header.map((h) => h.trim()),
            skip_empty_lines: true,
            bom: true,
            delimiter,
            relax_column_count: true,
            trim: true,
            quote: '"',
            escape: "\\",
        });
    } catch {
        records = parse<Record<string, string>>(file, {
            columns: (header: string[]) => header.map((h) => h.trim()),
            skip_empty_lines: true,
            bom: true,
            delimiter: delimiter === ";" ? "," : ";",
            relax_column_count: true,
            trim: true,
            quote: '"',
            escape: "\\",
        });
    }

    return records
        .map((r): RowOut | null => {
            const cnpjRaw =
                getField(
                    r,
                    ["CNPJ", "cnpj", "Cnpj", "CNPJ_ENTE", "CNPJ Ente", "CNPJ do Ente"],
                    "cnpj"
                ) ?? "";

            const nomeRaw =
                getField(
                    r,
                    [
                        "RAZAO_SOCIAL",
                        "Razao Social",
                        "Razão Social",
                        "NOME",
                        "Nome",
                        "Denominação",
                        "Nome Empresarial",
                        "NOME_EMPRESARIAL",
                        "Nome Fantasia",
                        "NOME_FANTASIA",
                        "EMPRESA",
                    ],
                    "nome"
                ) ?? "";

            const cidadeRaw =
                getField(
                    r,
                    ["Cidade Conveniada", "Cidade", "Município", "Municipio", "Município Conveniado"],
                    "cidade"
                ) ?? "";

            const cnpj = normalizeCnpj(String(cnpjRaw));
            if (!validCnpj14(cnpj)) return null;

            const nome = String(nomeRaw || "").trim() || undefined;
            const cidade = String(cidadeRaw || "").trim() || undefined;

            return { cnpj, nome, cidade };
        })
        .filter((x): x is RowOut => Boolean(x));
}

function intersectCommon(gov: RowOut[], base: RowOut[]) {
    const baseNameMap = new Map(base.map((b) => [b.cnpj, b.nome]));
    const baseCityMap = new Map(base.map((b) => [b.cnpj, b.cidade]));
    return gov
        .filter((g) => baseNameMap.has(g.cnpj))
        .map((g) => ({
            cnpj: g.cnpj,
            nome: g.nome || baseNameMap.get(g.cnpj) || undefined,
            nome_gov: g.nome,
            nome_base: baseNameMap.get(g.cnpj),
            cidade_base: baseCityMap.get(g.cnpj) || undefined,
        }));
}

function ensureManualInclusion(
    commons: Array<{
        cnpj: string;
        nome?: string;
        nome_gov?: string;
        nome_base?: string;
        cidade_base?: string;
    }>,
    gov: RowOut[],
    base: RowOut[]
) {
    const out = [...commons];
    const have = new Set(out.map((x) => x.cnpj));

    const govByCnpj = new Map(gov.map((g) => [g.cnpj, g]));
    const baseByCnpj = new Map(base.map((b) => [b.cnpj, b]));

    for (const item of MANUAL_INCLUDE) {
        let chosen: RowOut | undefined;

        if (item.cnpj) {
            chosen = baseByCnpj.get(normalizeCnpj(item.cnpj)) || govByCnpj.get(normalizeCnpj(item.cnpj));
        } else if (item.name) {
            const want = norm(item.name);
            const fromBase = findByNameLoose(base, want);
            const fromGov = findByNameLoose(gov, want);
            chosen = fromBase || fromGov;
        }

        if (!chosen) continue;
        if (have.has(chosen.cnpj)) continue;

        const baseMatch = baseByCnpj.get(chosen.cnpj);
        const govMatch = govByCnpj.get(chosen.cnpj);

        out.push({
            cnpj: chosen.cnpj,
            nome: govMatch?.nome || baseMatch?.nome || chosen.nome,
            nome_gov: govMatch?.nome,
            nome_base: baseMatch?.nome,
            cidade_base: baseMatch?.cidade,
        });
        have.add(chosen.cnpj);
    }

    return out;
}

function resolveManualCnpjs(
    gov: RowOut[],
    base: RowOut[],
    finalList: Array<{ cnpj: string; nome?: string }>
): Set<string> {
    const inFinal = new Set(finalList.map((x) => x.cnpj));
    const govByCnpj = new Map(gov.map((g) => [g.cnpj, g]));
    const baseByCnpj = new Map(base.map((b) => [b.cnpj, b]));

    const out = new Set<string>();

    for (const item of MANUAL_INCLUDE) {
        if (item.cnpj) {
            const cj = normalizeCnpj(item.cnpj);
            if (inFinal.has(cj)) out.add(cj);
            continue;
        }
        if (item.name) {
            const want = norm(item.name);
            const fromBase = findByNameLoose(base, want);
            const fromGov = findByNameLoose(gov, want);
            const pick =
                (fromBase && inFinal.has(fromBase.cnpj) && fromBase.cnpj) ||
                (fromGov && inFinal.has(fromGov.cnpj) && fromGov.cnpj) ||
                undefined;

            if (pick) out.add(pick);
            else {
                for (const x of finalList) {
                    if (x.nome) {
                        const n = norm(x.nome);
                        if (n === want || n.includes(want) || want.includes(n)) {
                            out.add(x.cnpj);
                        }
                    }
                }
            }
        }
    }

    return out;
}

type EmailLog = Record<string, { new?: boolean; none?: boolean }>;
const EMAIL_LOG_PATH = path.join(SNAPSHOT_DIR, "email-sent.json");

function loadEmailLog(): EmailLog {
    try {
        if (!existsSync(EMAIL_LOG_PATH)) return {};
        return JSON.parse(readFileSync(EMAIL_LOG_PATH, "utf8")) as EmailLog;
    } catch {
        return {};
    }
}
function saveEmailLog(log: EmailLog) {
    ensureDir(SNAPSHOT_DIR);
    writeFileSync(EMAIL_LOG_PATH, JSON.stringify(log, null, 2));
}
function wasEmailSent(dateStr: string, kind: "new" | "none"): boolean {
    const log = loadEmailLog();
    return !!log[dateStr]?.[kind];
}
function markEmailSent(dateStr: string, kind: "new" | "none") {
    const log = loadEmailLog();
    if (!log[dateStr]) log[dateStr] = {};
    log[dateStr][kind] = true;
    saveEmailLog(log);
}
/** ========================================================================== */

export async function GET(req: Request) {
    try {
        const [gov, base] = await Promise.all([getGovList(), Promise.resolve(getBaseListFromCSV())]);

        const commons = intersectCommon(gov, base);
        const finalList = ensureManualInclusion(commons, gov, base);

        const now = new Date();
        const todayStr = ymd(now);
        const yesterdayStr = ymd(new Date(now.getTime() - 24 * 60 * 60 * 1000));

        const yesterdaySet = loadSnapshotSet(yesterdayStr);
        const hadYesterday = yesterdaySet.size > 0;

        const manualSet = resolveManualCnpjs(gov, base, finalList);

        const emailNewSet = new Set<string>([
            ...(hadYesterday
                ? finalList.filter((x) => !yesterdaySet.has(x.cnpj)).map((x) => x.cnpj)
                : []),
            ...Array.from(manualSet),
        ]);

        const uiNewSet = new Set<string>([
            ...(hadYesterday
                ? finalList.filter((x) => !yesterdaySet.has(x.cnpj)).map((x) => x.cnpj)
                : []),
            ...Array.from(manualSet),
        ]);

        const finalWithFlags = finalList.map((x) => ({
            ...x,
            isNewToday: uiNewSet.has(x.cnpj),
        }));

        const already = new Set(finalWithFlags.map((x) => x.cnpj));
        const baseOnly = base
            .filter((b) => !already.has(b.cnpj))
            .map((b) => ({
                cnpj: b.cnpj,
                nome: b.nome,
                nome_gov: undefined as string | undefined,
                nome_base: b.nome,
                cidade_base: b.cidade,
                isNewToday: false,
            }));

        const finalUiList = [...finalWithFlags, ...baseOnly];

        saveSnapshot(todayStr, finalList);

        const url = new URL(req.url);
        const toParam = url.searchParams.get("to");
        const fallbackTo = toParam && toParam.trim().length > 0 ? toParam : (process.env.MAIL_TO || "");

        const mailToNew = process.env.MAIL_TO_NEW || fallbackTo;
        const mailToDaily = process.env.MAIL_TO_DAILY || fallbackTo;

        const newOnesToday = finalWithFlags
            .filter((x) => emailNewSet.has(x.cnpj))
            .map((x) => ({ cnpj: x.cnpj, nome: x.nome, cidade_base: (x as any).cidade_base }));

        const emailSubject =
            newOnesToday.length > 0 ? `Novas empresas hoje (${newOnesToday.length})` : "Sem empresas novas hoje";

        let emailActuallySentTo: string | null = null;
        let emailSkippedByDailyLock = false;

        if (EMAIL_ENABLED) {
            if (newOnesToday.length > 0 && mailToNew) {
                if (!wasEmailSent(todayStr, "new")) {
                    await sendNewCompaniesEmailGraph({
                        to: mailToNew,
                        totalGov: gov.length,
                        totalBase: base.length,
                        newOnes: newOnesToday,
                        subject: emailSubject,
                    });
                    markEmailSent(todayStr, "new");
                    emailActuallySentTo = mailToNew;
                } else {
                    emailSkippedByDailyLock = true;
                }
            } else if (mailToDaily) {
                if (!wasEmailSent(todayStr, "none")) {
                    await sendNewCompaniesEmailGraph({
                        to: mailToDaily,
                        totalGov: gov.length,
                        totalBase: base.length,
                        newOnes: [],
                        subject: "Sem empresas novas hoje",
                        noNewText: "sem empresas novas hoje",
                    });
                    markEmailSent(todayStr, "none");
                    emailActuallySentTo = mailToDaily;
                } else {
                    emailSkippedByDailyLock = true;
                }
            }
        }

        return NextResponse.json({
            ok: true,
            total_gov: gov.length,
            total_base: base.length,
            empresas_em_comum: finalList.length,
            new_today_count: uiNewSet.size,
            common_companies: finalUiList,
            preview: finalUiList.slice(0, 20),
            snapshot_dir: SNAPSHOT_DIR,
            today: todayStr,
            yesterday: yesterdayStr,
            had_yesterday: hadYesterday,
            manual_highlighted_today: false,
            email_sent_to: EMAIL_ENABLED ? emailActuallySentTo : null,
            email_skipped_daily_lock: EMAIL_ENABLED ? emailSkippedByDailyLock : false,
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
}
