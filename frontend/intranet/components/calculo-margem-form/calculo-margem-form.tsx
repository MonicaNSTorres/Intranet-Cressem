"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import {
    fmtBRL,
    formatCpfView,
    monetizarDigitacao,
    onlyDigits,
    parseBRL,
} from "@/utils/br";
import {
    buscarAssociadoMargemPorCpf,
} from "@/services/calculo_margem.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function toMoney(value: number) {
    return fmtBRL(Number.isFinite(value) ? value : 0);
}

export function CalculoMargemForm() {
    const [cpf, setCpf] = useState("");
    const [nome, setNome] = useState("");
    const [empresa, setEmpresa] = useState("");

    const [vencimentos, setVencimentos] = useState("");
    const [trienio, setTrienio] = useState("");
    const [adcTempo, setAdcTempo] = useState("");

    const [inss, setInss] = useState("");
    const [irpf, setIrpf] = useState("");
    const [adicionalPericulosidade, setAdicionalPericulosidade] = useState("");
    const [adicionalNoturno, setAdicionalNoturno] = useState("");
    const [horasExtras, setHorasExtras] = useState("");
    const [dsr, setDsr] = useState("");
    const [outrosGanhos, setOutrosGanhos] = useState("");

    const [percentualConsiderado, setPercentualConsiderado] = useState("");

    const [convenioOdonto, setConvenioOdonto] = useState("");
    const [emprestimoCressem, setEmprestimoCressem] = useState("");
    const [emprestimoOutros, setEmprestimoOutros] = useState("");
    const [farmacia, setFarmacia] = useState("");
    const [integralizacao, setIntegralizacao] = useState("");
    const [assem, setAssem] = useState("");
    const [outrosSub, setOutrosSub] = useState("");
    const [planoSaude, setPlanoSaude] = useState("");
    const [seguroVida, setSeguroVida] = useState("");
    const [sindicato, setSindicato] = useState("");

    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    const vencimentosNum = useMemo(() => parseBRL(vencimentos), [vencimentos]);
    const trienioNum = useMemo(() => parseBRL(trienio), [trienio]);
    const adcTempoNum = useMemo(() => parseBRL(adcTempo), [adcTempo]);

    const inssNum = useMemo(() => parseBRL(inss), [inss]);
    const irpfNum = useMemo(() => parseBRL(irpf), [irpf]);
    const adicionalPericulosidadeNum = useMemo(
        () => parseBRL(adicionalPericulosidade),
        [adicionalPericulosidade]
    );
    const adicionalNoturnoNum = useMemo(
        () => parseBRL(adicionalNoturno),
        [adicionalNoturno]
    );
    const horasExtrasNum = useMemo(() => parseBRL(horasExtras), [horasExtras]);
    const dsrNum = useMemo(() => parseBRL(dsr), [dsr]);
    const outrosGanhosNum = useMemo(() => parseBRL(outrosGanhos), [outrosGanhos]);

    const convenioOdontoNum = useMemo(() => parseBRL(convenioOdonto), [convenioOdonto]);
    const emprestimoCressemNum = useMemo(() => parseBRL(emprestimoCressem), [emprestimoCressem]);
    const emprestimoOutrosNum = useMemo(() => parseBRL(emprestimoOutros), [emprestimoOutros]);
    const farmaciaNum = useMemo(() => parseBRL(farmacia), [farmacia]);
    const integralizacaoNum = useMemo(() => parseBRL(integralizacao), [integralizacao]);
    const assemNum = useMemo(() => parseBRL(assem), [assem]);
    const outrosSubNum = useMemo(() => parseBRL(outrosSub), [outrosSub]);
    const planoSaudeNum = useMemo(() => parseBRL(planoSaude), [planoSaude]);
    const seguroVidaNum = useMemo(() => parseBRL(seguroVida), [seguroVida]);
    const sindicatoNum = useMemo(() => parseBRL(sindicato), [sindicato]);

    const percentualNum = useMemo(() => {
        const parsed = Number(
            String(percentualConsiderado || "")
                .replace(",", ".")
                .replace(/[^\d.]/g, "")
        );

        return Number.isFinite(parsed) ? parsed : 0;
    }, [percentualConsiderado]);

    const totalGanhos = useMemo(() => {
        return vencimentosNum + trienioNum + adcTempoNum;
    }, [vencimentosNum, trienioNum, adcTempoNum]);

    const totalDescontosBase = useMemo(() => {
        return (
            inssNum +
            irpfNum +
            adicionalPericulosidadeNum +
            adicionalNoturnoNum +
            horasExtrasNum +
            dsrNum +
            outrosGanhosNum
        );
    }, [
        inssNum,
        irpfNum,
        adicionalPericulosidadeNum,
        adicionalNoturnoNum,
        horasExtrasNum,
        dsrNum,
        outrosGanhosNum,
    ]);

    const margemBase = useMemo(() => {
        return totalGanhos - totalDescontosBase;
    }, [totalGanhos, totalDescontosBase]);

    const margemConsiderada = useMemo(() => {
        if (!percentualNum) return margemBase;
        return (margemBase / 100) * percentualNum;
    }, [margemBase, percentualNum]);

    const subtotal = useMemo(() => {
        return (
            convenioOdontoNum +
            emprestimoCressemNum +
            emprestimoOutrosNum +
            farmaciaNum +
            integralizacaoNum +
            assemNum +
            outrosSubNum +
            planoSaudeNum +
            seguroVidaNum +
            sindicatoNum
        );
    }, [
        convenioOdontoNum,
        emprestimoCressemNum,
        emprestimoOutrosNum,
        farmaciaNum,
        integralizacaoNum,
        assemNum,
        outrosSubNum,
        planoSaudeNum,
        seguroVidaNum,
        sindicatoNum,
    ]);

    const margemDisponivel = useMemo(() => {
        return margemConsiderada - subtotal;
    }, [margemConsiderada, subtotal]);

    const onBuscar = async () => {
        setErro("");
        setInfo("");

        const clean = onlyDigits(cpf);

        if (!clean) {
            setErro("CPF do associado não preenchido.");
            return;
        }

        try {
            setLoading(true);

            const associado = await buscarAssociadoMargemPorCpf(clean);

            if (!associado?.found) {
                setErro("Associado não encontrado.");
                return;
            }

            setNome(associado.nome || "");
            setEmpresa(associado.empresa || "");
            setInfo("Dados do associado carregados com sucesso.");

        } catch (e: any) {
            setErro(e?.message || "Não foi possível buscar o associado.");
        } finally {
            setLoading(false);
        }
    };

    const alertMargemNegativa = margemDisponivel < 0;

    return (
        <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
            <SearchForm onSearch={onBuscar}>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        CPF do associado
                    </label>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                        <SearchInput
                            value={formatCpfView(cpf)}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="CPF do associado"
                            className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            inputMode="numeric"
                            maxLength={14}
                        />
                        <SearchButton loading={loading} label="Pesquisar" />
                    </div>

                    {erro && (
                        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {erro}
                        </div>
                    )}

                    {info && !erro && (
                        <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                            {info}
                        </div>
                    )}
                </div>
            </SearchForm>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Nome associado
                    </label>
                    <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                    />
                </div>

                <div className="md:col-span-7">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Empresa associado
                    </label>
                    <input
                        value={empresa}
                        onChange={(e) => setEmpresa(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                    />
                </div>
            </div>

            <div className="mt-6 rounded border p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-800">
                    Ganhos
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Vencimentos
                        </label>
                        <input
                            value={vencimentos}
                            onChange={(e) => setVencimentos(monetizarDigitacao(e.target.value))}
                            className="w-full rounded border px-3 py-2 text-right"
                            placeholder="R$ 0,00"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Triênio
                        </label>
                        <input
                            value={trienio}
                            onChange={(e) => setTrienio(monetizarDigitacao(e.target.value))}
                            className="w-full rounded border px-3 py-2 text-right"
                            placeholder="R$ 0,00"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Adicional de tempo serviço
                        </label>
                        <input
                            value={adcTempo}
                            onChange={(e) => setAdcTempo(monetizarDigitacao(e.target.value))}
                            className="w-full rounded border px-3 py-2 text-right"
                            placeholder="R$ 0,00"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Total de ganhos
                        </label>
                        <input
                            readOnly
                            value={toMoney(totalGanhos)}
                            className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded border p-4">
                    <h3 className="mb-4 text-sm font-semibold text-gray-800">
                        Base da margem
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        <CampoMoeda label="INSS" value={inss} setValue={setInss} />
                        <CampoMoeda label="IRPF (se tiver)" value={irpf} setValue={setIrpf} />
                        <CampoMoeda
                            label="Adicional de Periculosidade"
                            value={adicionalPericulosidade}
                            setValue={setAdicionalPericulosidade}
                        />
                        <CampoMoeda
                            label="Adicional Noturno"
                            value={adicionalNoturno}
                            setValue={setAdicionalNoturno}
                        />
                        <CampoMoeda
                            label="Horas Extras"
                            value={horasExtras}
                            setValue={setHorasExtras}
                        />
                        <CampoMoeda
                            label="DSR Sobre Horas Extras"
                            value={dsr}
                            setValue={setDsr}
                        />
                        <CampoMoeda
                            label="Outros"
                            value={outrosGanhos}
                            setValue={setOutrosGanhos}
                        />

                        <div className="grid grid-cols-1 gap-3 pt-3 md:grid-cols-12">
                            <div className="md:col-span-8">
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Margem considerada
                                </label>
                                <input
                                    readOnly
                                    value={toMoney(margemConsiderada)}
                                    className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                    % considerado
                                </label>
                                <input
                                    value={percentualConsiderado}
                                    onChange={(e) => setPercentualConsiderado(e.target.value)}
                                    className="w-full rounded border px-3 py-2 text-right"
                                    placeholder="Ex: 30"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded border p-4">
                    <h3 className="mb-4 text-sm font-semibold text-gray-800">
                        Descontos / Subtotal
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        <CampoMoeda
                            label="Convênio Odontológico"
                            value={convenioOdonto}
                            setValue={setConvenioOdonto}
                        />
                        <CampoMoeda
                            label="Empréstimo Cressem"
                            value={emprestimoCressem}
                            setValue={setEmprestimoCressem}
                        />
                        <CampoMoeda
                            label="Empréstimo Outros Bancos"
                            value={emprestimoOutros}
                            setValue={setEmprestimoOutros}
                        />
                        <CampoMoeda
                            label="Farmácia"
                            value={farmacia}
                            setValue={setFarmacia}
                        />
                        <CampoMoeda
                            label="Integralização"
                            value={integralizacao}
                            setValue={setIntegralizacao}
                        />
                        <CampoMoeda
                            label="Mensalidade ASSEM"
                            value={assem}
                            setValue={setAssem}
                        />
                        <CampoMoeda
                            label="Outros"
                            value={outrosSub}
                            setValue={setOutrosSub}
                        />
                        <CampoMoeda
                            label="Plano de Saúde"
                            value={planoSaude}
                            setValue={setPlanoSaude}
                        />
                        <CampoMoeda
                            label="Seguro de Vida"
                            value={seguroVida}
                            setValue={setSeguroVida}
                        />
                        <CampoMoeda
                            label="Sindicato"
                            value={sindicato}
                            setValue={setSindicato}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Margem disponível
                    </label>
                    <input
                        readOnly
                        value={toMoney(margemDisponivel)}
                        className={`w-full rounded border px-3 py-2 text-right ${alertMargemNegativa
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "bg-gray-50"
                            }`}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Subtotal
                    </label>
                    <input
                        readOnly
                        value={toMoney(subtotal)}
                        className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
                    />
                </div>
            </div>

            {alertMargemNegativa && (
                <div className="mt-6 rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    Atenção: margem negativa.
                </div>
            )}
        </div>
    );
}

type CampoMoedaProps = {
    label: string;
    value: string;
    setValue: React.Dispatch<React.SetStateAction<string>>;
};

function CampoMoeda({ label, value, setValue }: CampoMoedaProps) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
                {label}
            </label>
            <input
                value={value}
                onChange={(e) => setValue(monetizarDigitacao(e.target.value))}
                className="w-full rounded border px-3 py-2 text-right"
                placeholder="R$ 0,00"
            />
        </div>
    );
}