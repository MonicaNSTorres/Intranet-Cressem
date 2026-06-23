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
import { rhContatoController } from "../controllers/rh-contato.controller";
import { reciboCrmController } from "../controllers/recibo-crm.controller";
import { autorizacaoDebitoController } from "../controllers/autorizacao-debito.controller";
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
  listarEstoqueGlpi,
  buscarEquipamentoGlpiPorId,
  testarItemtypeGlpi,
} from "../controllers/glpi.controller";
import { solicitacaoReembolsoDespesaPaginadoController } from "../controllers/solicitacao_reembolso_despesa_paginado.controller";
import { juntarPdfController } from "../controllers/juntar-pdf.controller";
import { producaoMetaCooperativaPaController } from "../controllers/producao-meta-cooperativa-pa.controller";
import { producaoMetaFuncionarioController } from "../controllers/producao-meta-funcionario.controller";
import { estoqueConsumiveisController } from "../controllers/estoque-consumiveis.controller";
import { GlpiService } from "../services/glpi.service";
import { feriasNotificacaoController } from "../controllers/ferias-notificacao.controller";
import { contratosNotificacaoController } from "../controllers/contratos-notificacao.controller";
import { buscarAcessosSemana } from "../controllers/dashboard.controller";
import { errorLogController } from "../controllers/errorlog.controller";
import { termosMensaisCaixaController } from "../controllers/termos-mensais-caixa.controller";
import { reservaSalaReuniaoController } from "../controllers/reserva-sala-reuniao.controller";
import { monitorMetaAlertasController } from "../controllers/monitor-meta-alertas.controller";
import { cnab240Controller } from "../controllers/cnab240.controller";
import { cnab240FavorecidosController } from "../controllers/cnab-favorecidos.controller";
import { cnab240CcoController } from "../controllers/cnab240-cco.controller";
import { cnab240AgenciasController } from "../controllers/cnab240-agencias.controller";
import { leiloesController } from "../controllers/leiloes.controller";

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

routes.get(
  "/v1/monitor-meta-alertas",
  authMiddleware,
  authorizeGroups(["GG_USERS_SUPORTE"]),
  monitorMetaAlertasController.listar
);

routes.patch(
  "/v1/monitor-meta-alertas/resolver",
  authMiddleware,
  authorizeGroups(["GG_USERS_SUPORTE"]),
  monitorMetaAlertasController.resolver
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

//notebook
routes.get("/v1/consulta-notebook", consultaNotebookController.listar);

routes.post("/v1/cadastro-notebook", cadastroNotebookController.criar);

routes.get("/v1/funcionarios-notebook", funcionariosNotebookController.listar);

routes.put(
  "/v1/consulta-notebook/:id",
  authMiddleware,
  editarNotebookController.atualizar
);

//ficha de desimpedimento
routes.get("/v1/ficha-desimpedimento/associado-por-cpf", fichaDesimpedimentoController.buscarAssociadoPorCpf);
routes.get("/v1/ficha-desimpedimento/proximo-sequencial", fichaDesimpedimentoController.proximoSequencial);
routes.get("/v1/ficha-desimpedimento/fichas", fichaDesimpedimentoController.listarFichas);
routes.get("/v1/ficha-desimpedimento/contas-devedoras", fichaDesimpedimentoController.listarContasDevedoras);
routes.get("/v1/ficha-desimpedimento/contas-credoras", fichaDesimpedimentoController.listarContasCredoras);
routes.get("/v1/ficha-desimpedimento/contas-bancarias", fichaDesimpedimentoController.listarContasBancarias);
routes.post("/v1/ficha-desimpedimento/fichas", authMiddleware, fichaDesimpedimentoController.criarFicha);
routes.put("/v1/ficha-desimpedimento/fichas", authMiddleware, fichaDesimpedimentoController.editarFicha);
routes.delete("/v1/ficha-desimpedimento/fichas", authMiddleware, fichaDesimpedimentoController.excluirFicha);

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

//reembolso convÃªnio mÃ©dico
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

routes.get(
  "/v1/demissao/convenio/:cpf",
  demissaoController.buscarConvenio
);

routes.post(
  "/v1/demissao/convenio/:cpf/desativacao",
  authMiddleware,
  demissaoController.desativarConvenio
);

routes.get(
  "/v1/demissao/motivos",
  demissaoController.buscarMotivos
);

routes.get(
  "/v1/demissao/cidades",
  demissaoController.buscarCidades
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

function singleUploadOrJson(fieldName: string) {
  return (req: any, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          error: "Falha no upload do arquivo.",
          details: String(err?.message || err),
        });
      }

      next();
    });
  };
}

routes.post(
  "/v1/marca_dagua",
  singleUploadOrJson("file"),
  marcaDaguaController.aplicarMarcaDagua
);

routes.post(
  "/v1/converter-arquivos",
  (req: any, res: any, next: any) => {
    upload.array("files")(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          error: "Falha no upload dos arquivos.",
          details: String(err?.message || err),
        });
      }

      next();
    });
  },
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
  authMiddleware,
  gerenciamentoCargoController.cadastrar
);

routes.put(
  "/v1/cargo_gerentes_sicoob_cressem/:id",
  authMiddleware,
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
  authMiddleware,
  gerenciamentoFuncionarioController.cadastrar
);

routes.put(
  "/v1/funcionarios_sicoob_cressem/:id",
  authMiddleware,
  gerenciamentoFuncionarioController.editar
);

routes.put(
  "/v1/funcionarios_sicoob_cressem/ativar_desativar/:id",
  authMiddleware,
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
  authMiddleware,
  gerenciamentoPosicaoController.cadastrar
);

routes.put(
  "/v1/posicao_sicoob/:id",
  authMiddleware,
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
  authMiddleware,
  gerenciamentoSetorController.cadastrar
);

routes.put(
  "/v1/setor_sicoob_cressem/:id",
  authMiddleware,
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
  authMiddleware,
  gerenciamentoFeriasController.cadastrar
);
routes.post(
  "/v1/ferias_funcionarios/importar-excel",
  upload.single("file"),
  gerenciamentoFeriasController.importarExcel
);
routes.post(
  "/v1/ferias_funcionarios/lote",
  gerenciamentoFeriasController.cadastrarLote
);

routes.put(
  "/v1/ferias_funcionarios/:id",
  authMiddleware,
  gerenciamentoFeriasController.editar
);

routes.get(
  "/v1/ferias_paginado",
  gerenciamentoFeriasController.listarPaginado
);

routes.delete(
  "/v1/ferias_funcionarios/:id",
  authMiddleware,
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
  authMiddleware,
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

routes.get(
  "/v1/migracao-contrato/buscar-cpf/:cpf",
  migracaoContratoController.buscarCpfMigracao //rota usada de fato na tela de migracao contrato
);

//cidade
routes.get("/v1/cidade", cidadeController.listar);

//patrocinio
routes.post("/v1/patrocinio_cressem", authMiddleware, patrocinioController.cadastrar);
routes.get("/v1/funcionarios_sicoob_cressem_patrocinio_paginado", patrocinioController.listarPaginado);
routes.get("/v1/patrocinio_cressem/:id", patrocinioController.buscarPorId);
routes.put("/v1/patrocinio_cressem/:id", authMiddleware, patrocinioController.editar);
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

routes.post("/v1/resgate-capital", authMiddleware, resgateCapitalController.criarResgate);
routes.post("/v1/resgate-capital/emprestimo", authMiddleware, resgateCapitalController.criarEmprestimo);
routes.post("/v1/resgate-capital/conta-corrente", authMiddleware, resgateCapitalController.criarContaCorrente);
routes.post("/v1/resgate-capital/cartao-credito", authMiddleware, resgateCapitalController.criarCartaoCredito);
routes.post("/v1/resgate-capital/conta-deposito", authMiddleware, resgateCapitalController.criarContaDeposito);
routes.post("/v1/resgate-capital/parcela", authMiddleware, resgateCapitalController.criarParcela);

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

// convenio odonto
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
  authMiddleware,
  convenioOdontoController.criar
);

routes.put(
  "/v1/pessoa_odontologica/id/:id",
  authMiddleware,
  convenioOdontoController.editar
);

routes.post(
  "/v1/pessoa_odontologica_historico",
  authMiddleware,
  convenioOdontoController.criarHistorico
);

routes.put(
  "/v1/pessoa_odontologica/desativar/cpf_titular/:cpf",
  authMiddleware,
  convenioOdontoController.desativarPorCpfTitular
);

routes.get(
  "/v1/download_pessoas_odontologicas_titular/:cpf",
  convenioOdontoController.downloadCsvTitular
);

//fator ajuste / gestao valor convenio
routes.get("/v1/fator_ajuste", fatorAjusteController.listar);

routes.get(
  "/v1/fator_ajuste/:id",
  fatorAjusteController.buscarPorId
);

routes.post(
  "/v1/fator_ajuste",
  authMiddleware,
  fatorAjusteController.criar
);

routes.put(
  "/v1/fator_ajuste/:id/usuario/:usuario",
  authMiddleware,
  fatorAjusteController.editar
);

//relatorio convenio odonto
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

//consulta contratos
routes.get(
  "/v1/contratos_empresas",
  consultaContratosController.listarPaginado
);

routes.get(
  "/v1/contratos_empresas/:id",
  consultaContratosController.buscarPorId
);

//contratos empresas
routes.post(
  "/v1/contratos_empresas",
  authMiddleware,
  contratosEmpresasController.criar
);

routes.put(
  "/v1/contratos_empresas/:id",
  authMiddleware,
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

routes.get(
  "/v1/rh_contato_contrato_lista/:id",
  rhContatoController.listarPorContrato
);

routes.post(
  "/v1/rh_contato/lote",
  rhContatoController.criarLote
);

routes.put(
  "/v1/rh_contato/lote/:id",
  rhContatoController.editarLote
);

//recibo crm
routes.post("/v1/recibo_crm", authMiddleware, reciboCrmController.criar);
routes.put("/v1/recibo_crm/:id", authMiddleware, reciboCrmController.editar);
routes.get("/v1/recibo_crm/:id", reciboCrmController.buscarPorId);

routes.get("/v1/tipo_atendimento_recibo", reciboCrmController.listarTiposAtendimento);
routes.get("/v1/categoria_contrato_recibo", reciboCrmController.listarCategoriasContrato);
routes.get("/v1/forma_pagamento_recibo", reciboCrmController.listarFormasPagamento);

routes.get("/v1/recibo_crm_paginado", reciboCrmController.listarPaginado);
routes.delete("/v1/recibo_crm/:id", authMiddleware, reciboCrmController.excluir);

//popup
routes.post(
  "/v1/popup-aviso",
  authMiddleware,
  criarPopupAviso
);

routes.get(
  "/v1/popup-aviso",
  authMiddleware,
  listarPopupsAviso
);

routes.get(
  "/v1/popup-aviso/:id",
  authMiddleware,
  buscarPopupAvisoPorId
);

routes.put(
  "/v1/popup-aviso/:id",
  authMiddleware,
  editarPopupAviso
);

routes.patch(
  "/v1/popup-aviso/:id/ativar",
  authMiddleware,
  ativarDesativarPopupAviso
);

routes.get("/v1/popup-aviso/pendente/me", authMiddleware, obterPopupPendenteDoUsuario);
routes.post("/v1/popup-aviso/responder", authMiddleware, responderPopupAviso);

routes.post(
  "/v1/solicitacao_reembolso_despesa",
  authMiddleware,
  solicitacaoReembolsoDespesaController.cadastrar
);

routes.put(
  "/v1/solicitacao_reembolso_despesa",
  authMiddleware,
  solicitacaoReembolsoDespesaController.editar
);

routes.get(
  "/v1/solicitacao_reembolso_despesa/funcionario/cpf/:cpf",
  authMiddleware,
  solicitacaoReembolsoDespesaController.buscarFuncionarioPorCpf
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
  authMiddleware,
  solicitacaoReembolsoDespesaController.decidir
);

routes.put(
  "/v1/solicitacao_reembolso_despesa/:id/concluir",
  authMiddleware,
  solicitacaoReembolsoDespesaController.concluir
);

routes.put(
  "/v1/solicitacao_reembolso_despesa_final/:id",
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
routes.get("/v1/glpi/estoque", listarEstoqueGlpi);
routes.get("/v1/glpi/estoque/:id", buscarEquipamentoGlpiPorId);
routes.get("/v1/glpi/test-itemtype", testarItemtypeGlpi);

routes.post("/v1/juntar-pdf", juntarPdfController);

routes.get(
  "/v1/producao-meta-cooperativa-pa",
  authMiddleware,
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

routes.get("/v1/estoque-consumiveis/itens", estoqueConsumiveisController.listarItens);
routes.post("/v1/estoque-consumiveis/itens", estoqueConsumiveisController.criarItem);

routes.post(
  "/v1/estoque-consumiveis/importar-excel",
  upload.single("file"),
  estoqueConsumiveisController.importarExcel
);

routes.get("/v1/estoque-consumiveis/solicitacoes-glpi", estoqueConsumiveisController.listarSolicitacoesGlpi);
routes.post("/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar", estoqueConsumiveisController.sincronizarChamadoManual);
routes.post("/v1/estoque-consumiveis/solicitacoes-glpi/:idSolicitacao/baixa", estoqueConsumiveisController.darBaixaSolicitacao);

routes.post("/v1/estoque-consumiveis/entrada", estoqueConsumiveisController.lancarEntrada);
routes.get("/v1/estoque-consumiveis/movimentacoes", estoqueConsumiveisController.listarMovimentacoes);

routes.get("/v1/estoque-consumiveis/balanco-mensal", estoqueConsumiveisController.buscarBalancoMensal);

routes.post(
  "/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar-real",
  estoqueConsumiveisController.sincronizarChamadosReaisGlpi
);

routes.get("/v1/glpi/test-ticket/:id", async (req, res) => {
  try {
    const glpiService = new GlpiService();
    const data = await glpiService.getTicketById(req.params.id);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.response?.data || error?.message,
    });
  }
});

routes.get("/v1/glpi/list-search-options-ticket", async (req, res) => {
  try {
    const glpiService = new GlpiService();
    const data = await glpiService.listSearchOptions("Ticket");
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.response?.data || error?.message,
    });
  }
});

routes.post(
  "/v1/estoque-consumiveis/solicitacoes-glpi/:idSolicitacao/resposta-manual",
  estoqueConsumiveisController.responderManualGlpi
);

routes.post(
  "/v1/estoque-consumiveis/solicitacoes-glpi/itens/:idSolicitacaoItem/baixa",
  estoqueConsumiveisController.darBaixaItemSolicitacao
);

routes.get("/estoque-consumiveis/alertas", estoqueConsumiveisController.verificarEstoqueCritico);

routes.post(
  "/v1/estoque-consumiveis/alertas/whatsapp",
  estoqueConsumiveisController.enviarAlertaWhatsapp
);

routes.post(
  "/v1/estoque-consumiveis/alertas/email",
  estoqueConsumiveisController.enviarAlertaEmail
);

routes.get(
  "/v1/estoque-consumiveis/alertas-email",
  estoqueConsumiveisController.listarAlertasEmail
);

routes.get(
  "/v1/estoque-consumiveis/painel-glpi",
  estoqueConsumiveisController.buscarPainelGlpiEstoque
);

routes.post(
  "/v1/estoque-consumiveis/saida-manual-glpi",
  estoqueConsumiveisController.registrarSaidaManualComGlpi
);

routes.get(
  "/v1/estoque-consumiveis/movimentacoes-mensais",
  estoqueConsumiveisController.listarMovimentacoesMensais
);

//automacao de ferias
routes.get(
  "/ferias-notificacao/executar-todas",
  feriasNotificacaoController.executarTodas
);

routes.get(
  "/ferias-notificacao/rh-diretoria",
  feriasNotificacaoController.executarRhDiretoria
);

routes.get(
  "/ferias-notificacao/gerencias",
  feriasNotificacaoController.executarGerencias
);

routes.get(
  "/ferias-notificacao/ti",
  feriasNotificacaoController.executarTi
);

routes.get(
  "/ferias-notificacao/previa-dia17",
  feriasNotificacaoController.executarPreviaDia17
);

//automacao de contratos
routes.get(
  "/v1/contratos-notificacao/executar",
  contratosNotificacaoController.executar
);


routes.get(
  "/v1/autorizacao-debito",
  autorizacaoDebitoController.listarContaCorrente
);

//grafico na home
routes.get("/v1/dashboard/acessos", buscarAcessosSemana);

//erros
routes.post("/v1/error-logs", errorLogController.criar);

//termos mensais caixa relatorio
routes.get(
  "/v1/termos-mensais-caixa/pas",
  termosMensaisCaixaController.listarPAs
);

routes.get(
  "/v1/termos-mensais-caixa",
  termosMensaisCaixaController.listar
);

routes.get(
  "/v1/termos-mensais-caixa/:id",
  termosMensaisCaixaController.obterPorId
);

routes.post(
  "/v1/termos-mensais-caixa",
  authMiddleware,
  termosMensaisCaixaController.criar
);

routes.put(
  "/v1/termos-mensais-caixa/:id",
  authMiddleware,
  termosMensaisCaixaController.atualizar
);

routes.patch(
  "/v1/termos-mensais-caixa/:id/status",
  authMiddleware,
  termosMensaisCaixaController.alterarStatus
);

routes.post(
  "/v1/termos-mensais-caixa/:id/assinado",
  authMiddleware,
  termosMensaisCaixaController.uploadAssinado
);

routes.get(
  "/v1/termos-mensais-caixa/:id/assinado/download",
  termosMensaisCaixaController.downloadAssinado
);

//reserva sala de reuniao
routes.post(
  "/v1/reserva_sala_reuniao",
  authMiddleware,
  reservaSalaReuniaoController.criar
);

routes.get(
  "/v1/reserva_sala_reuniao",
  reservaSalaReuniaoController.listar
);

routes.delete(
  "/v1/reserva_sala_reuniao/:id",
  authMiddleware,
  reservaSalaReuniaoController.cancelar
);

//cnab240
routes.get(
  "/v1/cnab240/remessas",
  authMiddleware,
  cnab240Controller.listarRemessas
);

routes.post(
  "/v1/cnab240/gerar",
  upload.single("file"),
  cnab240Controller.gerarCnab240
);

routes.post(
  "/v1/cnab240/importar-retorno",
  upload.single("file"),
  cnab240Controller.importarRetorno
);

routes.get(
  "/v1/cnab240/favorecido/:cpf",
  authMiddleware,
  cnab240Controller.buscarFavorecidoPorCpf
);

routes.post(
  "/v1/cnab240/gerar-transferencias",
  authMiddleware,
  cnab240Controller.gerarCnab240PorTransferencias
);

routes.get(
  "/v1/cnab240/remessas/:id/detalhes",
  authMiddleware,
  cnab240Controller.listarDetalhesRemessa
);

//cnab240 favorecidos
routes.get("/v1/cnab240/favorecidos", authMiddleware, cnab240FavorecidosController.listar);

routes.get("/v1/cnab240/favorecidos/cpf/:cpf", authMiddleware, cnab240FavorecidosController.buscarPorCpf);

routes.get("/v1/cnab240/favorecidos/:id", authMiddleware, cnab240FavorecidosController.buscarPorId);

routes.post("/v1/cnab240/favorecidos", authMiddleware, cnab240FavorecidosController.criar);

routes.put("/v1/cnab240/favorecidos/:id", authMiddleware, cnab240FavorecidosController.atualizar);

routes.delete("/v1/cnab240/favorecidos/:id", authMiddleware, cnab240FavorecidosController.excluir);

//cnab240 cco
routes.get(
  "/v1/cnab240/cco",
  authMiddleware,
  cnab240CcoController.listar
);

routes.get(
  "/v1/cnab240/cco/:id",
  authMiddleware,
  cnab240CcoController.buscarPorId
);

routes.post(
  "/v1/cnab240/cco",
  authMiddleware,
  cnab240CcoController.criar
);

routes.put(
  "/v1/cnab240/cco/:id",
  authMiddleware,
  cnab240CcoController.atualizar
);

routes.delete(
  "/v1/cnab240/cco/:id",
  authMiddleware,
  cnab240CcoController.excluir
);

routes.post(
  "/v1/cnab240/cco/importar-massa",
  authMiddleware,
  cnab240CcoController.importarEmMassa
);

//cnab agencias
routes.get(
  "/v1/cnab240/agencias",
  authMiddleware,
  cnab240AgenciasController.listar
);

routes.get(
  "/v1/cnab240/agencias/:id",
  authMiddleware,
  cnab240AgenciasController.buscarPorId
);

routes.post(
  "/v1/cnab240/agencias",
  authMiddleware,
  cnab240AgenciasController.criar
);

routes.put(
  "/v1/cnab240/agencias/:id",
  authMiddleware,
  cnab240AgenciasController.atualizar
);

routes.delete(
  "/v1/cnab240/agencias/:id",
  authMiddleware,
  cnab240AgenciasController.excluir
);

routes.post(
  "/v1/cnab240/agencias/importar-massa",
  authMiddleware,
  cnab240AgenciasController.importarEmMassa
);

//leiloes
routes.get(
  "/v1/leiloes",
  authMiddleware,
  leiloesController.listar
);

routes.get(
  "/v1/leiloes/:id",
  authMiddleware,
  leiloesController.buscarPorId
);

routes.post(
  "/v1/leiloes",
  authMiddleware,
  leiloesController.criar
);

routes.put(
  "/v1/leiloes/:id",
  authMiddleware,
  leiloesController.atualizar
);

routes.delete(
  "/v1/leiloes/:id",
  authMiddleware,
  leiloesController.excluir
);

routes.get(
  "/v1/leiloes/:id/lances",
  authMiddleware,
  leiloesController.listarLances
);

routes.post(
  "/v1/leiloes/:id/lances",
  authMiddleware,
  leiloesController.darLance
);

routes.get(
  "/v1/leiloes/:id/vencedor",
  authMiddleware,
  leiloesController.buscarVencedor
);

routes.get(
  "/v1/leiloes-finalizados",
  authMiddleware,
  leiloesController.listarFinalizados
);

routes.get(
  "/v1/leiloes-dashboard",
  authMiddleware,
  leiloesController.dashboard
);

export { routes };

