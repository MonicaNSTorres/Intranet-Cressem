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

const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
const fieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const readOnlyClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 shadow-sm outline-none";
const sectionClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const sectionTitleClass = "flex items-center gap-2 text-base font-semibold text-title";

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
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

            <div className="space-y-5 p-5 md:p-6">
                <SearchForm onSearch={onBuscar} className={sectionClass}>
                    <div className="mb-4">
                        <h2 className={sectionTitleClass}>
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Consulta do associado
                        </h2>
                        <p className="mt-1 text-sm text-paragraph">
                            Informe o CPF para carregar os dados principais antes do cálculo.
                        </p>
                    </div>

                    <label className={labelClass}>CPF do associado</label>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                            <SearchInput
                                value={formatCpfView(cpf)}
                                onChange={(e) => setCpf(e.target.value)}
                                placeholder="CPF do associado"
                                className="h-10 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary/15"
                                inputMode="numeric"
                                maxLength={14}
                            />
                            <SearchButton loading={loading} label="Pesquisar" />
                        </div>

                        {erro && (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {erro}
                            </div>
                        )}

                        {info && !erro && (
                            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                {info}
                            </div>
                        )}
                </SearchForm>

                <section className={sectionClass}>
                    <div className="mb-4">
                        <h2 className={sectionTitleClass}>
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Dados do associado
                        </h2>
                        <p className="mt-1 text-sm text-paragraph">
                            Confirme ou ajuste os dados carregados pela consulta.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-5">
                            <label className={labelClass}>Nome associado</label>
                            <input
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <div className="md:col-span-7">
                            <label className={labelClass}>Empresa associado</label>
                            <input
                                value={empresa}
                                onChange={(e) => setEmpresa(e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </section>

                <section className={sectionClass}>
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className={sectionTitleClass}>
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                Ganhos
                            </h2>
                            <p className="mt-1 text-sm text-paragraph">
                                Base de vencimentos usada para iniciar o cálculo.
                            </p>
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            Total: {toMoney(totalGanhos)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <label className={labelClass}>Vencimentos</label>
                        <input
                            value={vencimentos}
                            onChange={(e) => setVencimentos(monetizarDigitacao(e.target.value))}
                            className={`${fieldClass} text-right`}
                            placeholder="R$ 0,00"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Triênio</label>
                        <input
                            value={trienio}
                            onChange={(e) => setTrienio(monetizarDigitacao(e.target.value))}
                            className={`${fieldClass} text-right`}
                            placeholder="R$ 0,00"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Adicional de tempo serviço</label>
                        <input
                            value={adcTempo}
                            onChange={(e) => setAdcTempo(monetizarDigitacao(e.target.value))}
                            className={`${fieldClass} text-right`}
                            placeholder="R$ 0,00"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Total de ganhos</label>
                        <input
                            readOnly
                            value={toMoney(totalGanhos)}
                            className={`${readOnlyClass} text-right`}
                        />
                    </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <section className={sectionClass}>
                        <div className="mb-4">
                            <h2 className={sectionTitleClass}>
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                Base da margem
                            </h2>
                            <p className="mt-1 text-sm text-paragraph">
                                Descontos considerados antes de aplicar o percentual.
                            </p>
                        </div>

                    <div className="grid grid-cols-1 gap-4">
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

                        <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-12">
                            <div className="md:col-span-8">
                                <label className={labelClass}>Margem considerada</label>
                                <input
                                    readOnly
                                    value={toMoney(margemConsiderada)}
                                    className={`${readOnlyClass} text-right`}
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label className={labelClass}>% considerado</label>
                                <input
                                    value={percentualConsiderado}
                                    onChange={(e) => setPercentualConsiderado(e.target.value)}
                                    className={`${fieldClass} text-right`}
                                    placeholder="Ex: 30"
                                />
                            </div>
                        </div>
                    </div>
                    </section>

                    <section className={sectionClass}>
                        <div className="mb-4">
                            <h2 className={sectionTitleClass}>
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                Descontos / Subtotal
                            </h2>
                            <p className="mt-1 text-sm text-paragraph">
                                Valores que serão abatidos da margem considerada.
                            </p>
                        </div>

                    <div className="grid grid-cols-1 gap-4">
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
                    </section>
                </div>

            <section className={sectionClass}>
                <div className="mb-4">
                    <h2 className={sectionTitleClass}>
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        Resultado da margem
                    </h2>
                    <p className="mt-1 text-sm text-paragraph">
                        Conferência final do subtotal e da margem disponível.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className={labelClass}>Margem disponível</label>
                    <input
                        readOnly
                        value={toMoney(margemDisponivel)}
                        className={`h-10 w-full rounded-xl border px-3 text-right text-sm font-semibold shadow-sm outline-none ${alertMargemNegativa
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                            }`}
                    />
                </div>

                <div>
                    <label className={labelClass}>Subtotal</label>
                    <input
                        readOnly
                        value={toMoney(subtotal)}
                        className={`${readOnlyClass} text-right`}
                    />
                </div>
                </div>

                {alertMargemNegativa && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                        Atenção: margem negativa.
                    </div>
                )}
            </section>
            </div>
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
            <label className={labelClass}>{label}</label>
            <input
                value={value}
                onChange={(e) => setValue(monetizarDigitacao(e.target.value))}
                className={`${fieldClass} text-right`}
                placeholder="R$ 0,00"
            />
        </div>
    );
}
