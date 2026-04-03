"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaFilePdf, FaPlus, FaSave, FaSearch, FaTrash } from "react-icons/fa";
import { buscarFuncionarioPorCpf } from "@/services/associado.service";
import {
    criarResgateCapital,
    type EmprestimoInput,
    type ParcelaInput,
    type ResgateCapitalCreatePayload,
} from "@/services/resgate_capital.service";
import { fmtBRL, formatCpfView, monetizarDigitacao, parseBRL } from "@/utils/br";
import { gerarPdfResgateCapital } from "@/lib/pdf/gerarPdfResgateCapital";
import { CidadeCressemSelect } from "@/components/cidades-cressem-select/cidades-cressem-select";
import { AtendenteInput } from "@/components/atendente-input/atendente-input";
import { listarMotivosResgate } from "@/services/motivo-resgate.service";
import { listarAutorizacaoResgate } from "@/services/autorizacao-resgate.service";


type EmprestimoRow = {
    tipo: string;
    contrato: string;
    saldoDevedor: string;
    saldoAmortizado: string;
};

type ParcelaRow = {
    dataParcela: string;
    valor: string;
};

function hojeIso() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function onlyDigits(v: string) {
    return (v || "").replace(/\D/g, "");
}

const emptyEmprestimo: EmprestimoRow = {
    tipo: "",
    contrato: "",
    saldoDevedor: "",
    saldoAmortizado: "",
};

const emptyParcela: ParcelaRow = {
    dataParcela: "",
    valor: "",
};

const LIMITS = {
    cpfCnpj: 14,
    nome: 100,
    matricula: 30,
    empresa: 150,
    emprestimoTipo: 60,
    emprestimoContrato: 15,
    contaNumero: 20,
    cartaoNumero: 20,
    banco: 4,
    agencia: 7,
    contaDeposito: 20,
};

export function ResgateCapitalForm() {
    const erroTopoRef = useRef<HTMLDivElement | null>(null);
    const [cpfCnpj, setCpfCnpj] = useState("");
    const [nome, setNome] = useState("");
    const [matricula, setMatricula] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [cidade, setCidade] = useState("");
    const [motivo, setMotivo] = useState("");
    const [motivos, setMotivos] = useState<Array<{ value: string; label: string }>>([]);
    const [loadingMotivos, setLoadingMotivos] = useState(false);
    const [erroMotivos, setErroMotivos] = useState("");

    const [autorizado, setAutorizado] = useState("");
    const [autorizados, setAutorizados] = useState<Array<{ value: string; label: string }>>([]);
    const [loadingAutorizados, setLoadingAutorizados] = useState(false);
    const [erroAutorizados, setErroAutorizados] = useState("");


    const [atendente, setAtendente] = useState("");
    const [dtResgate, setDtResgate] = useState(hojeIso());

    const [capitalAtual, setCapitalAtual] = useState("");
    const [emprestimos, setEmprestimos] = useState<EmprestimoRow[]>([]);


    const [contaNumero, setContaNumero] = useState("");
    const [contaSaldoDevedor, setContaSaldoDevedor] = useState("");

    const [contaAmortizado, setContaAmortizado] = useState("");


    const [cartaoNumero, setCartaoNumero] = useState("");
    const [cartaoSaldoDevedor, setCartaoSaldoDevedor] = useState("");
    const [cartaoAmortizado, setCartaoAmortizado] = useState("");

    const [temEmprestimos, setTemEmprestimos] = useState<"sim" | "nao">("nao");
    const [temContaCorrente, setTemContaCorrente] = useState<"sim" | "nao">("nao");
    const [temCartao, setTemCartao] = useState<"sim" | "nao">("nao");
    const [temDeposito, setTemDeposito] = useState<"sim" | "nao">("nao");

    const [banco, setBanco] = useState("");
    const [agencia, setAgencia] = useState("");
    const [contaDeposito, setContaDeposito] = useState("");
    const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);

    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");
    const [idResgateCriado, setIdResgateCriado] = useState<number | null>(null);
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");

    const [primeiraParcelaValor, setPrimeiraParcelaValor] = useState("");
    const [primeiraParcelaData, setPrimeiraParcelaData] = useState("");

    const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});

    function irParaTopo() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    useEffect(() => {
        if (!erro) return;
        const t = setTimeout(() => {
            if (erroTopoRef.current) {
                erroTopoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        }, 0);
        return () => clearTimeout(t);
    }, [erro]);



    const totalEmprestimos = useMemo(
        () => (temEmprestimos === "sim"
            ? emprestimos.reduce((acc, e) => acc + parseBRL(e.saldoAmortizado), 0)
            : 0),
        [temEmprestimos, emprestimos]
    );

    const totalConta = useMemo(
        () => (temContaCorrente === "sim" ? parseBRL(contaAmortizado) : 0),
        [temContaCorrente, contaAmortizado]
    );

    const totalCartao = useMemo(
        () => (temCartao === "sim" ? parseBRL(cartaoAmortizado) : 0),
        [temCartao, cartaoAmortizado]
    );

    const totalParcelas = useMemo(
        () => (temDeposito === "sim"
            ? parcelas.reduce((acc, p) => acc + parseBRL(p.valor), 0)
            : 0),
        [temDeposito, parcelas]
    );

    const totalAmortizacao = totalEmprestimos + totalConta + totalCartao + totalParcelas;
    const saldoRestante = Math.max(parseBRL(capitalAtual) - totalAmortizacao, 0);
    const payloadSnapshot = useMemo(() => {
        const emprestimosPayload = emprestimos
            .filter((e) => parseBRL(e.saldoAmortizado) > 0)
            .map((e) => ({
                DESC_TIPO: e.tipo || undefined,
                NR_CONTRATO: e.contrato || undefined,
                VL_SALDO_DEVEDOR: parseBRL(e.saldoDevedor),
                VL_SALDO_AMORTIZADO: parseBRL(e.saldoAmortizado),
            }));

        const parcelasPayload = parcelas
            .filter((p) => p.dataParcela && parseBRL(p.valor) > 0)
            .map((p) => ({
                DT_PARCELA: p.dataParcela,
                VL_PARCELA_RESGATE: parseBRL(p.valor),
                SN_PAGO: 0,
            }));

        const snapshot: ResgateCapitalCreatePayload = {
            resgate: {
                NR_CPF_CNPJ: onlyDigits(cpfCnpj),
                NM_CLIENTE: nome.trim(),
                CD_MATRICULA: matricula || undefined,
                NM_EMPRESA: empresa || undefined,
                VL_CAPITAL_ATUAL: parseBRL(capitalAtual),
                VL_CAPITAL_AMORTIZACAO: totalAmortizacao,
                VL_SALDO_RESTANTE: saldoRestante,
                DESC_MOTIVO: motivo || undefined,
                NM_AUTORIZADO: autorizado || undefined,
                DT_CARENCIA: dtResgate,
                DT_RESGATE_PARCIAL_CAPITAL: dtResgate,
                NM_ATENDENTE: atendente.trim(),
                NM_CIDADE: cidade || undefined,
            },
            emprestimos: emprestimosPayload,
        };

        if (temContaCorrente === "sim" && parseBRL(contaAmortizado) > 0) {
            snapshot.contaCorrente = {
                NR_CONTA: contaNumero || undefined,
                VL_SALDO_DEVEDOR: parseBRL(contaSaldoDevedor),
                VL_SALDO_AMORTIZADO: parseBRL(contaAmortizado),
            };
        }

        if (temCartao === "sim" && parseBRL(cartaoAmortizado) > 0) {
            snapshot.cartao = {
                NR_CARTAO: cartaoNumero || undefined,
                VL_SALDO_DEVEDOR: parseBRL(cartaoSaldoDevedor),
                VL_SALDO_AMORTIZADO: parseBRL(cartaoAmortizado),
            };
        }

        if (temDeposito === "sim" && parcelasPayload.length > 0) {
            snapshot.deposito = {
                CD_BANCO: banco || undefined,
                CD_AGENCIA: agencia || undefined,
                CD_CONTA_CORRENTE: contaDeposito || undefined,
                parcelas: parcelasPayload,
            };
        }

        return JSON.stringify(snapshot);
    }, [
        cpfCnpj,
        nome,
        matricula,
        empresa,
        cidade,
        motivo,
        autorizado,
        atendente,
        dtResgate,
        capitalAtual,
        emprestimos,
        contaNumero,
        contaSaldoDevedor,
        contaAmortizado,
        cartaoNumero,
        cartaoSaldoDevedor,
        cartaoAmortizado,
        temContaCorrente,
        temCartao,
        temDeposito,
        banco,
        agencia,
        contaDeposito,
        parcelas,
        totalAmortizacao,
        saldoRestante,
    ]);
    const bloqueadoParaImprimir = !idResgateCriado || payloadSnapshot !== lastSavedSnapshot;


    function toISODate(d: Date) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    function addMonthsKeepDay(baseIso: string, months: number) {
        const [y, m, d] = baseIso.split("-").map(Number);
        const targetMonth = m - 1 + months;
        const dt = new Date(y, targetMonth, d);

        // Ajuste para meses com menos dias
        while (dt.getMonth() !== ((targetMonth % 12) + 12) % 12) {
            dt.setDate(dt.getDate() - 1);
        }
        return dt;
    }

    function proximoDiaUtil(date: Date) {
        const dt = new Date(date);
        while (dt.getDay() === 0 || dt.getDay() === 6) {
            dt.setDate(dt.getDate() + 1);
        }
        return dt;
    }



    async function buscarAssociadoPorCpf() {
        const clean = onlyDigits(cpfCnpj);
        if (clean.length !== 11) {
            setErro("Informe um CPF valido com 11 digitos.");
            setInfo("");
            irParaTopo();
            return;
        }

        setLoading(true);
        setErro("");
        setInfo("");

        try {
            const resp = await buscarFuncionarioPorCpf(clean);

            if (!resp.found) {
                setInfo("Associado nao encontrado. Preencha os dados manualmente.");
                return;
            }

            setNome(resp.nome || "");
            setMatricula(resp.matricula || "");
            setEmpresa(resp.empresa || "");

            const slContaCapital = Number(resp.saldo_capital ?? 0); // ou resp.SL_CONTA_CAPITAL, conforme seu service
            setCapitalAtual(slContaCapital > 0 ? fmtBRL(slContaCapital) : "");

            setInfo("Dados do associado carregados.");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Falha ao buscar associado.";
            setErro(message);
            irParaTopo();
        } finally {
            setLoading(false);
        }
    }


    function validarParaSalvar() {
        const novosErros: Record<string, string> = {};

        if (!onlyDigits(cpfCnpj)) novosErros.cpfCnpj = "Informe CPF/CNPJ.";
        if (!nome.trim()) novosErros.nome = "Informe o nome do associado.";
        if (!cidade.trim()) novosErros.cidade = "Selecione a cidade.";
        if (!motivo.trim()) novosErros.motivo = "Selecione o motivo.";
        if (!autorizado.trim()) novosErros.autorizado = "Selecione quem autorizou.";
        if (!atendente.trim()) novosErros.atendente = "Atendente obrigatorio.";
        if (!dtResgate) novosErros.dtResgate = "Informe a data do resgate.";
        if (parseBRL(capitalAtual) <= 0) novosErros.capitalAtual = "Capital atual deve ser maior que zero.";
        if (totalAmortizacao <= 0) novosErros.totalAmortizacao = "Informe ao menos uma amortizacao ou deposito.";
        if (temEmprestimos === "sim" && emprestimos.length === 0) novosErros.emprestimos = "Adicione ao menos um emprestimo ou marque 'Nao'.";
        if (temContaCorrente === "sim" && !contaNumero.trim()) novosErros.contaNumero = "Informe o numero da conta.";
        if (temContaCorrente === "sim" && parseBRL(contaAmortizado) <= 0) novosErros.contaAmortizado = "Informe o amortizado da conta corrente.";
        if (temCartao === "sim" && !cartaoNumero.trim()) novosErros.cartaoNumero = "Informe o numero do cartao.";
        if (temCartao === "sim" && parseBRL(cartaoAmortizado) <= 0) novosErros.cartaoAmortizado = "Informe o amortizado do cartao.";

        if (temDeposito === "sim") {
            if (!primeiraParcelaData) novosErros.primeiraParcelaData = "Informe a data da 1a parcela.";
            if (parseBRL(primeiraParcelaValor) <= 0) novosErros.primeiraParcelaValor = "Informe o valor da 1a parcela.";
            if (!banco.trim()) novosErros.banco = "Informe o banco.";
            if (!agencia.trim()) novosErros.agencia = "Informe a agencia.";
            if (!contaDeposito.trim()) novosErros.contaDeposito = "Informe a conta.";
            if (parcelas.length === 0) novosErros.parcelas = "Adicione ao menos uma parcela.";
        }

        setErrosCampo(novosErros);
        return Object.keys(novosErros).length === 0;
    }

    function addEmprestimo() {
        setEmprestimos((prev) => [...prev, { ...emptyEmprestimo }]);
    }

    function removeEmprestimo(index: number) {
        setEmprestimos((prev) => prev.filter((_, i) => i !== index));
    }

    function updateEmprestimo(index: number, field: keyof EmprestimoRow, value: string) {
        setEmprestimos((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    }

    function recalcularParcelas(qtd: number) {
        // Ajuste aqui se quiser usar outra base total
        const valorTotalParaDistribuir = parseBRL(capitalAtual);

        const primeira = parseBRL(primeiraParcelaValor);
        if (!primeiraParcelaData || primeira <= 0 || qtd <= 0 || valorTotalParaDistribuir <= 0) {
            setParcelas([]);
            return;
        }

        const primeiraParcela = Math.min(primeira, valorTotalParaDistribuir);
        const restante = Math.max(valorTotalParaDistribuir - primeiraParcela, 0);

        const novas: ParcelaRow[] = [];

        // Parcela 1
        const dt1 = proximoDiaUtil(addMonthsKeepDay(primeiraParcelaData, 0));
        novas.push({
            dataParcela: toISODate(dt1),
            valor: fmtBRL(primeiraParcela),
        });

        // Demais
        if (qtd > 1) {
            const qtdRestante = qtd - 1;
            const totalCentavos = Math.round(restante * 100);
            const baseCentavos = Math.floor(totalCentavos / qtdRestante);
            let acumulado = 0;

            for (let i = 1; i <= qtdRestante; i++) {
                let centavos = baseCentavos;
                if (i === qtdRestante) centavos = totalCentavos - acumulado;
                acumulado += centavos;

                const valor = centavos / 100;
                const dt = proximoDiaUtil(addMonthsKeepDay(primeiraParcelaData, i));

                novas.push({
                    dataParcela: toISODate(dt),
                    valor: fmtBRL(valor),
                });
            }
        }

        setParcelas(novas);
    }

    function addParcela() {
        if (!primeiraParcelaData || parseBRL(primeiraParcelaValor) <= 0) {
            setErro("Informe data e valor da 1ª parcela antes de adicionar.");
            irParaTopo();
            return;
        }
        setErro("");
        recalcularParcelas(parcelas.length + 1);
    }

    function removeParcela(_index: number) {
        const novaQtd = Math.max(parcelas.length - 1, 0);
        recalcularParcelas(novaQtd);
    }


    function buildPayload(): ResgateCapitalCreatePayload {
        const emprestimosPayload: EmprestimoInput[] = emprestimos
            .filter((e) => parseBRL(e.saldoAmortizado) > 0)
            .map((e) => ({
                DESC_TIPO: e.tipo || undefined,
                NR_CONTRATO: e.contrato || undefined,
                VL_SALDO_DEVEDOR: parseBRL(e.saldoDevedor),
                VL_SALDO_AMORTIZADO: parseBRL(e.saldoAmortizado),
            }));

        const parcelasPayload: ParcelaInput[] = parcelas
            .filter((p) => p.dataParcela && parseBRL(p.valor) > 0)
            .map((p) => ({
                DT_PARCELA: p.dataParcela,
                VL_PARCELA_RESGATE: parseBRL(p.valor),
                SN_PAGO: 0,
            }));

        const payload: ResgateCapitalCreatePayload = {
            resgate: {
                NR_CPF_CNPJ: onlyDigits(cpfCnpj),
                NM_CLIENTE: nome.trim(),
                CD_MATRICULA: matricula || undefined,
                NM_EMPRESA: empresa || undefined,
                VL_CAPITAL_ATUAL: parseBRL(capitalAtual),
                VL_CAPITAL_AMORTIZACAO: totalAmortizacao,
                VL_SALDO_RESTANTE: saldoRestante,
                DESC_MOTIVO: motivo || undefined,
                NM_AUTORIZADO: autorizado || undefined,
                DT_CARENCIA: dtResgate,
                DT_RESGATE_PARCIAL_CAPITAL: dtResgate,
                NM_ATENDENTE: atendente.trim(),
                NM_CIDADE: cidade || undefined,
            },
            emprestimos: emprestimosPayload,
        };

        if (temContaCorrente === "sim" && parseBRL(contaAmortizado) > 0) {
            payload.contaCorrente = {
                NR_CONTA: contaNumero || undefined,
                VL_SALDO_DEVEDOR: parseBRL(contaSaldoDevedor),
                VL_SALDO_AMORTIZADO: parseBRL(contaAmortizado),
            };
        }

        if (temCartao === "sim" && parseBRL(cartaoAmortizado) > 0) {
            payload.cartao = {
                NR_CARTAO: cartaoNumero || undefined,
                VL_SALDO_DEVEDOR: parseBRL(cartaoSaldoDevedor),
                VL_SALDO_AMORTIZADO: parseBRL(cartaoAmortizado),
            };
        }

        if (temDeposito === "sim" && parcelasPayload.length > 0) {
            payload.deposito = {
                CD_BANCO: banco || undefined,
                CD_AGENCIA: agencia || undefined,
                CD_CONTA_CORRENTE: contaDeposito || undefined,
                parcelas: parcelasPayload,
            };
        }

        return payload;
    }

    async function onSalvar() {
        const ok = validarParaSalvar();
        if (!ok) {
            setErro("Corrija os campos destacados no formulario.");
            setInfo("");
            irParaTopo();
            return;
        }

        setErro("");
        setInfo("");
        setLoading(true);

        try {
            const payload = buildPayload();
            const res = await criarResgateCapital(payload);
            setIdResgateCriado(res.idResgate);
            setLastSavedSnapshot(payloadSnapshot);
            setInfo("Resgate salvo com sucesso.");
            setErrosCampo({});
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Falha ao salvar resgate.";
            setErro(message);
            irParaTopo();
        } finally {
            setLoading(false);
        }
    }

    function onImprimir() {
        if (bloqueadoParaImprimir) {
            setErro("Voce alterou o formulario. Salve novamente para liberar a impressao.");
            setInfo("");
            irParaTopo();
            return;
        }
        gerarPdfResgateCapital({
            nome,
            cpfCnpj,
            matricula,
            empresa,
            cidade,
            atendente,
            dataResgate: dtResgate,
            motivo,
            autorizado,
            capitalAtual: parseBRL(capitalAtual),
            totalAmortizacao,
            saldoRestante,
            contaCorrente: temContaCorrente === "sim"
                ? {
                    numero: contaNumero,
                    saldoDevedor: parseBRL(contaSaldoDevedor),
                    amortizado: parseBRL(contaAmortizado),
                }
                : undefined,
            cartao: temCartao === "sim"
                ? {
                    numero: cartaoNumero,
                    saldoDevedor: parseBRL(cartaoSaldoDevedor),
                    amortizado: parseBRL(cartaoAmortizado),
                }
                : undefined,
            emprestimos: emprestimos.map((e) => ({
                tipo: e.tipo,
                contrato: e.contrato,
                saldoDevedor: parseBRL(e.saldoDevedor),
                saldoAmortizado: parseBRL(e.saldoAmortizado),
            })),
            deposito: temDeposito === "sim"
                ? {
                    banco,
                    agencia,
                    contaCorrente: contaDeposito,
                    parcelas: parcelas.map((p) => ({
                        dataParcela: p.dataParcela,
                        valor: parseBRL(p.valor),
                    })),
                }
                : undefined,
        });
    }

    // 3) EFFECT DE MOTIVOS (substituir o seu)
    useEffect(() => {
        async function carregarMotivos() {
            setLoadingMotivos(true);
            setErroMotivos("");

            try {
                const data = await listarMotivosResgate();
                setMotivos(data);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Erro ao carregar motivos.";
                setErroMotivos(message);
            } finally {
                setLoadingMotivos(false);
            }
        }

        carregarMotivos();
    }, []);


    useEffect(() => {
        async function carregarAutorizacao() {
            setLoadingAutorizados(true);
            setErroAutorizados("");

            try {
                const data = await listarAutorizacaoResgate();
                setAutorizados(data);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Erro ao carregar Autorizacao.";
                setErroAutorizados(message);
            } finally {
                setLoadingAutorizados(false);
            }
        }

        carregarAutorizacao();
    }, []);

    useEffect(() => {
        if (temDeposito === "sim" && parcelas.length > 0) {
            recalcularParcelas(parcelas.length);
        }
    }, [capitalAtual, primeiraParcelaValor, primeiraParcelaData, temDeposito]);



    return (
        <div className="min-w-0 mx-auto p-6 bg-white rounded-xl shadow">
            {erro && (
                <div ref={erroTopoRef} className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {erro}
                </div>
            )}
            {info && !erro && (
                <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {info}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF/CNPJ</label>
                    <input
                        value={formatCpfView(cpfCnpj)}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        data-field="cpfCnpj"
                        maxLength={LIMITS.cpfCnpj}
                        className={`w-full border px-3 py-2 rounded ${errosCampo.cpfCnpj ? "border-red-500" : ""}`}
                        placeholder="000.000.000-00"
                    />
                    <p className={`mt-1 text-xs min-h-4 ${errosCampo.cpfCnpj ? "text-red-600" : "text-transparent"}`}>
                        {errosCampo.cpfCnpj || "."}
                    </p>
                </div>
                <div className="md:col-span-2 flex items-start pt-6">
                    <button
                        type="button"
                        onClick={buscarAssociadoPorCpf}
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center gap-2 bg-secondary text-white font-semibold px-4 py-2 rounded hover:bg-primary disabled:opacity-60"
                    >
                        <FaSearch /> Buscar
                    </button>
                </div>
                <div className="md:col-span-7">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input data-field="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={LIMITS.nome} className={`w-full border px-3 py-2 rounded ${errosCampo.nome ? "border-red-500" : ""}`} />
                    {errosCampo.nome && <p className="mt-1 text-xs text-red-600">{errosCampo.nome}</p>}
                </div>

                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Matricula</label>
                    <input value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={LIMITS.matricula} className="w-full border px-3 py-2 rounded" />
                </div>
                <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
                    <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={LIMITS.empresa} className="w-full border px-3 py-2 rounded" />
                </div>

                <div data-field="atendente" className="md:col-span-5">
                    <AtendenteInput value={atendente} onChange={setAtendente} />
                    {errosCampo.atendente && <p className="mt-1 text-xs text-red-600">{errosCampo.atendente}</p>}
                </div>

                <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
                    <select
                        data-field="motivo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        disabled={loadingMotivos}
                        className={`w-full h-[42px] border px-3 rounded bg-white disabled:bg-gray-100 ${errosCampo.motivo ? "border-red-500" : ""}`}
                    >
                        <option value="">
                            {loadingMotivos ? "Carregando motivos..." : "Selecione"}
                        </option>
                        {motivos.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    {errosCampo.motivo && <p className="mt-1 text-xs text-red-600">{errosCampo.motivo}</p>}
                    {erroMotivos && <p className="mt-1 text-xs text-red-600">{erroMotivos}</p>}
                </div>

                <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Autorizado por</label>
                    <select
                        data-field="autorizado"
                        value={autorizado}
                        onChange={(e) => setAutorizado(e.target.value)}
                        disabled={loadingAutorizados}
                        className={`w-full h-[42px] border px-3 rounded bg-white disabled:bg-gray-100 ${errosCampo.autorizado ? "border-red-500" : ""}`}
                    >
                        <option value="">
                            {loadingAutorizados ? "Carregando autorizados..." : "Selecione"}
                        </option>
                        {autorizados.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    {errosCampo.autorizado && <p className="mt-1 text-xs text-red-600">{errosCampo.autorizado}</p>}
                    {erroAutorizados && <p className="mt-1 text-xs text-red-600">{erroAutorizados}</p>}
                </div>

                <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data Resgate</label>
                    <input data-field="dtResgate" type="date" value={dtResgate} disabled className={`w-full border px-3 py-2 rounded bg-gray-50 cursor-not-allowed ${errosCampo.dtResgate ? "border-red-500" : ""}`} />
                    {errosCampo.dtResgate && <p className="mt-1 text-xs text-red-600">{errosCampo.dtResgate}</p>}
                </div>

                <div className="md:col-span-3" data-field="cidade">
                    <CidadeCressemSelect value={cidade} onChange={setCidade} required />
                    {errosCampo.cidade && <p className="mt-1 text-xs text-red-600">{errosCampo.cidade}</p>}
                </div>

                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Capital Atual</label>
                    <input
                        data-field="capitalAtual"
                        value={capitalAtual}
                        onChange={(e) => setCapitalAtual(monetizarDigitacao(e.target.value))}
                        className={`w-full border px-3 py-2 rounded ${errosCampo.capitalAtual ? "border-red-500" : ""}`}
                        placeholder="R$ 0,00"
                    />
                    {errosCampo.capitalAtual && <p className="mt-1 text-xs text-red-600">{errosCampo.capitalAtual}</p>}
                </div>
                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Total Amortizacao</label>
                    <input data-field="totalAmortizacao" value={fmtBRL(totalAmortizacao)} readOnly className="w-full border px-3 py-2 rounded bg-gray-50 text-right" />
                    {errosCampo.totalAmortizacao && <p className="mt-1 text-xs text-red-600">{errosCampo.totalAmortizacao}</p>}
                </div>
                <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Saldo Restante</label>
                    <input value={fmtBRL(saldoRestante)} readOnly className="w-full border px-3 py-2 rounded bg-gray-50 text-right" />
                </div>
            </div>

            <div className="mt-6 border-t pt-5">
                <p className="text-sm font-semibold text-gray-800">Possui emprestimos para quitar?</p>
                <div className="mt-2 flex gap-6">
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            checked={temEmprestimos === "sim"}
                            onChange={() => setTemEmprestimos("sim")}
                        />
                        Sim
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            checked={temEmprestimos === "nao"}
                            onChange={() => {
                                setTemEmprestimos("nao");
                                setEmprestimos([]);
                            }}
                        />
                        Nao
                    </label>
                </div>

                {temEmprestimos === "sim" && (
                    <>
                        <div className="mt-3 mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-800">Emprestimos para quitar</h3>
                            <button type="button" onClick={addEmprestimo} className="inline-flex items-center gap-2 border px-3 py-1.5 rounded hover:bg-gray-50">
                                <FaPlus /> Adicionar emprestimo
                            </button>
                        </div>

                        {emprestimos.length === 0 && <p className="text-sm text-gray-500">Nenhum emprestimo adicionado.</p>}

                        <div className="space-y-2">
                            {emprestimos.map((row, i) => (
                                <div key={`emp-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                    <input value={row.tipo} onChange={(e) => updateEmprestimo(i, "tipo", e.target.value)} maxLength={LIMITS.emprestimoTipo} placeholder="Tipo" className="md:col-span-2 border px-3 py-2 rounded" />
                                    <input value={row.contrato} onChange={(e) => updateEmprestimo(i, "contrato", e.target.value)} maxLength={LIMITS.emprestimoContrato} placeholder="Contrato" className="md:col-span-2 border px-3 py-2 rounded" />
                                    <input value={row.saldoDevedor} onChange={(e) => updateEmprestimo(i, "saldoDevedor", monetizarDigitacao(e.target.value))} placeholder="Saldo devedor" className="md:col-span-3 border px-3 py-2 rounded" />
                                    <input value={row.saldoAmortizado} onChange={(e) => updateEmprestimo(i, "saldoAmortizado", monetizarDigitacao(e.target.value))} placeholder="Amortizado" className="md:col-span-3 border px-3 py-2 rounded" />
                                    <button type="button" onClick={() => removeEmprestimo(i)} className="md:col-span-2 inline-flex items-center justify-center gap-2 border text-red-600 px-3 py-2 rounded hover:bg-red-50">
                                        <FaTrash /> Remover
                                    </button>
                                </div>
                            ))}
                        </div>
                        {errosCampo.emprestimos && <p className="mt-1 text-xs text-red-600">{errosCampo.emprestimos}</p>}
                    </>
                )}

            </div>


            <div className="mt-6 border-t pt-5">
                <p className="text-sm font-semibold text-gray-800">Possui saldo devedor em conta corrente?</p>
                <div className="mt-2 flex gap-6">
                    <label><input type="radio" checked={temContaCorrente === "sim"} onChange={() => setTemContaCorrente("sim")} /> Sim</label>
                    <label><input type="radio" checked={temContaCorrente === "nao"} onChange={() => {
                        setTemContaCorrente("nao");
                        setContaNumero(""); setContaSaldoDevedor(""); setContaAmortizado("");
                    }} /> Nao</label>
                </div>

                {temContaCorrente === "sim" && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input data-field="contaNumero" value={contaNumero} onChange={(e) => setContaNumero(e.target.value)} maxLength={LIMITS.contaNumero} placeholder="Numero da conta" className={`border px-3 py-2 rounded ${errosCampo.contaNumero ? "border-red-500" : ""}`} />
                        <input value={contaSaldoDevedor} onChange={(e) => setContaSaldoDevedor(monetizarDigitacao(e.target.value))} placeholder="Saldo devedor conta" className="border px-3 py-2 rounded" />
                        <input data-field="contaAmortizado" value={contaAmortizado} onChange={(e) => setContaAmortizado(monetizarDigitacao(e.target.value))} placeholder="Amortizado conta" className={`border px-3 py-2 rounded ${errosCampo.contaAmortizado ? "border-red-500" : ""}`} />
                    </div>
                )}
                {errosCampo.contaNumero && <p className="mt-1 text-xs text-red-600">{errosCampo.contaNumero}</p>}
                {errosCampo.contaAmortizado && <p className="mt-1 text-xs text-red-600">{errosCampo.contaAmortizado}</p>}


                <p className="mt-5 text-sm font-semibold text-gray-800">Possui saldo devedor no cartao?</p>
                <div className="mt-2 flex gap-6">
                    <label><input type="radio" checked={temCartao === "sim"} onChange={() => setTemCartao("sim")} /> Sim</label>
                    <label><input type="radio" checked={temCartao === "nao"} onChange={() => {
                        setTemCartao("nao");
                        setCartaoNumero(""); setCartaoSaldoDevedor(""); setCartaoAmortizado("");
                    }} /> Nao</label>
                </div>

                {temCartao === "sim" && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input data-field="cartaoNumero" value={cartaoNumero} onChange={(e) => setCartaoNumero(e.target.value)} maxLength={LIMITS.cartaoNumero} placeholder="Numero do cartao" className={`border px-3 py-2 rounded ${errosCampo.cartaoNumero ? "border-red-500" : ""}`} />
                        <input value={cartaoSaldoDevedor} onChange={(e) => setCartaoSaldoDevedor(monetizarDigitacao(e.target.value))} placeholder="Saldo devedor cartao" className="border px-3 py-2 rounded" />
                        <input data-field="cartaoAmortizado" value={cartaoAmortizado} onChange={(e) => setCartaoAmortizado(monetizarDigitacao(e.target.value))} placeholder="Amortizado cartao" className={`border px-3 py-2 rounded ${errosCampo.cartaoAmortizado ? "border-red-500" : ""}`} />
                    </div>
                )}
                {errosCampo.cartaoNumero && <p className="mt-1 text-xs text-red-600">{errosCampo.cartaoNumero}</p>}
                {errosCampo.cartaoAmortizado && <p className="mt-1 text-xs text-red-600">{errosCampo.cartaoAmortizado}</p>}

            </div>


            <div className="mt-6 border-t pt-5">
                <p className="text-sm font-semibold text-gray-800">Vai receber por deposito em conta?</p>
                <div className="mt-2 flex gap-6">
                    <label>
                        <input
                            type="radio"
                            checked={temDeposito === "sim"}
                            onChange={() => setTemDeposito("sim")}
                        />{" "}
                        Sim
                    </label>
                    <label>
                        <input
                            type="radio"
                            checked={temDeposito === "nao"}
                            onChange={() => {
                                setTemDeposito("nao");
                                setBanco("");
                                setAgencia("");
                                setContaDeposito("");
                                setPrimeiraParcelaData("");
                                setPrimeiraParcelaValor("");
                                setParcelas([]);
                            }}
                        />{" "}
                        Nao
                    </label>
                </div>

                {temDeposito === "sim" && (
                    <>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                                data-field="banco"
                                value={banco}
                                onChange={(e) => setBanco(e.target.value)}
                                maxLength={LIMITS.banco}
                                placeholder="Banco"
                                className={`border px-3 py-2 rounded ${errosCampo.banco ? "border-red-500" : ""}`}
                            />
                            <input
                                data-field="agencia"
                                value={agencia}
                                onChange={(e) => setAgencia(e.target.value)}
                                maxLength={LIMITS.agencia}
                                placeholder="Agencia"
                                className={`border px-3 py-2 rounded ${errosCampo.agencia ? "border-red-500" : ""}`}
                            />
                            <input
                                data-field="contaDeposito"
                                value={contaDeposito}
                                onChange={(e) => setContaDeposito(e.target.value)}
                                maxLength={LIMITS.contaDeposito}
                                placeholder="Conta corrente"
                                className={`border px-3 py-2 rounded ${errosCampo.contaDeposito ? "border-red-500" : ""}`}
                            />
                        </div>
                        {(errosCampo.banco || errosCampo.agencia || errosCampo.contaDeposito) && (
                            <p className="mt-1 text-xs text-red-600">
                                {errosCampo.banco || errosCampo.agencia || errosCampo.contaDeposito}
                            </p>
                        )}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                                data-field="primeiraParcelaData"
                                type="date"
                                value={primeiraParcelaData}
                                onChange={(e) => setPrimeiraParcelaData(e.target.value)}
                                className={`border px-3 py-2 rounded ${errosCampo.primeiraParcelaData ? "border-red-500" : ""}`}
                            />
                            <input
                                data-field="primeiraParcelaValor"
                                value={primeiraParcelaValor}
                                onChange={(e) => setPrimeiraParcelaValor(monetizarDigitacao(e.target.value))}
                                placeholder="Valor da 1ª parcela"
                                className={`border px-3 py-2 rounded ${errosCampo.primeiraParcelaValor ? "border-red-500" : ""}`}
                            />
                        </div>
                        {(errosCampo.primeiraParcelaData || errosCampo.primeiraParcelaValor) && (
                            <p className="mt-1 text-xs text-red-600">
                                {errosCampo.primeiraParcelaData || errosCampo.primeiraParcelaValor}
                            </p>
                        )}

                        <div className="mt-4 mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-800">Parcelas (automáticas)</h3>
                            <button
                                type="button"
                                onClick={addParcela}
                                className="inline-flex items-center gap-2 border px-3 py-1.5 rounded hover:bg-gray-50"
                            >
                                <FaPlus /> Adicionar Parcela
                            </button>
                        </div>

                        {parcelas.length === 0 && (
                            <p className="text-sm text-gray-500">Nenhuma parcela adicionada.</p>
                        )}
                        {errosCampo.parcelas && <p data-field="parcelas" className="mt-1 text-xs text-red-600">{errosCampo.parcelas}</p>}

                        <div className="space-y-2">
                            {parcelas.map((row, i) => (
                                <div key={`parc-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                    <input
                                        type="date"
                                        value={row.dataParcela}
                                        readOnly
                                        className="md:col-span-4 border px-3 py-2 rounded bg-gray-50"
                                    />
                                    <input
                                        value={row.valor}
                                        readOnly
                                        className="md:col-span-6 border px-3 py-2 rounded bg-gray-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeParcela(i)}
                                        className="md:col-span-2 inline-flex items-center justify-center gap-2 border text-red-600 px-3 py-2 rounded hover:bg-red-50"
                                    >
                                        <FaTrash /> Remover
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>



            <div className="mt-6 border-t pt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={onImprimir}
                    disabled={bloqueadoParaImprimir}
                    title={idResgateCriado && bloqueadoParaImprimir ? "Salve novamente para liberar a impressao" : undefined}
                    className="inline-flex items-center gap-2 border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FaFilePdf /> {idResgateCriado && bloqueadoParaImprimir ? "Salvar novamente para imprimir" : "Imprimir PDF"}
                </button>
                <button
                    type="button"
                    onClick={onSalvar}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-secondary text-white font-semibold px-5 py-2 rounded hover:bg-primary disabled:opacity-60"
                >
                    <FaSave /> {loading ? "Salvando..." : "Salvar Resgate"}
                </button>
            </div>
        </div>
    );
}
