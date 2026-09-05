/**
 * Diagrama inicial do Mapa de Processo BPMN.
 *
 * E o esqueleto AS IS do Kit Mapeando na Pratica, com o CONTEUDO todo generico de
 * proposito: "Area 1"/"Area 2" nas raias e "Atividade 1..5" nas caixas. Nome de
 * negocio no template faz o aluno tentar adaptar o exemplo em vez de desenhar o
 * processo dele — generico deixa obvio que e pra substituir tudo.
 *
 * O que o esqueleto ensina, e por isso nao e so uma caixa solta:
 *   - duas raias, ou seja, responsabilidade dividida entre areas
 *   - inicio e fim explicitos
 *   - uma decisao com as duas saidas nomeadas (Sim / Nao)
 *   - um retorno de retrabalho, que atravessa a raia e volta pro fluxo
 *
 * Ja vem com a camada grafica (BPMN DI), entao abre desenhado aqui, no Bizagi e no
 * BPMN.io. A geometria e conferida: nenhuma seta passa por dentro de caixa.
 *
 * O kit manda representar o processo como ele ACONTECE, nao como deveria acontecer.
 */
export const BPMN_TEMPLATE_AS_IS = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_ASIS_Base" targetNamespace="https://mapeandonapratica.com.br/bpmn" exporter="Kit Mapeando na Prática" exporterVersion="1.0">
  <bpmn:collaboration id="Collaboration_ASIS_Base">
    <bpmn:participant id="Participant_ASIS_Base" name="NOME DO PROCESSO — AS IS — RASCUNHO" processRef="Process_ASIS_Base" />
  </bpmn:collaboration>
  <bpmn:process id="Process_ASIS_Base" name="Nome do processo — AS IS" isExecutable="false">
    <bpmn:documentation>Modelo genérico. Substitua o nome do processo, o nome das áreas e o nome de cada atividade pelo que acontece de verdade. Apague o que não existe e crie o que faltar.</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_ASIS_Base">
      <bpmn:lane id="Lane_Area_1" name="Área 1">
        <bpmn:flowNodeRef>StartEvent_ASIS</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_5</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Area_2" name="Área 2">
        <bpmn:flowNodeRef>Task_2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Gateway_Decisao</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_3</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_4</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_ASIS</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_ASIS" name="Início" />
    <bpmn:task id="Task_1" name="Atividade 1" />
    <bpmn:task id="Task_2" name="Atividade 2" />
    <bpmn:exclusiveGateway id="Gateway_Decisao" name="Decisão?" default="Flow_Nao" />
    <bpmn:task id="Task_3" name="Atividade 3" />
    <bpmn:task id="Task_4" name="Atividade 4" />
    <bpmn:task id="Task_5" name="Atividade 5" />
    <bpmn:endEvent id="EndEvent_ASIS" name="Fim" />
    <bpmn:sequenceFlow id="Flow_01" sourceRef="StartEvent_ASIS" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_02" sourceRef="Task_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="Flow_03" sourceRef="Task_2" targetRef="Gateway_Decisao" />
    <bpmn:sequenceFlow id="Flow_Sim" name="Sim" sourceRef="Gateway_Decisao" targetRef="Task_3">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[Condição atendida]]></bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_05" sourceRef="Task_3" targetRef="EndEvent_ASIS" />
    <bpmn:sequenceFlow id="Flow_Nao" name="Não" sourceRef="Gateway_Decisao" targetRef="Task_4" />
    <bpmn:sequenceFlow id="Flow_07" sourceRef="Task_4" targetRef="Task_5" />
    <bpmn:sequenceFlow id="Flow_08" sourceRef="Task_5" targetRef="Task_2" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_ASIS_Base">
    <bpmndi:BPMNPlane id="BPMNPlane_ASIS_Base" bpmnElement="Collaboration_ASIS_Base">
      <bpmndi:BPMNShape id="Participant_ASIS_Base_di" bpmnElement="Participant_ASIS_Base" isHorizontal="true">
        <dc:Bounds x="60" y="80" width="1280" height="420" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Area_1_di" bpmnElement="Lane_Area_1" isHorizontal="true">
        <dc:Bounds x="90" y="80" width="1250" height="210" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Area_2_di" bpmnElement="Lane_Area_2" isHorizontal="true">
        <dc:Bounds x="90" y="290" width="1250" height="210" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_ASIS_di" bpmnElement="StartEvent_ASIS">
        <dc:Bounds x="150" y="170" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="125" y="210" width="90" height="28" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="230" y="148" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2">
        <dc:Bounds x="410" y="335" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Decisao_di" bpmnElement="Gateway_Decisao" isMarkerVisible="true">
        <dc:Bounds x="600" y="350" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="565" y="315" width="120" height="28" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3">
        <dc:Bounds x="760" y="335" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4">
        <dc:Bounds x="720" y="420" width="130" height="60" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5">
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
        <di:waypoint x="730" y="420" /><di:waypoint x="730" y="205" /><di:waypoint x="670" y="205" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_08_di" bpmnElement="Flow_08">
        <di:waypoint x="540" y="205" /><di:waypoint x="500" y="205" /><di:waypoint x="500" y="335" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
