/**
 * Diagrama inicial do Mapa de Processo BPMN.
 *
 * E o template AS IS do Kit Mapeando na Pratica, copiado sem alteracao de conteudo:
 * piscina, duas raias, evento inicial e final, decisao com saidas nomeadas e o fluxo
 * de retorno do retrabalho. Ja vem com a camada grafica (BPMN DI), entao abre
 * desenhado tanto aqui quanto no Bizagi e no BPMN.io.
 *
 * O aluno substitui nomes e elementos por cima. O kit manda representar o processo
 * como ele ACONTECE, nao como deveria acontecer.
 */
export const BPMN_TEMPLATE_AS_IS = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_ASIS_Base" targetNamespace="https://mapeandonapratica.com.br/bpmn" exporter="Kit Mapeando na Prática" exporterVersion="1.0">
  <bpmn:collaboration id="Collaboration_ASIS_Base">
    <bpmn:participant id="Participant_ASIS_Base" name="PROCESSO AS IS — SUBSTITUIR NOME — RASCUNHO" processRef="Process_ASIS_Base" />
  </bpmn:collaboration>
  <bpmn:process id="Process_ASIS_Base" name="Processo AS IS — substituir nome" isExecutable="false">
    <bpmn:documentation>Modelo mestre. Substitua nomes, elementos, responsáveis, conexões, versão e status com base no briefing validado.</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_ASIS_Base">
      <bpmn:lane id="Lane_Solicitante" name="Solicitante">
        <bpmn:flowNodeRef>StartEvent_ASIS</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Registrar</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Complementar</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Responsavel" name="Responsável pelo processo">
        <bpmn:flowNodeRef>Task_Analisar</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Gateway_Completo</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Executar</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Solicitar_Complemento</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_ASIS</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_ASIS" name="Demanda recebida" />
    <bpmn:task id="Task_Registrar" name="Registrar solicitação" />
    <bpmn:task id="Task_Analisar" name="Analisar solicitação" />
    <bpmn:exclusiveGateway id="Gateway_Completo" name="Informações completas?" default="Flow_Nao" />
    <bpmn:task id="Task_Executar" name="Executar atividade principal" />
    <bpmn:task id="Task_Solicitar_Complemento" name="Solicitar complemento" />
    <bpmn:task id="Task_Complementar" name="Complementar informações" />
    <bpmn:endEvent id="EndEvent_ASIS" name="Resultado entregue" />
    <bpmn:sequenceFlow id="Flow_01" sourceRef="StartEvent_ASIS" targetRef="Task_Registrar" />
    <bpmn:sequenceFlow id="Flow_02" sourceRef="Task_Registrar" targetRef="Task_Analisar" />
    <bpmn:sequenceFlow id="Flow_03" sourceRef="Task_Analisar" targetRef="Gateway_Completo" />
    <bpmn:sequenceFlow id="Flow_Sim" name="Sim" sourceRef="Gateway_Completo" targetRef="Task_Executar">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[Informações completas]]></bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_05" sourceRef="Task_Executar" targetRef="EndEvent_ASIS" />
    <bpmn:sequenceFlow id="Flow_Nao" name="Não" sourceRef="Gateway_Completo" targetRef="Task_Solicitar_Complemento" />
    <bpmn:sequenceFlow id="Flow_07" sourceRef="Task_Solicitar_Complemento" targetRef="Task_Complementar" />
    <bpmn:sequenceFlow id="Flow_08" sourceRef="Task_Complementar" targetRef="Task_Analisar" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_ASIS_Base">
    <bpmndi:BPMNPlane id="BPMNPlane_ASIS_Base" bpmnElement="Collaboration_ASIS_Base">
      <bpmndi:BPMNShape id="Participant_ASIS_Base_di" bpmnElement="Participant_ASIS_Base" isHorizontal="true">
        <dc:Bounds x="60" y="80" width="1280" height="420" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Solicitante_di" bpmnElement="Lane_Solicitante" isHorizontal="true">
        <dc:Bounds x="90" y="80" width="1250" height="210" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Responsavel_di" bpmnElement="Lane_Responsavel" isHorizontal="true">
        <dc:Bounds x="90" y="290" width="1250" height="210" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_ASIS_di" bpmnElement="StartEvent_ASIS">
        <dc:Bounds x="150" y="170" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="125" y="210" width="90" height="28" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Registrar_di" bpmnElement="Task_Registrar">
        <dc:Bounds x="230" y="148" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Analisar_di" bpmnElement="Task_Analisar">
        <dc:Bounds x="410" y="335" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Completo_di" bpmnElement="Gateway_Completo" isMarkerVisible="true">
        <dc:Bounds x="600" y="350" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="565" y="315" width="120" height="28" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Executar_di" bpmnElement="Task_Executar">
        <dc:Bounds x="760" y="335" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Solicitar_Complemento_di" bpmnElement="Task_Solicitar_Complemento">
        <dc:Bounds x="720" y="420" width="130" height="60" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Complementar_di" bpmnElement="Task_Complementar">
        <dc:Bounds x="540" y="170" width="130" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_ASIS_di" bpmnElement="EndEvent_ASIS">
        <dc:Bounds x="970" y="357" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="945" y="397" width="90" height="28" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_01_di" bpmnElement="Flow_01">
        <di:waypoint x="186" y="188" /><di:waypoint x="230" y="188" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_02_di" bpmnElement="Flow_02">
        <di:waypoint x="350" y="188" /><di:waypoint x="380" y="188" /><di:waypoint x="380" y="375" /><di:waypoint x="410" y="375" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_03_di" bpmnElement="Flow_03">
        <di:waypoint x="530" y="375" /><di:waypoint x="600" y="375" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Sim_di" bpmnElement="Flow_Sim">
        <di:waypoint x="650" y="375" /><di:waypoint x="760" y="375" />
        <bpmndi:BPMNLabel><dc:Bounds x="684" y="352" width="26" height="18" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_05_di" bpmnElement="Flow_05">
        <di:waypoint x="890" y="375" /><di:waypoint x="970" y="375" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Nao_di" bpmnElement="Flow_Nao">
        <di:waypoint x="625" y="400" /><di:waypoint x="625" y="450" /><di:waypoint x="720" y="450" />
        <bpmndi:BPMNLabel><dc:Bounds x="635" y="425" width="28" height="18" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_07_di" bpmnElement="Flow_07">
        <di:waypoint x="785" y="420" /><di:waypoint x="785" y="205" /><di:waypoint x="670" y="205" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_08_di" bpmnElement="Flow_08">
        <di:waypoint x="540" y="205" /><di:waypoint x="500" y="205" /><di:waypoint x="500" y="335" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
