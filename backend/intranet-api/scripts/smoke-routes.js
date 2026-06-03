/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const BASE_URL = (process.env.SMOKE_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const TOKEN = String(process.env.SMOKE_AUTH_TOKEN || "").trim();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const REPORT_DIR = path.resolve(
  __dirname,
  "..",
  process.env.SMOKE_REPORT_DIR || "reports/smoke"
);

const ROUTES_FILE = path.resolve(__dirname, "..", "src", "routes", "routes.ts");

const DANGEROUS_PATTERNS = [
  /notificacao/i,
  /\/executar/i,
  /\/download/i,
  /\/alertas\/email/i,
  /\/sincronizar/i,
  /\/saida-manual/i,
  /\/resposta-manual/i,
  /\/email_/i,
  /\/email-informativo/i,
  /\/juntar-pdf/i,
];

function isDangerousRoute(routePath) {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(routePath));
}

function parseRoutesFile(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];

  for (const line of lines) {
    const m = line.match(/routes\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/i);
    if (!m) continue;
    entries.push({
      method: m[1].toUpperCase(),
      routePath: m[2],
    });
  }

  return entries;
}

function shouldSkip(route) {
  if (route.method !== "GET") return "Método não GET (smoke seguro testa apenas GET).";
  if (route.routePath.includes(":")) return "Rota com parâmetro dinâmico.";
  if (isDangerousRoute(route.routePath)) return "Rota potencialmente destrutiva/acionadora.";
  return null;
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function writeReport(payload) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = nowStamp();
  const baseName = `smoke-routes-${stamp}`;
  const jsonPath = path.join(REPORT_DIR, `${baseName}.json`);
  const txtPath = path.join(REPORT_DIR, `${baseName}.txt`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const lines = [];
  lines.push("[SMOKE][RESUMO]");
  lines.push(`Base URL: ${payload.baseUrl}`);
  lines.push(`Executado em: ${payload.executedAt}`);
  lines.push(`Rotas encontradas: ${payload.totalRoutesFound}`);
  lines.push(`Testadas: ${payload.summary.tested}`);
  lines.push(`OK: ${payload.summary.passed}`);
  lines.push(`Falhas: ${payload.summary.failed}`);
  lines.push(`Puladas: ${payload.summary.skipped}`);
  lines.push("");
  lines.push("[SMOKE][DETALHES]");
  for (const r of payload.results) {
    const reasonPart = r.reason ? ` | ${r.reason}` : "";
    const statusPart = r.httpStatus ? ` | http=${r.httpStatus}` : "";
    const errorPart = r.error ? ` | error=${r.error}` : "";
    lines.push(`${r.outcome} | ${r.method} ${r.routePath}${statusPart}${reasonPart}${errorPart}`);
  }

  fs.writeFileSync(txtPath, lines.join("\n"), "utf8");
  return { jsonPath, txtPath };
}

async function run() {
  if (!fs.existsSync(ROUTES_FILE)) {
    console.error(`[SMOKE] Arquivo de rotas não encontrado: ${ROUTES_FILE}`);
    process.exit(2);
  }

  const content = fs.readFileSync(ROUTES_FILE, "utf8");
  const parsed = parseRoutesFile(content);

  const unique = new Map();
  for (const item of parsed) {
    unique.set(`${item.method} ${item.routePath}`, item);
  }
  const routes = Array.from(unique.values());

  const headers = { Accept: "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const results = [];

  try {
    await fetchWithTimeout(`${BASE_URL}/`, { method: "GET", headers });
  } catch (error) {
    const payload = {
      baseUrl: BASE_URL,
      executedAt: new Date().toISOString(),
      totalRoutesFound: routes.length,
      summary: {
        tested: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
      },
      results: [
        {
          outcome: "FAIL",
          method: "GET",
          routePath: "/",
          error: "API indisponivel para conexao inicial",
          reason: "Suba a API antes de rodar o smoke test",
        },
      ],
    };
    const reportPaths = writeReport(payload);
    console.error(
      `[SMOKE] Não foi possível conectar em ${BASE_URL}. Suba a API antes de rodar o teste.`
    );
    console.error("[SMOKE] Exemplo: npm run dev");
    console.error(`[SMOKE] Relatório JSON: ${reportPaths.jsonPath}`);
    console.error(`[SMOKE] Relatório TXT : ${reportPaths.txtPath}`);
    process.exit(2);
  }

  let tested = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const failures = [];

  console.log(`[SMOKE] Base URL: ${BASE_URL}`);
  console.log(`[SMOKE] Rotas encontradas: ${routes.length}`);

  for (const route of routes) {
    const skipReason = shouldSkip(route);
    const signature = `${route.method} ${route.routePath}`;

    if (skipReason) {
      skipped++;
      results.push({
        outcome: "SKIP",
        method: route.method,
        routePath: route.routePath,
        reason: skipReason,
      });
      console.log(`- [SKIP] ${signature} -> ${skipReason}`);
      continue;
    }

    tested++;
    const url = `${BASE_URL}${route.routePath}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: route.method,
        headers,
      });

      // Critério de smoke:
      // - 2xx/3xx: OK
      // - 401/403/404: aceitável para validar existência/segurança
      // - 5xx: falha
      const ok =
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429;

      if (ok) {
        passed++;
        results.push({
          outcome: "OK",
          method: route.method,
          routePath: route.routePath,
          httpStatus: response.status,
        });
        console.log(`- [OK]   ${signature} -> ${response.status}`);
      } else {
        failed++;
        failures.push(`${signature} -> ${response.status}`);
        results.push({
          outcome: "FAIL",
          method: route.method,
          routePath: route.routePath,
          httpStatus: response.status,
        });
        console.log(`- [FAIL] ${signature} -> ${response.status}`);
      }
    } catch (error) {
      failed++;
      const msg = error && error.name === "AbortError" ? "timeout" : String(error.message || error);
      failures.push(`${signature} -> ${msg}`);
      results.push({
        outcome: "FAIL",
        method: route.method,
        routePath: route.routePath,
        error: msg,
      });
      console.log(`- [FAIL] ${signature} -> ${msg}`);
    }
  }

  console.log("\n[SMOKE][RESUMO]");
  console.log(`- Testadas: ${tested}`);
  console.log(`- OK: ${passed}`);
  console.log(`- Falhas: ${failed}`);
  console.log(`- Puladas: ${skipped}`);

  if (failures.length) {
    console.log("\n[SMOKE][FALHAS]");
    for (const item of failures) {
      console.log(`- ${item}`);
    }
  }

  const payload = {
    baseUrl: BASE_URL,
    executedAt: new Date().toISOString(),
    totalRoutesFound: routes.length,
    summary: {
      tested,
      passed,
      failed,
      skipped,
    },
    results,
  };

  const reportPaths = writeReport(payload);
  console.log(`\n[SMOKE] Relatório JSON: ${reportPaths.jsonPath}`);
  console.log(`[SMOKE] Relatório TXT : ${reportPaths.txtPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("[SMOKE] Erro inesperado:", err);
  process.exit(1);
});
