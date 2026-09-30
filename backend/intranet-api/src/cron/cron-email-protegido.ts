import cron, { type TaskFn, type TaskOptions } from "node-cron";
import { executarCronComValidacaoIpEmail } from "../services/email.service";

const cronEmailProtegido = {
  schedule(expressao: string, tarefa: TaskFn, opcoes?: TaskOptions) {
    return cron.schedule(
      expressao,
      (contexto) => executarCronComValidacaoIpEmail(() => tarefa(contexto)),
      opcoes
    );
  },
};

export default cronEmailProtegido;
