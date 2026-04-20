import { Router } from "express";
import { associadoController } from "../controllers/associado.controller";
import { associadoResidenciaController } from "../controllers/associados-residencia.controller";
import { kpiController } from "../controllers/kpiController";
import { ramaisController } from "../controllers/ramais.controller";
import { sisbrTiController } from '../controllers/sisbrTI.controller';
import { grDocumentMissingController } from "../controllers/gr-document-missing.controller";
import { docusignController } from "../controllers/docusign.controller";
import { authController } from "../controllers/auth.controller";
import { authorizeGroups } from "../middleware/authorize-groups.middleware";
import { consultaNotebookController } from "../controllers/consulta-notebook.controller";
import { cadastroNotebookController } from "../controllers/cadastro_notebook.controller";
import { funcionariosNotebookController } from "../controllers/funcionarios_notebook.controller";
import { editarNotebookController } from "../controllers/editar-notebook.controller";
import { fichaDesimpedimentoController } from "../controllers/ficha-desempedimento.controller";
import { bolsaEstudoController } from "../controllers/bolsa-estudo.controller";
import { reembolsoConvenioMedicoController } from "../controllers/reembolso-convenio-medico.controller";
import { auditoriaController } from "../controllers/auditoria.controller";
import { antecipacaoCapitalController } from "../controllers/antecipacao-capital.controller";
import { rcoController } from "../controllers/rco.controller";
import { demissaoController } from "../controllers/demissao.controller";
import { simuladorDescontoController } from "../controllers/simulador-deconto.controller";
import multer from "multer";
import { marcaDaguaController } from "../controllers/marca-dagua.controller";
import { conversorArquivosController } from "../controllers/conversor-arquivos.controller";
import { gerenciamentoCargoController } from "../controllers/gerenciamento-cargo.controller";
import { gerenciamentoFuncionarioController } from "../controllers/gerenciamento-funcionario.controller";
import { gerenciamentoPosicaoController } from "../controllers/gerenciamento-posicao.controller";
import { gerenciamentoSetorController } from "../controllers/gerenciamento-setor.controller";
import { gerenciamentoFeriasController } from "../controllers/gerenciamento-ferias.controller";
import { chequeEspecialController } from "../controllers/cheque-especial.controller";
import { migracaoContratoController } from "../controllers/migracao-contrato.controller";
import { patrocinioController } from "../controllers/patrocinio.controller";
import { cidadeController } from "../controllers/cidade.controller";
import { emailController } from "../controllers/email.controller";
import { resgateCapitalController } from "../controllers/resgate-capital.controller";
import { analiseLimiteController } from "../controllers/analise-limite.controller";
import { convenioOdontoController } from "../controllers/convenio-odonto.controller";
import { fatorAjusteController } from "../controllers/fator-ajuste.controller";
import { relatorioConvenioOdontoController } from "../controllers/relatorio-convenio-odonto.controller";
import { consultaContratosController } from "../controllers/consulta-contratos.controller";
import { contratosEmpresasController } from "../controllers/contratos-empresas.controller";
import { funcionariosSimplesController } from "../controllers/funcionarios-simples.controller";
import { emailContratoController } from "../controllers/email-contrato.controller";
import { reciboCrmController } from "../controllers/recibo-crm.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  criarPopupAviso,
  listarPopupsAviso,
  buscarPopupAvisoPorId,
  editarPopupAviso,
  ativarDesativarPopupAviso,
  obterPopupPendenteDoUsuario,
  responderPopupAviso,
} from "../controllers/popup-aviso.controller";
import { solicitacaoReembolsoDespesaController } from "../controllers/solicitacao-reembolso-despesa.controller";
import { tipoDespesaController } from "../controllers/tipo-despesa.controller";
import { emailInformativoFinanceiroController } from "../controllers/email-informativo-financeiro.controller";
import {
  glpiHealth,
  listarConsumiveisGlpi,
  buscarConsumivelGlpiPorId,
} from "../controllers/glpi.controller";
import { solicitacaoReembolsoDespesaPaginadoController } from "../controllers/solicitacao_reembolso_despesa_paginado.controller";
import { juntarPdfController } from "../controllers/juntar-pdf.controller";
import { producaoMetaCooperativaPaController } from "../controllers/producao-meta-cooperativa-pa.controller";
import { producaoMetaFuncionarioController } from "../controllers/producao-meta-funcionario.controller";

const routes = Router();

routes.get("/", (_req, res) => res.json({ message: "INTRANET-API" }));

routes.post("/v1/login_sem_automatico", authController.loginSemAutomatico);
routes.get("/v1/me", authMiddleware, authController.me);
routes.post("/v1/logout", authController.logout);

routes.get(
  "/v1/exemplo-cadastro",
  authMiddleware,
  authorizeGroups(["GG_USERS_CADASTRO", "GG_USERS_SUPORTE"]),
  (_req, res) => {
    return res.json({ ok: true });
  }
);

routes.get("/v1/associados/buscar-por-cpf", associadoController.buscarPorCpf);

routes.get(
  "/v1/associados/buscar-por-cpf-residencia",
  associadoResidenciaController.buscarPorCpfResidencia
);

routes.get("/v1/kpis/resumo", kpiController.resumo);

routes.get("/v1/aniversariantes/hoje", kpiController.aniversariantesHoje);

routes.get("/v1/aniversariantes", kpiController.aniversariantesPorMes);

routes.get("/v1/ramais", ramaisController.listar);

routes.get("/v1/tabela-sisbr-ti", sisbrTiController.listar);

routes.get("/v1/gr-document-missing", grDocumentMissingController.listar);

routes.get("/v1/download-from-db", docusignController.downloadFromDb);

routes.get("/v1/consulta-notebook", consultaNotebookController.listar);

routes.post("/v1/cadastro-notebook", cadastroNotebookController.criar);

routes.get("/v1/funcionarios-notebook", funcionariosNotebookController.listar);

routes.put("/v1/consulta-notebook/:id", editarNotebookController.atualizar);

//ficha de desimpedimento
routes.get("/v1/ficha-desimpedimento/associado-por-cpf", fichaDesimpedimentoController.buscarAssociadoPorCpf);
routes.get("/v1/ficha-desimpedimento/proximo-sequencial", fichaDesimpedimentoController.proximoSequencial);
routes.get("/v1/ficha-desimpedimento/fichas", fichaDesimpedimentoController.listarFichas);
routes.get("/v1/ficha-desimpedimento/contas-devedoras", fichaDesimpedimentoController.listarContasDevedoras);
routes.get("/v1/ficha-desimpedimento/contas-credoras", fichaDesimpedimentoController.listarContasCredoras);
routes.get("/v1/ficha-desimpedimento/contas-bancarias", fichaDesimpedimentoController.listarContasBancarias);
routes.post("/v1/ficha-desimpedimento/fichas", fichaDesimpedimentoController.criarFicha);
routes.put("/v1/ficha-desimpedimento/fichas", fichaDesimpedimentoController.editarFicha);
routes.delete("/v1/ficha-desimpedimento/fichas", fichaDesimpedimentoController.excluirFicha);

//bolsa de estudos
routes.get(
  "/v1/funcionarios_sicoob_cressem/nome/:nome",
  bolsaEstudoController.buscarFuncionarioPorNome
);

routes.get(
  "/v1/funcionarios_sicoob_cressem_unico/:codigo",
  bolsaEstudoController.buscarGerenciaPorCodigo
);

routes.get(
  "/v1/cidades",
  bolsaEstudoController.listarCidades
);

//reembolso convênio médico
routes.get(
  "/v1/reembolso-convenio-medico/funcionario/nome/:nome",
  reembolsoConvenioMedicoController.buscarFuncionarioPorNome
);

routes.get(
  "/v1/reembolso-convenio-medico/diretoria",
  reembolsoConvenioMedicoController.listarDiretoria
);

routes.get(
  "/v1/reembolso-convenio-medico/diretor/nome/:nome",
  reembolsoConvenioMedicoController.buscarDiretorPorNome
);

//auditoria
routes.get(
  "/v1/auditoria/associado/:cpfCnpj",
  auditoriaController.buscarAssociado
);

routes.get(
  "/v1/auditoria/:cpfCnpj",
  auditoriaController.buscarAuditoria
);

//antecipação de capital
routes.get(
  "/v1/antecipacao-capital/associado/:cpf",
  antecipacaoCapitalController.buscarAssociado
);

routes.get(
  "/v1/antecipacao-capital/cidades",
  antecipacaoCapitalController.listarCidades
);

routes.get(
  "/v1/rco/origens",
  rcoController.listarOrigens
);

routes.get(
  "/v1/rco/buscar",
  rcoController.buscarRco
);

routes.post(
  "/v1/rco/processar",
  rcoController.processaCalculoRco
);

routes.get(
  "/v1/demissao/associado/:cpf",
  demissaoController.buscarAssociado
);

//simulador de descontos
//associado
routes.get(
  "/v1/associado_analitico/:cpf",
  simuladorDescontoController.buscarAssociadoAnalitico
);

//tabelas auxiliares do simulador
routes.get(
  "/v1/simulador/anos-associado",
  simuladorDescontoController.listarAnosAssociado
);

routes.get(
  "/v1/simulador/anos-correntista",
  simuladorDescontoController.listarAnosCorrentista
);

routes.get(
  "/v1/simulador/cidades",
  simuladorDescontoController.listarCidades
);

routes.get(
  "/v1/simulador/classificacao-risco",
  simuladorDescontoController.listarClassificacaoRisco
);

routes.get(
  "/v1/simulador/correntista",
  simuladorDescontoController.listarCorrentista
);

routes.get(
  "/v1/simulador/outros-produtos",
  simuladorDescontoController.listarOutrosProdutos
);

routes.get(
  "/v1/simulador/portabilidade-salario",
  simuladorDescontoController.listarPortabilidadeSalario
);

routes.get(
  "/v1/simulador/taxa-trabalhador",
  simuladorDescontoController.listarTaxaTrabalhador
);

routes.get(
  "/v1/simulador/taxa-parcela",
  simuladorDescontoController.listarTaxaParcela
);

routes.get(
  "/v1/simulador/taxa-parcela/:parcela",
  simuladorDescontoController.buscarTaxaParcelaPorNumero
);

routes.get(
  "/v1/simulador/tempo-regime",
  simuladorDescontoController.listarTempoRegime
);

//salvar simulacao
routes.post(
  "/v1/simulacao",
  simuladorDescontoController.salvarSimulacao
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

routes.post(
  "/v1/marca_dagua",
  upload.single("file"),
  marcaDaguaController.aplicarMarcaDagua
);

routes.post(
  "/v1/converter-arquivos",
  upload.array("files"),
  conversorArquivosController.converter
);

//gerenciamento controller
routes.get(
  "/v1/cargo_gerentes_sicoob_cressem",
  gerenciamentoCargoController.listar
);

routes.get(
  "/v1/cargo_gerentes_sicoob_cressem_paginado",
  gerenciamentoCargoController.listarPaginado
);

routes.post(
  "/v1/cargo_gerentes_sicoob_cressem",
  gerenciamentoCargoController.cadastrar
);

routes.put(
  "/v1/cargo_gerentes_sicoob_cressem/:id",
  gerenciamentoCargoController.editar
);

routes.get(
  "/v1/posicao_sicoob",
  gerenciamentoCargoController.listarPosicoes
);

routes.get(
  "/v1/download_cargos",
  gerenciamentoCargoController.downloadCsv
);

routes.get(
  "/v1/funcionarios_sicoob_cressem",
  gerenciamentoFuncionarioController.listar
);

routes.get(
  "/v1/funcionarios_sicoob_cressem_paginado",
  gerenciamentoFuncionarioController.listarPaginado
);

routes.post(
  "/v1/funcionarios_sicoob_cressem",
  gerenciamentoFuncionarioController.cadastrar
);

routes.put(
  "/v1/funcionarios_sicoob_cressem/:id",
  gerenciamentoFuncionarioController.editar
);

routes.put(
  "/v1/funcionarios_sicoob_cressem/ativar_desativar/:id",
  gerenciamentoFuncionarioController.ativarDesativar
);

routes.get(
  "/v1/setor_sicoob_cressem",
  gerenciamentoFuncionarioController.listarSetores
);

routes.get(
  "/v1/funcionarios_sicoob_cressem_gerencia",
  gerenciamentoFuncionarioController.listarGerencias
);

routes.get(
  "/v1/download_funcionarios",
  gerenciamentoFuncionarioController.downloadCsv
);

routes.get("/v1/funcionarios/baixar-arquivo", gerenciamentoFuncionarioController.baixarArquivo);

routes.post(
  "/v1/funcionarios_sicoob_cressem_download",
  gerenciamentoFuncionarioController.baixarArquivo
);

// gerenciamento posicao
routes.get(
  "/v1/posicao_sicoob_paginado",
  gerenciamentoPosicaoController.listarPaginado
);

routes.post(
  "/v1/posicao_sicoob",
  gerenciamentoPosicaoController.cadastrar
);

routes.put(
  "/v1/posicao_sicoob/:id",
  gerenciamentoPosicaoController.editar
);

routes.get(
  "/v1/download_posicoes",
  gerenciamentoPosicaoController.downloadCsv
);

//gerenciamento setor
routes.get(
  "/v1/setor_sicoob_cressem",
  gerenciamentoSetorController.listar
);

routes.get(
  "/v1/setor_sicoob_cressem_paginado",
  gerenciamentoSetorController.listarPaginado
);

routes.post(
  "/v1/setor_sicoob_cressem",
  gerenciamentoSetorController.cadastrar
);

routes.put(
  "/v1/setor_sicoob_cressem/:id",
  gerenciamentoSetorController.editar
);

routes.get(
  "/v1/setor_sicoob_cressem_simples",
  gerenciamentoSetorController.listarSimples
);

routes.get(
  "/v1/download_setor",
  gerenciamentoSetorController.downloadCsv
);

//cadastro ferias
routes.get(
  "/v1/funcionarios_sicoob_cressem_unico/cpf/:cpf",
  gerenciamentoFeriasController.buscarFuncionarioPorCpf
);

routes.get(
  "/v1/funcionarios_sicoob_cressem/ferias/:id",
  gerenciamentoFeriasController.buscarFuncionarioComFerias
);

routes.post(
  "/v1/ferias_funcionarios",
  gerenciamentoFeriasController.cadastrar
);

routes.put(
  "/v1/ferias_funcionarios/:id",
  gerenciamentoFeriasController.editar
);

routes.get(
  "/v1/ferias_paginado",
  gerenciamentoFeriasController.listarPaginado
);

routes.delete(
  "/v1/ferias_funcionarios/:id",
  gerenciamentoFeriasController.excluirPeriodo
);

// cheque especial
routes.get(
  "/v1/atualizacao_cheque_especial",
  chequeEspecialController.listar
);

routes.get(
  "/v1/atualizacao_cheque_especial/paginado",
  chequeEspecialController.listarPaginado
);

routes.put(
  "/v1/atualizacao_cheque_especial/:id/:atendente/:data",
  chequeEspecialController.atualizar
);

routes.get(
  "/v1/download_alteracao_cheque_especial",
  chequeEspecialController.downloadCsv
);

//migracao contrato
routes.get(
  "/v1/migracao-contrato/cpf/:cpf",
  migracaoContratoController.buscarPorCpf
);

routes.post(
  "/v1/migracao-contrato/gerar-arquivo",
  migracaoContratoController.gerarArquivo
);

//cidade
routes.get("/v1/cidade", cidadeController.listar);

//patrocinio
routes.post("/v1/patrocinio_cressem", patrocinioController.cadastrar);
routes.get("/v1/funcionarios_sicoob_cressem_patrocinio_paginado", patrocinioController.listarPaginado);
routes.get("/v1/patrocinio_cressem/:id", patrocinioController.buscarPorId);
routes.put("/v1/patrocinio_cressem/:id", patrocinioController.editar);
routes.post("/v1/patrocinio/download", patrocinioController.downloadArquivo);
routes.get("/v1/download_patrocinios", patrocinioController.downloadCsv);

//funcionario tipo
routes.get(
  "/v1/funcionarios_sicoob_cressem/nome_tipo/:nome",
  gerenciamentoFuncionarioController.buscarNomeTipo
);

//emails
routes.get(
  "/v1/email_informativo_gerencia/funcionario/:funcionario/empresa/:empresa/patrocinio/:id",
  emailController.emailGerencia
);

routes.get(
  "/v1/email_informativo_diretoria/funcionario/:funcionario/empresa/:empresa/patrocinio/:id",
  emailController.emailDiretoria
);

routes.get(
  "/v1/email_informativo_conselho/patrocinio/:id",
  emailController.emailConselho
);

routes.get(
  "/v1/email_informativo_parecer_final/tipo_funcionario/:tipo/patrocinio/:id",
  emailController.emailParecerFinal
);

//resgate capital
routes.get("/v1/resgate-capital/motivos", resgateCapitalController.buscarMotivos);
routes.get("/v1/resgate-capital/autorizacoes", resgateCapitalController.buscarAutorizacoes);
routes.get("/v1/resgate-capital/cidades", resgateCapitalController.buscarCidades);
routes.get("/v1/resgate-capital/emprestimos", resgateCapitalController.buscarEmprestimosPorCpf);
routes.get("/v1/resgate-capital/associado-id", resgateCapitalController.buscarIdAssociado);
routes.get("/v1/resgate-capital/dia-util", resgateCapitalController.buscarDiaUtil);

routes.post("/v1/resgate-capital", resgateCapitalController.criarResgate);
routes.post("/v1/resgate-capital/emprestimo", resgateCapitalController.criarEmprestimo);
routes.post("/v1/resgate-capital/conta-corrente", resgateCapitalController.criarContaCorrente);
routes.post("/v1/resgate-capital/cartao-credito", resgateCapitalController.criarCartaoCredito);
routes.post("/v1/resgate-capital/conta-deposito", resgateCapitalController.criarContaDeposito);
routes.post("/v1/resgate-capital/parcela", resgateCapitalController.criarParcela);

//analise limite
routes.post("/v1/analise_limite_cheque_cartao", analiseLimiteController.criar);
routes.get("/v1/analise_limite_cheque_cartao", analiseLimiteController.listarPaginado);
routes.get("/v1/analise_limite_cheque_cartao/:id", analiseLimiteController.buscarPorId);

routes.post(
  "/v1/analise_limite_cheque_cartao",
  analiseLimiteController.criar
);

routes.get(
  "/v1/analise_limite_cheque_cartao",
  analiseLimiteController.listarPaginado
);

routes.get(
  "/v1/analise_limite_cheque_cartao/:id",
  analiseLimiteController.buscarPorId
);

routes.put(
  "/v1/analise_limite_cheque_cartao_upload",
  analiseLimiteController.uploadAssinatura
);

routes.post(
  "/v1/analise_limite_cheque_cartao_download",
  analiseLimiteController.downloadAssinatura
);

// convênio odonto
routes.get("/v1/fator_ajuste", convenioOdontoController.listarFatorAjuste);
routes.get("/v1/parentesco", convenioOdontoController.listarParentesco);

routes.get(
  "/v1/pessoa_odontologica/cpf_titular/:cpf",
  convenioOdontoController.buscarCpfTitular
);

routes.get(
  "/v1/pessoa_odontologica/cpf_titular_unico/:cpf",
  convenioOdontoController.buscarCpfTitularUnico
);

routes.get(
  "/v1/pessoa_odontologica/cpf_usuario/:cpf",
  convenioOdontoController.buscarCpfUsuario
);

routes.get(
  "/v1/pessoa_odontologica/todos_cpf_usuario/:cpf",
  convenioOdontoController.buscarTodosCpfUsuario
);

routes.get(
  "/v1/pessoa_odontologica/cpf_usuario/lista/:cpf",
  convenioOdontoController.buscarCpfUsuarioLista
);

routes.get(
  "/v1/pessoa_odontologica/cpf_usuario/sem_cpf/:nome",
  convenioOdontoController.buscarUsuarioSemCpf
);

routes.get(
  "/v1/pessoa_odontologica/cod_associado/:cod",
  convenioOdontoController.buscarPorCodAssociado
);

routes.get(
  "/v1/pessoa_odontologica/cod_cartao/:cod/cpf_usuario/:cpf_usuario/cpf_titular/:cpf_titular/nome/:nome",
  convenioOdontoController.buscarPorCodCartao
);

routes.get(
  "/v1/pessoa_odontologica/total_custo_e_status/:cpf",
  convenioOdontoController.totalCustoEStatus
);

routes.post(
  "/v1/pessoa_odontologica",
  convenioOdontoController.criar
);

routes.put(
  "/v1/pessoa_odontologica/id/:id",
  convenioOdontoController.editar
);

routes.post(
  "/v1/pessoa_odontologica_historico",
  convenioOdontoController.criarHistorico
);

routes.put(
  "/v1/pessoa_odontologica/desativar/cpf_titular/:cpf",
  convenioOdontoController.desativarPorCpfTitular
);

routes.get(
  "/v1/download_pessoas_odontologicas_titular/:cpf",
  convenioOdontoController.downloadCsvTitular
);

// fator ajuste / gestão valor convênio
routes.get("/v1/fator_ajuste", fatorAjusteController.listar);

routes.get(
  "/v1/fator_ajuste/:id",
  fatorAjusteController.buscarPorId
);

routes.post(
  "/v1/fator_ajuste",
  fatorAjusteController.criar
);

routes.put(
  "/v1/fator_ajuste/:id/usuario/:usuario",
  fatorAjusteController.editar
);

// relatórios convênio odonto
routes.get(
  "/v1/download_pessoas_odontologicas",
  relatorioConvenioOdontoController.downloadContratantes
);

routes.get(
  "/v1/download_custo_odonto",
  relatorioConvenioOdontoController.downloadHistoricoCusto
);

routes.get(
  "/v1/download_pessoas_odontologicas_maior_idade",
  relatorioConvenioOdontoController.downloadMaiorIdade
);

routes.get(
  "/v1/download_pessoas_odontologicas_folha",
  relatorioConvenioOdontoController.downloadFolha
);

// consulta contratos
routes.get(
  "/v1/contratos_empresas",
  consultaContratosController.listarPaginado
);

routes.get(
  "/v1/contratos_empresas/:id",
  consultaContratosController.buscarPorId
);

// contratos empresas
routes.post(
  "/v1/contratos_empresas",
  contratosEmpresasController.criar
);

routes.put(
  "/v1/contratos_empresas/:id",
  contratosEmpresasController.editar
);

routes.get(
  "/v1/contratos_empresas",
  contratosEmpresasController.listarPaginado
);

routes.get(
  "/v1/contratos_empresas/:id",
  contratosEmpresasController.buscarPorId
);

routes.get(
  "/v1/contratos_empresas_cidades",
  contratosEmpresasController.listarCidades
);

routes.get(
  "/v1/contratos_empresas_tipo",
  contratosEmpresasController.listarTiposContrato
);

routes.get(
  "/v1/contratos_empresas_sistema",
  contratosEmpresasController.listarSistemas
);

routes.get(
  "/v1/funcionarios_simples_email_sicoob_cressem",
  funcionariosSimplesController.listarEmails
);

routes.get(
  "/v1/funcionarios_sicoob_cressem/email/:email",
  funcionariosSimplesController.buscarPorEmail
);

routes.post(
  "/v1/email_contrato",
  emailContratoController.criar
);

routes.get(
  "/v1/email_contrato/contrato/:id",
  emailContratoController.listarPorContrato
);

routes.get(
  "/v1/email_contrato/funcionario/:id",
  emailContratoController.listarPorFuncionario
);

routes.delete(
  "/v1/email_contrato/:id",
  emailContratoController.remover
);

routes.post("/v1/recibo_crm", reciboCrmController.criar);
routes.put("/v1/recibo_crm/:id", reciboCrmController.editar);
routes.get("/v1/recibo_crm/:id", reciboCrmController.buscarPorId);

routes.get("/v1/tipo_atendimento_recibo", reciboCrmController.listarTiposAtendimento);
routes.get("/v1/categoria_contrato_recibo", reciboCrmController.listarCategoriasContrato);
routes.get("/v1/forma_pagamento_recibo", reciboCrmController.listarFormasPagamento);

routes.get("/v1/recibo_crm_paginado", reciboCrmController.listarPaginado);
routes.delete("/v1/recibo_crm/:id", reciboCrmController.excluir);

routes.post("/v1/popup-aviso", criarPopupAviso);
routes.get("/v1/popup-aviso", listarPopupsAviso);
routes.get("/v1/popup-aviso/:id", buscarPopupAvisoPorId);
routes.put("/v1/popup-aviso/:id", editarPopupAviso);
routes.patch("/v1/popup-aviso/:id/ativar", ativarDesativarPopupAviso);

routes.get("/v1/popup-aviso/pendente/me", authMiddleware, obterPopupPendenteDoUsuario);
routes.post("/v1/popup-aviso/responder", authMiddleware, responderPopupAviso);

routes.post(
  "/v1/solicitacao_reembolso_despesa",
  solicitacaoReembolsoDespesaController.cadastrar
);

routes.put(
  "/v1/solicitacao_reembolso_despesa",
  solicitacaoReembolsoDespesaController.editar
);

routes.get(
  "/v1/solicitacao_reembolso_despesa/:id",
  solicitacaoReembolsoDespesaController.buscarPorId
);

routes.post(
  "/v1/solicitacao_reembolso_despesa/download",
  solicitacaoReembolsoDespesaController.downloadComprovante
);

routes.put(
  "/v1/solicitacao_reembolso_despesa/:id/decisao/name/:nomeResponsavel",
  solicitacaoReembolsoDespesaController.decidir
);

routes.put(
  "/v1/solicitacao_reembolso_despesa/:id/concluir",
  solicitacaoReembolsoDespesaController.concluir
);

routes.get("/v1/tipo_despesa", tipoDespesaController.listar);

routes.get(
  "/v1/email_informativo_financeiro/funcionario/:funcionario/solicitacao/:id",
  emailInformativoFinanceiroController.enviar
);

routes.get(
  "/v1/solicitacao_reembolso_despesa_paginado",
  solicitacaoReembolsoDespesaPaginadoController.listar
);

routes.get("/v1/glpi/health", glpiHealth);
routes.get("/v1/glpi/consumables", listarConsumiveisGlpi);
routes.get("/v1/glpi/consumables/:id", buscarConsumivelGlpiPorId);

routes.post("/v1/juntar-pdf", juntarPdfController);

routes.get(
  "/v1/producao-meta-cooperativa-pa",
  producaoMetaCooperativaPaController.listar
);

routes.get(
  "/v1/producao-meta-cooperativa-pa/datas",
  producaoMetaCooperativaPaController.datas
);

routes.get(
  "/v1/producao-meta-funcionario",
  authMiddleware,
  producaoMetaFuncionarioController.listar
);

routes.get(
  "/v1/producao-meta-funcionario/datas",
  authMiddleware,
  producaoMetaFuncionarioController.datas
);

export { routes };