"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaPlus, FaSave, FaSearch, FaTrash } from "react-icons/fa";
import {
    buscarAssociadoBasePorCpf,
    buscarConvenioPorCpfTitular,
    buscarConvenioTitularUnico,
    buscarPessoaOdontoPorCpfUsuario,
    buscarPessoaOdontoSemCpf,
    criarHistoricoConvenioOdonto,
    criarPessoaOdonto,
    editarPessoaOdonto,
    listarEmpresasDoAssociado,
    listarFatorAjuste,
    listarParentesco,
    verificarCodCartaoOdonto,
    type EmpresaAssociado,
    type FatorAjuste,
    type Parentesco,
    type PessoaOdonto,
} from "@/services/convenio_odonto.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
}

function formatCpf(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function isValidCpf(cpf: string) {
    const value = onlyDigits(cpf);
    if (value.length !== 11 || /^(\d)\1+$/.test(value)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(value[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== Number(value[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(value[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;

    return rest === Number(value[10]);
}

function fmtBRL(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

const inputBase =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Field({
    label,
    children,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
                {label}
            </label>
            {children}
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-emerald-200 bg-gradient-to-r from-[#79B729] to-[#8ED12F] px-5 py-3">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

type DependenteForm = {
    localId: string;
    idConvenioPessoas?: number;
    nome: string;
    cpf: string;
    planoId: string;
    parentesco: string;
    dataNascimento: string;
    nomeMae: string;
    codCartao: string;
    ativo: boolean;
    registroOriginal?: PessoaOdonto | null;
};

export function CadastroConvenioOdontoForm() {
    const searchParams = useSearchParams();
    const cpfParam = searchParams.get("cpf") || "";
    const [loadingInicial, setLoadingInicial] = useState(true);
    const [loadingBuscar, setLoadingBuscar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);

    const [cpf, setCpf] = useState("");
    const [nome, setNome] = useState("");
    const [nomeMae, setNomeMae] = useState("");
    const [dataNascimento, setDataNascimento] = useState("");
    const [cidade, setCidade] = useState("");
    const [codCartao, setCodCartao] = useState("");
    const [codAssociado, setCodAssociado] = useState("");
    const [codPlano, setCodPlano] = useState("");

    const [convenio, setConvenio] = useState("");
    const [planoTitular, setPlanoTitular] = useState("");
    const [titularAtivo, setTitularAtivo] = useState(true);

    const [empresas, setEmpresas] = useState<EmpresaAssociado[]>([]);
    const [matriculaSelecionada, setMatriculaSelecionada] = useState("");
    const [empresaSelecionada, setEmpresaSelecionada] = useState("");
    const [cnpjSelecionado, setCnpjSelecionado] = useState("");

    const [fatores, setFatores] = useState<FatorAjuste[]>([]);
    const [parentescos, setParentescos] = useState<Parentesco[]>([]);
    const [dependentes, setDependentes] = useState<DependenteForm[]>([]);

    const [modoEdicao, setModoEdicao] = useState(false);
    const [titularOriginal, setTitularOriginal] = useState<PessoaOdonto | null>(null);

    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    useEffect(() => {
        async function loadInicial() {
            try {
                const [fatoresResp, parentescosResp] = await Promise.all([
                    listarFatorAjuste(),
                    listarParentesco(),
                ]);

                setFatores(fatoresResp);
                setParentescos(parentescosResp);
            } catch (error) {
                console.error(error);
                setErro("Não foi possível carregar os dados iniciais da tela.");
            } finally {
                setLoadingInicial(false);
            }
        }

        loadInicial();
    }, []);

    useEffect(() => {
        const cpfFromUrl = onlyDigits(cpfParam);

        if (!cpfFromUrl || cpf) return;

        setCpf(cpfFromUrl);
    }, [cpfParam, cpf]);

    useEffect(() => {
        const cpfFromUrl = onlyDigits(cpfParam);

        if (!cpfFromUrl) return;
        if (onlyDigits(cpf) !== cpfFromUrl) return;
        if (loadingInicial) return;

        onBuscar();
    }, [cpfParam, cpf, loadingInicial]);

    const planosDisponiveis = useMemo(() => {
        if (!convenio) return [];
        return fatores.filter((item) => String(item.ID_OPERADORA) === String(convenio));
    }, [fatores, convenio]);

    const gastoMensal = useMemo(() => {
        const valorTitular =
            planosDisponiveis.find((item) => String(item.ID_CONVENIO_FATOR_AJUSTE) === String(planoTitular))
                ?.VL_AJUSTE || 0;

        const valorDependentes = dependentes.reduce((acc, dep) => {
            const plano = planosDisponiveis.find(
                (item) => String(item.ID_CONVENIO_FATOR_AJUSTE) === String(dep.planoId)
            );
            return acc + Number(plano?.VL_AJUSTE || 0);
        }, 0);

        return Number(valorTitular) + Number(valorDependentes);
    }, [planoTitular, dependentes, planosDisponiveis]);

    function limparFormulario() {
        setCpf("");
        setNome("");
        setNomeMae("");
        setDataNascimento("");
        setCidade("");
        setCodCartao("");
        setCodAssociado("");
        setCodPlano("");
        setConvenio("");
        setPlanoTitular("");
        setTitularAtivo(true);
        setEmpresas([]);
        setMatriculaSelecionada("");
        setEmpresaSelecionada("");
        setCnpjSelecionado("");
        setDependentes([]);
        setModoEdicao(false);
        setTitularOriginal(null);
        setErro("");
        setInfo("");
    }

    function syncEmpresaSelecionada(matricula: string, lista: EmpresaAssociado[]) {
        const empresa = lista.find((item) => String(item.NR_MATRICULA) === String(matricula));
        setMatriculaSelecionada(matricula);
        setEmpresaSelecionada(empresa?.NM_EMPRESA || "");
        setCnpjSelecionado(empresa?.NR_CPF_CNPJ_EMPREGADOR || "");
    }

    async function carregarEmpresas(cpfTitular: string, matriculaPreferencial?: string) {
        const lista = await listarEmpresasDoAssociado(cpfTitular);
        setEmpresas(lista || []);

        if (matriculaPreferencial) {
            syncEmpresaSelecionada(matriculaPreferencial, lista);
            return;
        }

        if (lista.length === 1) {
            syncEmpresaSelecionada(String(lista[0].NR_MATRICULA), lista);
        }
    }

    function mapDependenteFromApi(item: PessoaOdonto): DependenteForm {
        return {
            localId: `${item.ID_CONVENIO_PESSOAS || Math.random()}`,
            idConvenioPessoas: item.ID_CONVENIO_PESSOAS,
            nome: item.NM_USUARIO || "",
            cpf: formatCpf(item.NR_CPF_USUARIO || ""),
            planoId: String(item.ID_CONVENIO_FATOR_AJUSTE || ""),
            parentesco: item.DESC_PARENTESCO || "",
            dataNascimento: item.DT_NASCIMENTO ? String(item.DT_NASCIMENTO).slice(0, 10) : "",
            nomeMae: item.NM_MAE || "",
            codCartao: item.CD_CARTAO || "",
            ativo: Number(item.SN_ATIVO || 0) === 1,
            registroOriginal: item,
        };
    }

    async function onBuscar() {
        try {
            setErro("");
            setInfo("");

            const cpfDigits = onlyDigits(cpf);

            if (!cpfDigits) {
                setErro("Informe o CPF do titular.");
                return;
            }

            if (!isValidCpf(cpfDigits)) {
                setErro("Informe um CPF válido.");
                return;
            }

            setLoadingBuscar(true);

            const associado = await buscarAssociadoBasePorCpf(cpfDigits);

            setNome(associado?.NM_CLIENTE || "");
            setNomeMae(associado?.NM_MAE || "");
            setDataNascimento(
                associado?.DT_NASCIMENTO ? String(associado.DT_NASCIMENTO).slice(0, 10) : ""
            );

            if (associado?.CD_ASSOCIADO) {
                setCodAssociado(String(associado.CD_ASSOCIADO));
            }

            const empresaAssociado = {
                NR_MATRICULA: String(associado?.NR_MATRICULA || "").trim(),
                NM_EMPRESA: String(associado?.NM_EMPRESA || "").trim(),
                NR_CPF_CNPJ_EMPREGADOR: String(associado?.NR_CPF_CNPJ_EMPREGADOR || "").trim(),
            };

            if (
                empresaAssociado.NR_MATRICULA ||
                empresaAssociado.NM_EMPRESA ||
                empresaAssociado.NR_CPF_CNPJ_EMPREGADOR
            ) {
                setEmpresas([empresaAssociado]);
                setMatriculaSelecionada(empresaAssociado.NR_MATRICULA);
                setEmpresaSelecionada(empresaAssociado.NM_EMPRESA);
                setCnpjSelecionado(empresaAssociado.NR_CPF_CNPJ_EMPREGADOR);
            } else {
                setEmpresas([]);
                setMatriculaSelecionada("");
                setEmpresaSelecionada("");
                setCnpjSelecionado("");
            }

            try {
                const titular = await buscarConvenioTitularUnico(cpfDigits);
                const todos = await buscarConvenioPorCpfTitular(cpfDigits);

                setModoEdicao(true);
                setTitularOriginal(titular);

                setConvenio(String(titular.ID_OPERADORA || ""));
                setPlanoTitular(String(titular.ID_CONVENIO_FATOR_AJUSTE || ""));
                setCidade(titular.NM_CIDADE || "");
                setCodCartao(titular.CD_CARTAO || "");
                setCodPlano(String(titular.CD_PLANO || ""));
                setCodAssociado(String(titular.CD_ASSOCIADO || associado?.CD_ASSOCIADO || ""));
                setTitularAtivo(Number(titular.SN_ATIVO || 0) === 1);

                await carregarEmpresas(cpfDigits, String(titular.CD_MATRICULA || ""));

                const dependentesApi = (todos || []).filter(
                    (item) => String(item.DESC_PARENTESCO || "").toUpperCase() !== "TITULAR"
                );

                setDependentes(dependentesApi.map(mapDependenteFromApi));
                setInfo("Registro carregado para alteração.");
            } catch (error: any) {
                if (error?.response?.status === 404) {
                    setModoEdicao(false);
                    setTitularOriginal(null);
                    setDependentes([]);
                    setInfo("Titular carregado. Nenhum convênio odontológico cadastrado ainda.");
                } else {
                    throw error;
                }
            }
        } catch (error: any) {
            console.error(error);
            setErro(error?.response?.data?.error || "Não foi possível buscar os dados do titular.");
        } finally {
            setLoadingBuscar(false);
        }
    }

    function adicionarDependente() {
        if (!convenio) {
            setErro("Selecione o convênio antes de adicionar dependentes.");
            return;
        }

        if (!planoTitular) {
            setErro("Selecione o plano do titular antes de adicionar dependentes.");
            return;
        }

        setErro("");
        setDependentes((old) => [
            ...old,
            {
                localId: `${Date.now()}-${old.length}`,
                nome: "",
                cpf: "",
                planoId: "",
                parentesco: "",
                dataNascimento: "",
                nomeMae: "",
                codCartao: "",
                ativo: true,
                registroOriginal: null,
            },
        ]);
    }

    function removerDependente(localId: string) {
        setDependentes((old) => old.filter((item) => item.localId !== localId));
    }

    function atualizarDependente(localId: string, field: keyof DependenteForm, value: any) {
        setDependentes((old) =>
            old.map((item) => (item.localId === localId ? { ...item, [field]: value } : item))
        );
    }

    function validaCampos() {
        if (!cpf) return "CPF do titular não preenchido.";
        if (!isValidCpf(cpf)) return "CPF do titular inválido.";
        if (!nome.trim()) return "Nome do titular não preenchido.";
        if (!matriculaSelecionada) return "Selecione a empresa do titular.";
        if (!convenio) return "Convênio não selecionado.";
        if (!planoTitular) return "Plano do titular não selecionado.";
        if (!cidade) return "Cidade não selecionada.";
        if (!nomeMae.trim()) return "Nome da mãe do titular não preenchido.";
        if (!dataNascimento) return "Data de nascimento do titular não preenchida.";

        for (let i = 0; i < dependentes.length; i++) {
            const item = dependentes[i];

            if (!item.nome.trim()) return `Nome do dependente ${i + 1} não preenchido.`;
            if (!item.cpf.trim()) return `CPF do dependente ${i + 1} não preenchido.`;
            if (!isValidCpf(item.cpf)) return `CPF do dependente ${i + 1} inválido.`;
            if (!item.planoId) return `Plano do dependente ${i + 1} não selecionado.`;
            if (!item.parentesco) return `Parentesco do dependente ${i + 1} não selecionado.`;
            if (!item.dataNascimento) return `Data de nascimento do dependente ${i + 1} não preenchida.`;
            if (!item.nomeMae.trim()) return `Nome da mãe do dependente ${i + 1} não preenchido.`;

            if (onlyDigits(item.cpf) === onlyDigits(cpf)) {
                return `O CPF do dependente ${i + 1} não pode ser igual ao do titular.`;
            }
        }

        const cpfs = dependentes.map((dep) => onlyDigits(dep.cpf));
        const duplicado = cpfs.some((cpfAtual, index) => cpfs.indexOf(cpfAtual) !== index);
        if (duplicado) return "Existem CPFs duplicados entre os dependentes.";

        return "";
    }

    async function validarCartaoSeInformado(
        codCartaoValidar: string,
        cpfUsuario: string,
        cpfTitular: string,
        nomeUsuario: string
    ) {
        if (!String(codCartaoValidar || "").trim()) return;

        try {
            await verificarCodCartaoOdonto(codCartaoValidar, cpfUsuario, cpfTitular, nomeUsuario);
            throw new Error(
                `O código de cartão ${codCartaoValidar} já está ativo em outro registro.`
            );
        } catch (error: any) {
            if (error?.response?.status === 404) return;
            if (error?.message) throw error;
            throw new Error("Falha ao validar código do cartão.");
        }
    }

    function montarPayloadTitular() {
        return {
            ID_OPERADORA: Number(convenio),
            CD_PLANO: codPlano ? Number(codPlano) : null,
            CD_CARTAO: codCartao || null,
            CD_ASSOCIADO: codAssociado ? Number(codAssociado) : null,
            CD_USUARIO: codCartao ? Number(String(codCartao).slice(-1)) : null,
            NR_CPF_TITULAR: onlyDigits(cpf),
            CD_MATRICULA: matriculaSelecionada || null,
            NM_EMPRESA: empresaSelecionada || null,
            NR_CNPJ_EMPRESA: cnpjSelecionado ? onlyDigits(cnpjSelecionado) : null,
            NM_USUARIO: nome.trim().toUpperCase(),
            NR_CPF_USUARIO: onlyDigits(cpf),
            DT_INCLUSAO: titularOriginal?.DT_INCLUSAO
                ? String(titularOriginal.DT_INCLUSAO).slice(0, 10)
                : todayISO(),
            DT_EXCLUSAO: titularAtivo ? null : todayISO(),
            DESC_PARENTESCO: "TITULAR",
            ID_CONVENIO_FATOR_AJUSTE: Number(planoTitular),
            SN_ATIVO: titularAtivo ? 1 : 0,
            NM_ATENDENTE_CADASTRO: modoEdicao ? null : "INTRANET",
            NM_ATENDENTE_EDICAO: modoEdicao ? "INTRANET" : null,
            NM_MAE: nomeMae.trim().toUpperCase(),
            DT_NASCIMENTO: dataNascimento,
            NM_CIDADE: cidade.trim().toUpperCase(),
        };
    }

    async function salvarTitular() {
        const payload = montarPayloadTitular();

        await validarCartaoSeInformado(
            payload.CD_CARTAO || "",
            payload.NR_CPF_USUARIO || "",
            payload.NR_CPF_TITULAR,
            payload.NM_USUARIO
        );

        if (!modoEdicao || !titularOriginal?.ID_CONVENIO_PESSOAS) {
            await criarPessoaOdonto(payload);
            return;
        }

        await criarHistoricoConvenioOdonto({
            CD_PLANO: titularOriginal.CD_PLANO || null,
            NR_CPF_TITULAR: titularOriginal.NR_CPF_TITULAR || null,
            CD_MATRICULA: titularOriginal.CD_MATRICULA || null,
            NM_EMPRESA: titularOriginal.NM_EMPRESA || null,
            NR_CNPJ_EMPRESA: titularOriginal.NR_CNPJ_EMPRESA || null,
            NM_USUARIO: titularOriginal.NM_USUARIO || null,
            NR_CPF_USUARIO: titularOriginal.NR_CPF_USUARIO || null,
            DT_INCLUSAO: titularOriginal.DT_INCLUSAO
                ? String(titularOriginal.DT_INCLUSAO).slice(0, 10)
                : null,
            DT_EXCLUSAO: titularOriginal.DT_EXCLUSAO
                ? String(titularOriginal.DT_EXCLUSAO).slice(0, 10)
                : null,
            NM_PARENTESCO: titularOriginal.DESC_PARENTESCO || null,
            SN_ATIVO: Number(titularOriginal.SN_ATIVO || 0),
            NM_ATENDENTE_CADASTRO: titularOriginal.NM_ATENDENTE_CADASTRO || null,
            NM_ATENDENTE_EDICAO: "INTRANET",
            DT_NASCIMENTO: titularOriginal.DT_NASCIMENTO
                ? String(titularOriginal.DT_NASCIMENTO).slice(0, 10)
                : null,
            NM_MAE: titularOriginal.NM_MAE || null,
            NM_CIDADE: titularOriginal.NM_CIDADE || null,
            VL_FATOR_AJUSTE: Number(titularOriginal.VL_AJUSTE || 0),
            NM_PLANO_FATOR_AJUSTE: titularOriginal.NM_FATOR_AJUSTE || null,
            NM_OPERADORA: titularOriginal.DESC_CONVENIO || null,
        });

        await editarPessoaOdonto(Number(titularOriginal.ID_CONVENIO_PESSOAS), payload);
    }

    async function salvarDependentes() {
        for (const dep of dependentes) {
            const cpfDep = onlyDigits(dep.cpf);
            const nomeDep = dep.nome.trim().toUpperCase();

            await validarCartaoSeInformado(dep.codCartao, cpfDep, onlyDigits(cpf), nomeDep);

            const payload = {
                ID_OPERADORA: Number(convenio),
                CD_PLANO: codPlano ? Number(codPlano) : null,
                CD_CARTAO: dep.codCartao || null,
                CD_ASSOCIADO: codAssociado ? Number(codAssociado) : null,
                CD_USUARIO: dep.codCartao ? Number(String(dep.codCartao).slice(-1)) : null,
                NR_CPF_TITULAR: onlyDigits(cpf),
                CD_MATRICULA: matriculaSelecionada || null,
                NM_EMPRESA: empresaSelecionada || null,
                NR_CNPJ_EMPRESA: cnpjSelecionado ? onlyDigits(cnpjSelecionado) : null,
                NM_USUARIO: nomeDep,
                NR_CPF_USUARIO: cpfDep,
                DT_INCLUSAO: dep.registroOriginal?.DT_INCLUSAO
                    ? String(dep.registroOriginal.DT_INCLUSAO).slice(0, 10)
                    : todayISO(),
                DT_EXCLUSAO: dep.ativo ? null : todayISO(),
                DESC_PARENTESCO: dep.parentesco.trim().toUpperCase(),
                ID_CONVENIO_FATOR_AJUSTE: Number(dep.planoId),
                SN_ATIVO: dep.ativo ? 1 : 0,
                NM_ATENDENTE_CADASTRO: dep.registroOriginal ? null : "INTRANET",
                NM_ATENDENTE_EDICAO: dep.registroOriginal ? "INTRANET" : null,
                NM_MAE: dep.nomeMae.trim().toUpperCase(),
                DT_NASCIMENTO: dep.dataNascimento,
                NM_CIDADE: cidade.trim().toUpperCase(),
            };

            if (!dep.registroOriginal?.ID_CONVENIO_PESSOAS) {
                try {
                    await buscarPessoaOdontoPorCpfUsuario(cpfDep);
                    throw new Error(`O CPF ${formatCpf(cpfDep)} já possui convênio odontológico ativo.`);
                } catch (error: any) {
                    if (error?.response?.status === 404) {
                        try {
                            await buscarPessoaOdontoSemCpf(nomeDep);
                        } catch {
                            await criarPessoaOdonto(payload);
                            continue;
                        }

                        await criarPessoaOdonto(payload);
                        continue;
                    }

                    throw error;
                }
            }

            const original = dep.registroOriginal;

            await criarHistoricoConvenioOdonto({
                CD_PLANO: original?.CD_PLANO || null,
                NR_CPF_TITULAR: original?.NR_CPF_TITULAR || null,
                CD_MATRICULA: original?.CD_MATRICULA || null,
                NM_EMPRESA: original?.NM_EMPRESA || null,
                NR_CNPJ_EMPRESA: original?.NR_CNPJ_EMPRESA || null,
                NM_USUARIO: original?.NM_USUARIO || null,
                NR_CPF_USUARIO: original?.NR_CPF_USUARIO || null,
                DT_INCLUSAO: original?.DT_INCLUSAO ? String(original.DT_INCLUSAO).slice(0, 10) : null,
                DT_EXCLUSAO: original?.DT_EXCLUSAO ? String(original.DT_EXCLUSAO).slice(0, 10) : null,
                NM_PARENTESCO: original?.DESC_PARENTESCO || null,
                SN_ATIVO: Number(original?.SN_ATIVO || 0),
                NM_ATENDENTE_CADASTRO: original?.NM_ATENDENTE_CADASTRO || null,
                NM_ATENDENTE_EDICAO: "INTRANET",
                DT_NASCIMENTO: original?.DT_NASCIMENTO
                    ? String(original.DT_NASCIMENTO).slice(0, 10)
                    : null,
                NM_MAE: original?.NM_MAE || null,
                NM_CIDADE: original?.NM_CIDADE || null,
                VL_FATOR_AJUSTE: Number(original?.VL_AJUSTE || 0),
                NM_PLANO_FATOR_AJUSTE: original?.NM_FATOR_AJUSTE || null,
                NM_OPERADORA: original?.DESC_CONVENIO || null,
            });

            await editarPessoaOdonto(Number(original?.ID_CONVENIO_PESSOAS), payload);
        }
    }

    async function salvar() {
        try {
            setErro("");
            setInfo("");

            const msg = validaCampos();
            if (msg) {
                setErro(msg);
                return;
            }

            setLoadingSalvar(true);

            await salvarTitular();
            await salvarDependentes();

            setInfo(
                modoEdicao
                    ? "Alteração do convênio odontológico realizada com sucesso."
                    : "Cadastro do convênio odontológico realizado com sucesso."
            );

            await onBuscar();
        } catch (error: any) {
            console.error(error);
            setErro(
                error?.response?.data?.error ||
                error?.message ||
                "Não foi possível salvar o convênio odontológico."
            );
        } finally {
            setLoadingSalvar(false);
        }
    }

    if (loadingInicial) {
        return (
            <div className="mx-auto w-full min-w-225 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm text-slate-500">Carregando dados da tela...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
            <SearchForm onSearch={onBuscar}>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">
                                {modoEdicao ? "Alteração de Convênio Odontológico" : "Cadastro de Convênio Odontológico"}
                            </h1>
                            <p className="text-sm text-slate-500">
                                Consulte o titular, selecione empresa, convênio, plano e gerencie os dependentes.
                            </p>
                        </div>

                        <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Gasto mensal: {fmtBRL(gastoMensal)}
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-1.5">
                            <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
                                CPF do titular
                            </label>

                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px]">
                                <SearchInput
                                    value={formatCpf(cpf)}
                                    onChange={(e) => setCpf(e.target.value)}
                                    placeholder="Digite o CPF"
                                    className={inputBase}
                                    inputMode="numeric"
                                    maxLength={14}
                                />

                                <SearchButton loading={loadingBuscar} label="Pesquisar" />

                                <button
                                    type="button"
                                    onClick={limparFormulario}
                                    className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                                >
                                    Limpar
                                </button>
                            </div>
                        </div>


                        <div className="flex flex-col gap-3 sm:flex-row xl:items-end">
                            <button
                                type="button"
                                onClick={salvar}
                                disabled={loadingSalvar}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FaSave />
                                {loadingSalvar
                                    ? "Salvando..."
                                    : modoEdicao
                                        ? "Salvar Alterações"
                                        : "Salvar Cadastro"}
                            </button>
                        </div>
                    </div>

                    {(erro || info) && (
                        <div className="mt-4">
                            {erro ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {erro}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                    {info}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <Section title="Dados do Titular">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-7">
                            <Field label="Nome">
                                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputBase} />
                            </Field>
                        </div>

                        <div className="md:col-span-5">
                            <Field label="Empresa">
                                <div className="space-y-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
                                    {empresas.length === 0 ? (
                                        <p className="text-sm text-slate-500">Nenhuma empresa carregada.</p>
                                    ) : (
                                        empresas.map((empresa) => (
                                            <label
                                                key={`${empresa.NR_MATRICULA}-${empresa.NR_CPF_CNPJ_EMPREGADOR}`}
                                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
                                            >
                                                <input
                                                    type="radio"
                                                    name="empresa"
                                                    checked={matriculaSelecionada === String(empresa.NR_MATRICULA)}
                                                    onChange={() =>
                                                        syncEmpresaSelecionada(String(empresa.NR_MATRICULA), empresas)
                                                    }
                                                    className="mt-1 h-4 w-4 accent-emerald-600"
                                                />

                                                <span className="text-sm text-slate-700">
                                                    <strong>Matrícula:</strong> {empresa.NR_MATRICULA}{" "}
                                                    <strong>— CNPJ:</strong> {empresa.NR_CPF_CNPJ_EMPREGADOR}{" "}
                                                    <strong>— Empresa:</strong> {empresa.NM_EMPRESA}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Convênio">
                                <select
                                    value={convenio}
                                    onChange={(e) => {
                                        setConvenio(e.target.value);
                                        setPlanoTitular("");
                                        setDependentes((old) =>
                                            old.map((item) => ({
                                                ...item,
                                                planoId: "",
                                            }))
                                        );
                                    }}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    <option value="2">HAPVIDA</option>
                                    <option value="1">UNIODONTO</option>
                                </select>
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Plano">
                                <select
                                    value={planoTitular}
                                    onChange={(e) => setPlanoTitular(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    {planosDisponiveis.map((plano) => (
                                        <option
                                            key={plano.ID_CONVENIO_FATOR_AJUSTE}
                                            value={String(plano.ID_CONVENIO_FATOR_AJUSTE)}
                                        >
                                            {plano.NM_FATOR_AJUSTE}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Cidade">
                                <select value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputBase}>
                                    <option value=""></option>
                                    <option value="CAMPOS DO JORDAO">Campos do Jordão</option>
                                    <option value="JACAREI">Jacareí</option>
                                    <option value="SAO JOSE DOS CAMPOS">São José dos Campos</option>
                                </select>
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Cod. Cartão">
                                <input
                                    value={codCartao}
                                    onChange={(e) => setCodCartao(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-8">
                            <Field label="Nome da Mãe">
                                <input
                                    value={nomeMae}
                                    onChange={(e) => setNomeMae(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Cod. Associado">
                                <input
                                    value={codAssociado}
                                    onChange={(e) => setCodAssociado(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Cod. Plano">
                                <input
                                    value={codPlano}
                                    onChange={(e) => setCodPlano(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Data de Nascimento">
                                <input
                                    type="date"
                                    value={dataNascimento}
                                    onChange={(e) => setDataNascimento(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Status do Titular">
                                <button
                                    type="button"
                                    onClick={() => setTitularAtivo((old) => !old)}
                                    className={`inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition ${titularAtivo
                                        ? "bg-emerald-600 text-white hover:brightness-95"
                                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    {titularAtivo ? "Ativo" : "Inativo"}
                                </button>
                            </Field>
                        </div>
                    </div>
                </Section>

                <Section title="Dependentes">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700">Dados dos Dependentes</h4>
                            <p className="text-xs text-slate-500">
                                Adicione, altere ou inative dependentes do convênio odontológico.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={adicionarDependente}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-third px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                        >
                            <FaPlus />
                            Adicionar Dependente
                        </button>
                    </div>

                    {dependentes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            Nenhum dependente adicionado.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dependentes.map((dep, index) => (
                                <div
                                    key={dep.localId}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <h5 className="text-sm font-bold text-slate-700">Dependente {index + 1}</h5>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => atualizarDependente(dep.localId, "ativo", !dep.ativo)}
                                                className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold shadow-sm transition ${dep.ativo
                                                    ? "bg-emerald-600 text-white"
                                                    : "border border-slate-300 bg-white text-slate-700"
                                                    }`}
                                            >
                                                {dep.ativo ? "Ativo" : "Inativo"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => removerDependente(dep.localId)}
                                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                                            >
                                                <FaTrash />
                                                Remover
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                                        <div className="md:col-span-4">
                                            <Field label="Nome">
                                                <input
                                                    value={dep.nome}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "nome", e.target.value)
                                                    }
                                                    className={inputBase}
                                                />
                                            </Field>
                                        </div>

                                        <div className="md:col-span-3">
                                            <Field label="CPF">
                                                <input
                                                    value={formatCpf(dep.cpf)}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "cpf", e.target.value)
                                                    }
                                                    className={inputBase}
                                                    maxLength={14}
                                                />
                                            </Field>
                                        </div>

                                        <div className="md:col-span-3">
                                            <Field label="Plano">
                                                <select
                                                    value={dep.planoId}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "planoId", e.target.value)
                                                    }
                                                    className={inputBase}
                                                >
                                                    <option value=""></option>
                                                    {planosDisponiveis.map((plano) => (
                                                        <option
                                                            key={plano.ID_CONVENIO_FATOR_AJUSTE}
                                                            value={String(plano.ID_CONVENIO_FATOR_AJUSTE)}
                                                        >
                                                            {plano.NM_FATOR_AJUSTE}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                        </div>

                                        <div className="md:col-span-2">
                                            <Field label="Parentesco">
                                                <select
                                                    value={dep.parentesco}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "parentesco", e.target.value)
                                                    }
                                                    className={inputBase}
                                                >
                                                    <option value=""></option>
                                                    {parentescos
                                                        .filter(
                                                            (item) => String(item.NM_PARENTESCO || "").toUpperCase() !== "TITULAR"
                                                        )
                                                        .map((item, idx) => (
                                                            <option key={`${item.NM_PARENTESCO}-${idx}`} value={item.NM_PARENTESCO}>
                                                                {item.NM_PARENTESCO}
                                                            </option>
                                                        ))}
                                                </select>
                                            </Field>
                                        </div>

                                        <div className="md:col-span-3">
                                            <Field label="Data de Nascimento">
                                                <input
                                                    type="date"
                                                    value={dep.dataNascimento}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "dataNascimento", e.target.value)
                                                    }
                                                    className={inputBase}
                                                />
                                            </Field>
                                        </div>

                                        <div className="md:col-span-5">
                                            <Field label="Nome da Mãe">
                                                <input
                                                    value={dep.nomeMae}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "nomeMae", e.target.value)
                                                    }
                                                    className={inputBase}
                                                />
                                            </Field>
                                        </div>

                                        <div className="md:col-span-4">
                                            <Field label="Cod. Cartão">
                                                <input
                                                    value={dep.codCartao}
                                                    onChange={(e) =>
                                                        atualizarDependente(dep.localId, "codCartao", e.target.value)
                                                    }
                                                    className={inputBase}
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Resumo">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-8">
                            <Field label="Observações">
                                <textarea
                                    rows={4}
                                    className={textareaBase}
                                    placeholder="Observações gerais do cadastro."
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Gasto total mensal">
                                <input
                                    readOnly
                                    value={fmtBRL(gastoMensal)}
                                    className={`${inputBase} bg-slate-50 text-right font-semibold`}
                                />
                            </Field>
                        </div>
                    </div>
                </Section>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-sm">
                            <p className="text-sm text-slate-500">
                                Revise os dados do titular e dos dependentes antes de salvar.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={salvar}
                                disabled={loadingSalvar}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FaSave />
                                {loadingSalvar
                                    ? "Salvando..."
                                    : modoEdicao
                                        ? "Salvar Alterações"
                                        : "Salvar Cadastro"}
                            </button>
                        </div>
                    </div>
                </div>
            </SearchForm>
        </div>
    );
}