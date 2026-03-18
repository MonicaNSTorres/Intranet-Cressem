import { Router } from "express";
import { associadoController } from "../controllers/associado.controller";
import { associadoResidenciaController } from "../controllers/associados-residencia.controller";
import { kpiController } from "../controllers/kpiController";
import { ramaisController } from "../controllers/ramais.controller";
import { sisbrTiController } from '../controllers/sisbrTI.controller';
import { grDocumentMissingController } from "../controllers/gr-document-missing.controller";
import { docusignController } from "../controllers/docusign.controller";
import { authController } from "../controllers/auth.controller";
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

const routes = Router();

routes.get("/", (_req, res) => res.json({ message: "INTRANET-API" }));

routes.post("/v1/login_sem_automatico", authController.loginSemAutomatico);
routes.get("/v1/me", authController.me);
routes.post("/v1/logout", authController.logout);

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

// bolsa de estudos
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

// reembolso convênio médico
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

// auditoria
routes.get(
  "/v1/auditoria/associado/:cpfCnpj",
  auditoriaController.buscarAssociado
);

routes.get(
  "/v1/auditoria/:cpfCnpj",
  auditoriaController.buscarAuditoria
);

// antecipação de capital
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

export { routes };