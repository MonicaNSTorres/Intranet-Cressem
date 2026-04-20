"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { formatCpfView, monetizarDigitacao, parseBRL, fmtBRL, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfPrevisul } from "@/lib/pdf/gerarPdfPrevisul";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function toIsoFromBr(value: string) {
    if (!value) return "";
    const [dia, mes, ano] = value.split("/");
    if (!dia || !mes || !ano) return "";
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function toBrFromIso(value?: string) {
    if (!value) return "";
    const [ano, mes, dia] = value.split("-");
    if (!ano || !mes || !dia) return value;
    return `${dia}/${mes}/${ano}`;
}

function addMonths(dateIso: string, months: number) {
    if (!dateIso) return "";
    const d = new Date(`${dateIso}T00:00:00`);
    d.setMonth(d.getMonth() + months);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function calculateAgeFromIso(dateIso?: string) {
    if (!dateIso) return "";
    const birth = new Date(`${dateIso}T00:00:00`);
    const today = new Date();

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
        months--;
        const lastMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        days += lastMonthDays;
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    return `com ${years} anos, ${months} meses e ${days} dias`;
}

function formatNascimentoParaInput(value?: string | Date) {
    if (!value) return "";

    if (value instanceof Date) {
        const ano = value.getFullYear();
        const mes = String(value.getMonth() + 1).padStart(2, "0");
        const dia = String(value.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    }

    const str = String(value).trim();

    //yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    //dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [dia, mes, ano] = str.split("/");
        return `${ano}-${mes}-${dia}`;
    }

    //dd-mm-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [dia, mes, ano] = str.split("-");
        return `${ano}-${mes}-${dia}`;
    }

    return "";
}

export function PrevisulForm() {
    const [cpf, setCpf] = useState("");
    const [nome, setNome] = useState("NOMECLIENTE");
    const [cpfTermo, setCpfTermo] = useState("CPFCLIENTE");
    const [nascimento, setNascimento] = useState("");
    const [proposta, setProposta] = useState("");
    const [valorEmprestimo, setValorEmprestimo] = useState("");
    const [totalParcelas, setTotalParcelas] = useState("");
    const [dataPrimeiraParcelaEmprestimo, setDataPrimeiraParcelaEmprestimo] = useState("");
    const [valorMensalSeguro, setValorMensalSeguro] = useState("");
    const [valorTotalSeguro, setValorTotalSeguro] = useState("");
    const [taxaJuros] = useState("0,8%");
    const [dataPrimeiraParcelaSeguro, setDataPrimeiraParcelaSeguro] = useState("");
    const [dataUltimaParcelaSeguro, setDataUltimaParcelaSeguro] = useState("");
    const [cidadeAtendimento, setCidadeAtendimento] = useState("");
    const [dataHoje, setDataHoje] = useState(hojeBR());

    const [erroLocal, setErroLocal] = useState("");
    const [infoLocal, setInfoLocal] = useState("");

    const { loading, erro, info, buscar } = useAssociadoPorCpf();

    const nascimentoBr = useMemo(() => toBrFromIso(nascimento), [nascimento]);
    const idadeTexto = useMemo(() => calculateAgeFromIso(nascimento), [nascimento]);
    const parcelasNum = useMemo(() => Number(totalParcelas || 0), [totalParcelas]);
    const valorEmprestimoNum = useMemo(() => parseBRL(valorEmprestimo), [valorEmprestimo]);

    const mostrarCompetencia = useMemo(() => {
        if (!dataPrimeiraParcelaEmprestimo) return false;
        const ref = new Date(`${dataPrimeiraParcelaEmprestimo}T00:00:00`);
        const now = new Date();
        return !(ref.getMonth() === now.getMonth() && ref.getFullYear() === now.getFullYear());
    }, [dataPrimeiraParcelaEmprestimo]);

    const onBuscar = async () => {
        setErroLocal("");
        setInfoLocal("");

        const r = await buscar(cpf);

        if (r.found) {
            setNome(r.data.nome || "NOMECLIENTE");
            setCpfTermo(formatCpfView(r.data.cpf || cpf));
            setNascimento(formatNascimentoParaInput(r.data.nascimento));
            setInfoLocal("Dados carregados. Complete manualmente os campos do contrato.");
        }
    };

    const processar = () => {
        setErroLocal("");
        setInfoLocal("");

        if (!proposta.trim()) {
            setErroLocal("Preencha o número da proposta.");
            return;
        }

        if (!valorEmprestimoNum || valorEmprestimoNum <= 0) {
            setErroLocal("Informe um valor de empréstimo válido.");
            return;
        }

        if (!parcelasNum || parcelasNum <= 0) {
            setErroLocal("Informe a quantidade de parcelas.");
            return;
        }

        if (!dataPrimeiraParcelaEmprestimo) {
            setErroLocal("Informe a data da primeira parcela do empréstimo.");
            return;
        }

        const mensal = valorEmprestimoNum * 0.001;
        const total = mensal * parcelasNum;

        setValorMensalSeguro(fmtBRL(mensal));
        setValorTotalSeguro(fmtBRL(total));

        const hojeIso = toIsoFromBr(dataHoje);
        const primeiroSeguro = addMonths(hojeIso, 1);
        const ultimoSeguro = addMonths(primeiroSeguro, parcelasNum - 1);

        setDataPrimeiraParcelaSeguro(primeiroSeguro);
        setDataUltimaParcelaSeguro(ultimoSeguro);

        setInfoLocal("Seguro processado com sucesso.");
    };

    const validarGeracao = () => {
        if (!nome.trim() || nome === "NOMECLIENTE") {
            setErroLocal("Preencha o nome do associado.");
            return false;
        }

        if (!cpf.trim()) {
            setErroLocal("Preencha o CPF do associado.");
            return false;
        }

        if (!nascimento) {
            setErroLocal("Preencha a data de nascimento.");
            return false;
        }

        if (!proposta.trim()) {
            setErroLocal("Preencha o número da proposta.");
            return false;
        }

        if (!valorEmprestimo.trim()) {
            setErroLocal("Preencha o valor do empréstimo.");
            return false;
        }

        if (!totalParcelas.trim()) {
            setErroLocal("Preencha o total de parcelas.");
            return false;
        }

        if (!dataPrimeiraParcelaEmprestimo) {
            setErroLocal("Preencha a data da primeira parcela do empréstimo.");
            return false;
        }

        if (!valorMensalSeguro || !valorTotalSeguro) {
            setErroLocal("Clique em Processar antes de gerar o PDF.");
            return false;
        }

        if (mostrarCompetencia && (!dataPrimeiraParcelaSeguro || !dataUltimaParcelaSeguro)) {
            setErroLocal("Preencha as datas do seguro.");
            return false;
        }

        if (!cidadeAtendimento.trim()) {
            setErroLocal("Preencha a cidade do atendimento.");
            return false;
        }

        if (!dataHoje.trim()) {
            setErroLocal("Preencha a data do atendimento.");
            return false;
        }

        return true;
    };

    const gerar = async () => {
        setErroLocal("");
        setInfoLocal("");

        if (!validarGeracao()) return;

        await gerarPdfPrevisul({
            nome,
            cpf: cpfTermo === "CPFCLIENTE" ? formatCpfView(cpf) : cpfTermo,
            nascimento: nascimentoBr || "NASCIMENTO",
            idadeTexto,
            proposta,
            valorEmprestimo: valorEmprestimo || fmtBRL(0),
            totalParcelas,
            dataPrimeiraParcelaEmprestimo: toBrFromIso(dataPrimeiraParcelaEmprestimo),
            valorMensalSeguro: valorMensalSeguro || fmtBRL(0),
            valorTotalSeguro: valorTotalSeguro || fmtBRL(0),
            taxaJuros,
            dataPrimeiraParcelaSeguro: toBrFromIso(dataPrimeiraParcelaSeguro),
            dataUltimaParcelaSeguro: toBrFromIso(dataUltimaParcelaSeguro),
            cidadeAtendimento,
            dataHoje,
            mostrarCompetencia,
            assinaturaAssociado: nome,
        });
    };

    return (
        <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
            <SearchForm onSearch={onBuscar}>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        CPF do associado
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <SearchInput
                            value={formatCpfView(cpf)}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="CPF (somente números)"
                            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            inputMode="numeric"
                            maxLength={14}
                        />
                        <SearchButton loading={loading} label="Pesquisar" />
                    </div>

                    {(erro || erroLocal) && (
                        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                            {erroLocal || erro}
                        </div>
                    )}

                    {(info || infoLocal) && !(erro || erroLocal) && (
                        <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
                            {infoLocal || info}
                        </div>
                    )}
                </div>
            </SearchForm>

            <div className="mt-6 space-y-3 border rounded p-4 bg-gray-50 text-sm text-gray-700">
                <p>
                    <strong>{nome}</strong>, pessoa física, CPF:{" "}
                    <strong>{cpfTermo === "CPFCLIENTE" ? formatCpfView(cpf) : cpfTermo}</strong>,
                    {" "}nascido em <strong>{nascimentoBr || "NASCIMENTO"}</strong>,
                    {" "}<strong>{idadeTexto || "Idade"}</strong>, associado à SICOOB CRESSEM -
                    COOPERATIVA DE ECONOMIA E CRÉDITO MÚTUO DOS SERVIDORES MUNICIPAIS DA
                    REGIÃO METROPOLITANA DO VALE DO PARAÍBA E LITORAL NORTE, representado
                    nos termos de seus atos constitutivos, formaliza pela assinatura do
                    presente Termo, o interesse em aderir ao Contrato de Seguro Prestamista.
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Nome do associado
                    </label>
                    <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data de nascimento
                    </label>
                    <input
                        type="date"
                        value={nascimento}
                        onChange={(e) => setNascimento(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Proposta nº
                    </label>
                    <input
                        value={proposta}
                        onChange={(e) => setProposta(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Valor do empréstimo
                    </label>
                    <input
                        value={valorEmprestimo}
                        onChange={(e) => setValorEmprestimo(monetizarDigitacao(e.target.value))}
                        className="w-full border px-3 py-2 rounded text-right"
                        placeholder="R$ 0,00"
                    />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Total de parcelas
                    </label>
                    <input
                        value={totalParcelas}
                        onChange={(e) => setTotalParcelas(e.target.value.replace(/\D/g, ""))}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data da 1ª parcela do empréstimo
                    </label>
                    <input
                        type="date"
                        value={dataPrimeiraParcelaEmprestimo}
                        onChange={(e) => setDataPrimeiraParcelaEmprestimo(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>
            </div>

            <div className="pt-5 border-t mt-6 flex items-center justify-end">
                <button
                    onClick={processar}
                    className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
                >
                    Processar
                </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Valor mensal do seguro
                    </label>
                    <input
                        readOnly
                        value={valorMensalSeguro}
                        className="w-full border px-3 py-2 rounded bg-gray-50 text-right"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Valor total do seguro
                    </label>
                    <input
                        readOnly
                        value={valorTotalSeguro}
                        className="w-full border px-3 py-2 rounded bg-gray-50 text-right"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Taxa de juros sobre o seguro
                    </label>
                    <input
                        readOnly
                        value={taxaJuros}
                        className="w-full border px-3 py-2 rounded bg-gray-50"
                    />
                </div>
            </div>

            {mostrarCompetencia && (
                <>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Data da 1ª parcela do seguro
                            </label>
                            <input
                                type="date"
                                value={dataPrimeiraParcelaSeguro}
                                onChange={(e) => setDataPrimeiraParcelaSeguro(e.target.value)}
                                className="w-full border px-3 py-2 rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Data da última parcela do seguro
                            </label>
                            <input
                                type="date"
                                value={dataUltimaParcelaSeguro}
                                onChange={(e) => setDataUltimaParcelaSeguro(e.target.value)}
                                className="w-full border px-3 py-2 rounded"
                            />
                        </div>
                    </div>

                    <div className="mt-6 space-y-3 border rounded p-4 bg-gray-50 text-sm text-gray-700">
                        <p>
                            O seguro é pago por competência, ou seja, a partir da contratação,
                            havendo assim a incidência de mais um mês de seguro, pois a primeira
                            parcela do empréstimo vence no mês subsequente, mas tendo de estar
                            segura a partir deste mês.
                        </p>
                    </div>
                </>
            )}

            <div className="mt-6 space-y-3 border rounded p-4 bg-gray-50 text-sm text-gray-700">
                <p>
                    A formalização da adesão individual ao seguro será realizada por
                    intermédio do preenchimento e assinatura, pelo proponente, da Proposta
                    de Adesão.
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cidade do atendimento
                    </label>
                    <input
                        value={cidadeAtendimento}
                        onChange={(e) => setCidadeAtendimento(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Cidade do atendimento"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data de hoje
                    </label>
                    <input
                        value={dataHoje}
                        onChange={(e) => setDataHoje(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="dd/mm/aaaa"
                    />
                </div>
            </div>

            <div className="mt-6 border rounded p-4 bg-white">
                <div className="space-y-5 text-sm text-gray-700">
                    <div>
                        <div className="border-b border-gray-400 w-full mb-2" />
                        <p className="text-center">{nome || "Assinatura do Contratante"}</p>
                    </div>

                    <div>
                        <div className="border-b border-gray-400 w-full mb-2" />
                        <p className="text-center">Validação</p>
                    </div>
                </div>
            </div>

            <div className="pt-5 border-t mt-6 flex items-center justify-end">
                <button
                    onClick={gerar}
                    className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
                >
                    Gerar PDF
                </button>
            </div>
        </div>
    );
}