import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Printer, Save, Info, Users, Calendar, AlertTriangle, DollarSign, Briefcase } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ProjectCharterPMIProps {
  onSave: (data: any) => void;
  initialData?: any;
}

export default function ProjectCharterPMI({ onSave, initialData }: ProjectCharterPMIProps) {
  const [data, setData] = useState(initialData || {
    projectName: '',
    description: '',
    department: '',
    projectManager: '',
    sponsor: '',
    startDate: '',
    objective: '',
    expectedResult: '',
    scopeIncluded: '',
    scopeExcluded: '',
    deliverables: ['', '', ''],
    stakeholders: [
      { name: '', role: '' },
      { name: '', role: '' },
      { name: '', role: '' }
    ],
    schedule: [
      { milestone: '', date: '' },
      { milestone: '', date: '' },
      { milestone: '', date: '' }
    ],
    resources: '',
    risks: '',
    budget: '',
    approvals: [
      { name: '', role: 'Project Manager', date: '' },
      { name: '', role: 'Sponsor', date: '' },
      { name: '', role: 'Key Stakeholder', date: '' }
    ]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleListItemChange = (listName: 'deliverables' | 'stakeholders' | 'schedule' | 'approvals', index: number, field: string | null, value: string) => {
    const newList = [...data[listName]];
    if (field) {
      newList[index] = { ...newList[index], [field]: value };
    } else {
      newList[index] = value;
    }
    setData((prev: any) => ({ ...prev, [listName]: newList }));
  };

  const addItem = (listName: 'deliverables' | 'stakeholders' | 'schedule') => {
    const newItem = listName === 'deliverables' ? '' : (listName === 'stakeholders' ? { name: '', role: '' } : { milestone: '', date: '' });
    setData((prev: any) => ({ ...prev, [listName]: [...prev[listName], newItem] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[210mm] mx-auto pb-20">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 border border-gray-200 rounded-xl shadow-sm no-print">
        <div className="flex items-center gap-2">
          <Briefcase className="text-blue-600" size={20} />
          <span className="font-bold text-gray-700">Project Charter - PMI</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer border-none"
          >
            <Printer size={16} /> IMPRIMIR / PDF
          </button>
          <button
            onClick={() => onSave(data)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer border-none shadow-lg shadow-blue-100"
          >
            <Save size={16} /> SALVAR CHARTER
          </button>
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="bg-white border border-gray-300 shadow-2xl p-[15mm] min-h-[297mm] w-full print:p-0 print:shadow-none print:border-none font-sans text-black overflow-hidden">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Project Charter</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Termo de Abertura do Projeto (PMI)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase">Documento Oficial</p>
            <p className="text-xs font-bold text-gray-600">Ref: PMI-PC-001</p>
          </div>
        </div>

        {/* 1. Informações do Projeto */}
        <section className="mb-6">
          <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
            <Info size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest">1. Informações do Projeto</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Nome do Projeto</label>
              <input 
                name="projectName"
                value={data.projectName}
                onChange={handleChange}
                placeholder="Ex: Implementação do Novo Sistema de Gestão"
                className="w-full text-sm font-bold border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Descrição Breve (O que será implementado/construído)</label>
              <textarea 
                name="description"
                value={data.description}
                onChange={handleChange}
                rows={2}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Área / Departamento</label>
              <input 
                name="department"
                value={data.department}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Data de Início</label>
              <input 
                type="date"
                name="startDate"
                value={data.startDate}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Project Manager</label>
              <input 
                name="projectManager"
                value={data.projectManager}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Sponsor (Patrocinador)</label>
              <input 
                name="sponsor"
                value={data.sponsor}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 2. Objetivo do Projeto */}
        <section className="mb-6">
          <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
            <Target size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest">2. Objetivo do Projeto</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">O que será entregue (produto, sistema, construção, etc.)</label>
              <textarea 
                name="objective"
                value={data.objective}
                onChange={handleChange}
                rows={2}
                className="w-full text-sm border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Resultado esperado do projeto</label>
              <textarea 
                name="expectedResult"
                value={data.expectedResult}
                onChange={handleChange}
                rows={2}
                className="w-full text-sm border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded"
              />
            </div>
          </div>
        </section>

        {/* 3. Escopo do Projeto */}
        <section className="mb-6">
          <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
            <Briefcase size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest">3. Escopo do Projeto</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-green-100 bg-green-50/20 p-3 rounded-lg">
              <label className="block text-[9px] font-black text-green-700 uppercase mb-1">Incluído (Principais Entregas)</label>
              <textarea 
                name="scopeIncluded"
                value={data.scopeIncluded}
                onChange={handleChange}
                rows={4}
                className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 outline-none resize-none"
                placeholder="Liste o que faz parte do projeto..."
              />
            </div>
            <div className="border border-red-100 bg-red-50/20 p-3 rounded-lg">
              <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Fora do Escopo (Exclusões)</label>
              <textarea 
                name="scopeExcluded"
                value={data.scopeExcluded}
                onChange={handleChange}
                rows={4}
                className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 outline-none resize-none"
                placeholder="Liste o que NÃO faz parte do projeto..."
              />
            </div>
          </div>
        </section>

        {/* 4. Principais Entregas & 5. Stakeholders */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">4. Principais Entregas</h2>
            </div>
            <div className="space-y-2">
              {data.deliverables.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 border-b border-gray-100 pb-1">
                  <span className="text-[10px] font-black text-gray-300">{idx + 1}</span>
                  <input 
                    value={item}
                    onChange={(e) => handleListItemChange('deliverables', idx, null, e.target.value)}
                    className="w-full text-xs border-none focus:ring-0 p-0 outline-none"
                    placeholder="Entregável..."
                  />
                </div>
              ))}
              <button onClick={() => addItem('deliverables')} className="text-[9px] font-bold text-blue-600 uppercase no-print">+ Adicionar Entrega</button>
            </div>
          </section>

          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <Users size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">5. Stakeholders Principais</h2>
            </div>
            <div className="space-y-2">
              {data.stakeholders.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-1">
                  <input 
                    value={item.name}
                    onChange={(e) => handleListItemChange('stakeholders', idx, 'name', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none font-bold"
                    placeholder="Nome"
                  />
                  <input 
                    value={item.role}
                    onChange={(e) => handleListItemChange('stakeholders', idx, 'role', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none text-gray-500"
                    placeholder="Função"
                  />
                </div>
              ))}
              <button onClick={() => addItem('stakeholders')} className="text-[9px] font-bold text-blue-600 uppercase no-print">+ Adicionar Stakeholder</button>
            </div>
          </section>
        </div>

        {/* 6. Cronograma & 7. Recursos */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <Calendar size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">6. Cronograma (Alto Nível)</h2>
            </div>
            <div className="space-y-2">
              {data.schedule.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-[1fr_80px] gap-2 border-b border-gray-100 pb-1">
                  <input 
                    value={item.milestone}
                    onChange={(e) => handleListItemChange('schedule', idx, 'milestone', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none"
                    placeholder="Fase / Marco"
                  />
                  <input 
                    value={item.date}
                    onChange={(e) => handleListItemChange('schedule', idx, 'date', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none text-right font-mono"
                    placeholder="Data"
                  />
                </div>
              ))}
              <button onClick={() => addItem('schedule')} className="text-[9px] font-bold text-blue-600 uppercase no-print">+ Adicionar Marco</button>
            </div>
          </section>

          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <Users size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">7. Recursos Principais</h2>
            </div>
            <textarea 
              name="resources"
              value={data.resources}
              onChange={handleChange}
              rows={5}
              className="w-full text-xs border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded"
              placeholder="Equipes, fornecedores, tecnologia, infraestrutura..."
            />
          </section>
        </div>

        {/* 8. Riscos & 9. Orçamento */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">8. Riscos Iniciais</h2>
            </div>
            <textarea 
              name="risks"
              value={data.risks}
              onChange={handleChange}
              rows={4}
              className="w-full text-xs border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded"
              placeholder="Riscos de prazo, fornecedor, integração, orçamento..."
            />
          </section>

          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <DollarSign size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">9. Orçamento (Alto Nível)</h2>
            </div>
            <textarea 
              name="budget"
              value={data.budget}
              onChange={handleChange}
              rows={4}
              className="w-full text-xs border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded"
              placeholder="Estimativa inicial de custo..."
            />
          </section>
        </div>

        {/* Seção de Aprovação */}
        <section className="mt-auto pt-6 border-t-2 border-gray-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 text-center">Seção de Aprovação Formal</h3>
          <div className="grid grid-cols-3 gap-8">
            {data.approvals.map((app: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="border-b border-gray-900 pb-1">
                  <input 
                    value={app.name}
                    onChange={(e) => handleListItemChange('approvals', idx, 'name', e.target.value)}
                    className="w-full text-xs font-bold text-center border-none focus:ring-0 p-0 outline-none"
                    placeholder="Nome do Aprovador"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[9px] font-black uppercase text-gray-900">{app.role}</p>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[8px] text-gray-400 uppercase">Data:</span>
                    <input 
                      type="text"
                      value={app.date}
                      onChange={(e) => handleListItemChange('approvals', idx, 'date', e.target.value)}
                      className="w-20 text-[9px] border-none focus:ring-0 p-0 outline-none text-right font-mono"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>
                <div className="h-10 border border-dashed border-gray-200 rounded flex items-center justify-center">
                  <span className="text-[8px] text-gray-300 uppercase italic">Assinatura</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 flex justify-between items-end text-[8px] text-gray-400 font-bold uppercase border-t border-gray-100 pt-2">
          <div>LBW Copilot - Gestão de Projetos PMI</div>
          <div>Página 1 de 1</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
