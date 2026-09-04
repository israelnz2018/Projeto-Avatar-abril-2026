/**
 * Tradução da interface do bpmn-js para português.
 *
 * A biblioteca expõe um módulo `translate` que ela consulta para CADA texto de
 * interface (paleta, menu de contexto, menu de troca de elemento). Sobrescrevendo
 * esse módulo, tudo aparece em português sem tocar no código da biblioteca.
 *
 * As chaves são os textos EXATOS em inglês — extraídos do código do bpmn-js 18.27,
 * não digitados de memória. Chave que não estiver aqui cai no texto original em
 * inglês, então faltar tradução nunca quebra a tela.
 *
 * A terminologia segue o Kit Mapeando na Prática e o vocabulário BPMN em português
 * usado no Bizagi: raia, piscina, evento, atividade, desvio.
 */

const DICIONARIO: Record<string, string> = {
  // ---------- Paleta (barra de ferramentas à esquerda) ----------
  'Activate hand tool': 'Mover a tela (mãozinha)',
  'Activate lasso tool': 'Selecionar vários por laço',
  'Activate create/remove space tool': 'Criar ou remover espaço',
  'Activate global connect tool': 'Conectar elementos',
  'Create start event': 'Evento inicial (começo do processo)',
  'Create intermediate/boundary event': 'Evento intermediário ou de borda',
  'Create end event': 'Evento final (fim do processo)',
  'Create gateway': 'Desvio / decisão (losango)',
  'Create task': 'Atividade (tarefa)',
  'Create expanded sub-process': 'Subprocesso expandido',
  'Create data object reference': 'Objeto de dados (documento)',
  'Create data store reference': 'Banco de dados',
  'Create pool/participant': 'Piscina (participante)',
  'Create group': 'Grupo (moldura)',

  // ---------- Menu de contexto (aparece ao clicar num elemento) ----------
  'Append task': 'Adicionar atividade em seguida',
  'Append end event': 'Adicionar evento final em seguida',
  'Append gateway': 'Adicionar desvio em seguida',
  'Append intermediate/boundary event': 'Adicionar evento intermediário em seguida',
  'Append receive task': 'Adicionar atividade de recebimento',
  'Append message intermediate catch event': 'Adicionar evento de mensagem recebida',
  'Append timer intermediate catch event': 'Adicionar evento de tempo (timer)',
  'Append conditional intermediate catch event': 'Adicionar evento condicional',
  'Append signal intermediate catch event': 'Adicionar evento de sinal',
  'Append compensation activity': 'Adicionar atividade de compensação',
  'Change element': 'Trocar o tipo do elemento',
  'Connect to other element': 'Ligar a outro elemento',
  'Connect using association': 'Ligar por associação (linha pontilhada)',
  'Connect using data input association': 'Ligar como entrada de dados',
  Delete: 'Excluir',
  'Add lane above': 'Adicionar raia acima',
  'Add lane below': 'Adicionar raia abaixo',
  'Divide into two lanes': 'Dividir em duas raias',
  'Divide into three lanes': 'Dividir em três raias',
  'Add text annotation': 'Adicionar anotação de texto',

  // ---------- Alinhamento e busca ----------
  'Align elements': 'Alinhar elementos',
  'Align elements ': 'Alinhar elementos ',
  'Distribute elements horizontally': 'Distribuir na horizontal',
  'Distribute elements vertically': 'Distribuir na vertical',
  'Search in diagram': 'Buscar no diagrama',
  'Open {element}': 'Abrir {element}',
  'Toggle non-interrupting': 'Alternar interrompe / não interrompe',

  // ---------- Tipos de fluxo (é aqui que se troca cheia por tracejada) ----------
  'Sequence flow': 'Fluxo de sequência (linha cheia)',
  'Default flow': 'Fluxo padrão (caminho "senão")',
  'Conditional flow': 'Fluxo condicional',

  // ---------- Eventos ----------
  'Start event': 'Evento inicial',
  'End event': 'Evento final',
  'Intermediate throw event': 'Evento intermediário de disparo',
  'Boundary event': 'Evento de borda',
  'Message start event': 'Evento inicial de mensagem',
  'Message start event (non-interrupting)': 'Evento inicial de mensagem (não interrompe)',
  'Message intermediate catch event': 'Evento intermediário: recebe mensagem',
  'Message intermediate throw event': 'Evento intermediário: envia mensagem',
  'Message end event': 'Evento final de mensagem',
  'Message boundary event': 'Evento de borda: mensagem',
  'Message boundary event (non-interrupting)': 'Evento de borda: mensagem (não interrompe)',
  'Timer start event': 'Evento inicial de tempo',
  'Timer start event (non-interrupting)': 'Evento inicial de tempo (não interrompe)',
  'Timer intermediate catch event': 'Evento intermediário de tempo',
  'Timer boundary event': 'Evento de borda: tempo',
  'Timer boundary event (non-interrupting)': 'Evento de borda: tempo (não interrompe)',
  'Conditional start event': 'Evento inicial condicional',
  'Conditional start event (non-interrupting)': 'Evento inicial condicional (não interrompe)',
  'Conditional intermediate catch event': 'Evento intermediário condicional',
  'Conditional boundary event': 'Evento de borda: condição',
  'Conditional boundary event (non-interrupting)': 'Evento de borda: condição (não interrompe)',
  'Signal start event': 'Evento inicial de sinal',
  'Signal start event (non-interrupting)': 'Evento inicial de sinal (não interrompe)',
  'Signal intermediate catch event': 'Evento intermediário: recebe sinal',
  'Signal intermediate throw event': 'Evento intermediário: envia sinal',
  'Signal end event': 'Evento final de sinal',
  'Signal boundary event': 'Evento de borda: sinal',
  'Signal boundary event (non-interrupting)': 'Evento de borda: sinal (não interrompe)',
  'Error start event': 'Evento inicial de erro',
  'Error end event': 'Evento final de erro',
  'Error boundary event': 'Evento de borda: erro',
  'Escalation start event': 'Evento inicial de escalonamento',
  'Escalation start event (non-interrupting)': 'Evento inicial de escalonamento (não interrompe)',
  'Escalation intermediate throw event': 'Evento intermediário de escalonamento',
  'Escalation end event': 'Evento final de escalonamento',
  'Escalation boundary event': 'Evento de borda: escalonamento',
  'Escalation boundary event (non-interrupting)': 'Evento de borda: escalonamento (não interrompe)',
  'Compensation start event': 'Evento inicial de compensação',
  'Compensation intermediate throw event': 'Evento intermediário de compensação',
  'Compensation end event': 'Evento final de compensação',
  'Compensation boundary event': 'Evento de borda: compensação',
  'Cancel end event': 'Evento final de cancelamento',
  'Cancel boundary event': 'Evento de borda: cancelamento',
  'Terminate end event': 'Evento final de encerramento total',
  'Link intermediate catch event': 'Evento intermediário: recebe link',
  'Link intermediate throw event': 'Evento intermediário: envia link',

  // ---------- Desvios (gateways) ----------
  'Exclusive gateway': 'Desvio exclusivo (ou um, ou outro)',
  'Parallel gateway': 'Desvio paralelo (todos os caminhos)',
  'Inclusive gateway': 'Desvio inclusivo (um ou mais)',
  'Complex gateway': 'Desvio complexo',
  'Event-based gateway': 'Desvio baseado em evento',
  'Event based instantiating Gateway': 'Desvio que inicia por evento',
  'Parallel Event based instantiating Gateway': 'Desvio paralelo que inicia por evento',

  // ---------- Atividades ----------
  Task: 'Atividade',
  'User task': 'Atividade humana (pessoa executa)',
  'Manual task': 'Atividade manual',
  'Service task': 'Atividade de sistema',
  'Send task': 'Atividade de envio',
  'Receive task': 'Atividade de recebimento',
  'Script task': 'Atividade de script',
  'Business rule task': 'Atividade de regra de negócio',
  'Call activity': 'Chamada de outro processo',
  'Sub-process': 'Subprocesso',
  'Sub-process (collapsed)': 'Subprocesso (fechado)',
  'Sub-process (expanded)': 'Subprocesso (aberto)',
  'Event sub-process': 'Subprocesso de evento',
  'Ad-hoc sub-process': 'Subprocesso ad-hoc (sem ordem fixa)',
  'Ad-hoc sub-process (collapsed)': 'Subprocesso ad-hoc (fechado)',
  'Ad-hoc sub-process (expanded)': 'Subprocesso ad-hoc (aberto)',
  Transaction: 'Transação',

  // ---------- Marcadores de atividade ----------
  Loop: 'Repetição (loop)',
  'Sequential multi-instance': 'Várias vezes, uma após a outra',
  'Parallel multi-instance': 'Várias vezes, ao mesmo tempo',
  Collection: 'Coleção',
  'Participant multiplicity': 'Vários participantes',

  // ---------- Dados e piscinas ----------
  'Data object reference': 'Objeto de dados (documento)',
  'Data store reference': 'Banco de dados',
  'Empty pool/participant': 'Piscina vazia',
  'Expanded pool/participant': 'Piscina aberta',
};

/**
 * Módulo `translate` para injetar no BpmnModeler.
 * Mantém a substituição de `{chave}` que a biblioteca usa nos textos com variável.
 */
export const traducaoPtBr = {
  translate: [
    'value',
    function traduzir(template: string, replacements?: Record<string, string>) {
      const texto = DICIONARIO[template] || template;
      return texto.replace(/{([^}]+)}/g, (_, chave) => (replacements || {})[chave] || `{${chave}}`);
    },
  ],
};
