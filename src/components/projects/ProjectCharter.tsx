import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Printer, Download, Sparkles, Plus, Trash2, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toPng } from 'html-to-image';

interface ProjectCharterProps {
  onSave: (data: any) => void;
  initialData?: any;
  briefData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
}

type StakeholderRow = {
  role: string;
  name: string;
  definition: string;
  measurement: string;
  analysis: string;
  improvement: string;
  control: string;
};

export default function ProjectCharter({ 
  onSave, 
  initialData, 
  briefData,
  onGenerateAI,
  isGeneratingAI 
}: ProjectCharterProps) {
  const [data, setData] = useState(() => {
    const defaultData = {
      title: briefData?.answers?.q1 || '',
      date: new Date().toLocaleDateString('pt-BR'),
      rev: '00',
      area: '',
      leader: '',
      champion: '',
      problemDefinition: briefData?.answers?.q2 ? `${briefData.answers.q2}\n${briefData.answers.q4 || ''}` : '',
      problemHistory: briefData?.answers?.q5 || '',
      goalDefinition: briefData?.answers?.q7 || '',
      kpi: '',
      scope: briefData?.answers?.q6 || '',
      businessContributions: briefData?.answers?.q8 || '',
      images: briefData?.images || [] as string[],
      stakeholders: (briefData?.stakeholders || [
        { role: 'Líder:', name: '', definition: 'A', measurement: 'A', analysis: 'A', improvement: 'A', control: 'A' },
        { role: 'Patrocinador:', name: '', definition: 'A', measurement: 'I', analysis: 'I', improvement: 'A', control: 'I' },
        { role: 'Dono do Processo:', name: '', definition: 'A', measurement: 'I', analysis: 'I', improvement: 'I', control: 'A' },
        { role: 'Champion:', name: '', definition: 'A', measurement: 'A', analysis: 'A', improvement: 'A', control: 'A' },
        { role: 'Validação Técnica:', name: '', definition: 'A', measurement: 'A', analysis: 'A', improvement: 'A', control: 'A' },
        { role: 'Validação Financeira:', name: '', definition: 'A', measurement: 'I', analysis: 'I', improvement: 'I', control: 'A' },
        { role: 'Membro da Equipe:', name: '', definition: '', measurement: 'A', analysis: '', improvement: '', control: '' },
        { role: 'Membro da Equipe:', name: '', definition: '', measurement: '', analysis: 'A', improvement: '', control: '' },
        { role: 'Membro da Equipe:', name: '', definition: '', measurement: '', analysis: '', improvement: 'A', control: '' },
        { role: 'Membro da Equipe:', name: '', definition: '', measurement: '', analysis: '', improvement: '', control: 'A' },
        { role: 'Outros:', name: '', definition: '', measurement: '', analysis: '', improvement: '', control: '' },
      ]) as StakeholderRow[]
    };

    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        stakeholders: initialData.stakeholders || defaultData.stakeholders,
        images: initialData.images || defaultData.images
      };
    }
    return defaultData;
  });

  useEffect(() => {
    if (initialData) {
      setData((prev: any) => ({
        ...prev,
        ...initialData,
        stakeholders: initialData.stakeholders || prev.stakeholders,
        images: initialData.images || prev.images
      }));
    } else if (briefData) {
      // If no charter data but brief exists, pre-fill
      setData((prev: any) => ({
        ...prev,
        title: briefData.answers?.q1 || prev.title,
        problemDefinition: briefData.answers?.q2 ? `${briefData.answers.q2}\n${briefData.answers.q4 || ''}` : prev.problemDefinition,
        problemHistory: briefData.answers?.q5 || prev.problemHistory,
        goalDefinition: briefData.answers?.q7 || prev.goalDefinition,
        scope: briefData.answers?.q6 || prev.scope,
        businessContributions: briefData.answers?.q8 || prev.businessContributions,
        images: briefData.images || prev.images
      }));
    }
  }, [initialData, briefData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleStakeholderChange = (index: number, field: keyof StakeholderRow, value: string) => {
    const newStakeholders = [...data.stakeholders];
    newStakeholders[index] = { ...newStakeholders[index], [field]: value };
    setData((prev: any) => ({ ...prev, stakeholders: newStakeholders }));
  };

  const addStakeholder = () => {
    setData((prev: any) => ({
      ...prev,
      stakeholders: [
        ...prev.stakeholders,
        { role: 'Membro da Equipe:', name: '', definition: '', measurement: '', analysis: '', improvement: '', control: '' }
      ]
    }));
  };

  const removeStakeholder = (index: number) => {
    setData((prev: any) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = [...(data.images || [])];
    Array.from(files).forEach(file => {
      if (newImages.length >= 4) return; // Allow up to 4 images
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        newImages.push(result);
        setData((prev: any) => ({ ...prev, images: [...newImages] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = data.images.filter((_: any, i: number) => i !== index);
    setData((prev: any) => ({ ...prev, images: newImages }));
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    const element = document.getElementById('project-charter-print');
    if (!element) return;

    setIsPrinting(true);
    try {
      // Hide elements that shouldn't be in the print
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 3, // Higher resolution for print
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      // Restore hidden elements
      noPrintElements.forEach(el => (el as HTMLElement).style.display = '');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Project Charter - ${data.title || 'Sem Título'}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 0; 
                  display: flex; 
                  justify-content: center; 
                  background: #f3f4f6; 
                  min-height: 100vh;
                }
                img { 
                  width: 210mm; 
                  height: auto; 
                  display: block;
                  background: white;
                  box-shadow: 0 0 20px rgba(0,0,0,0.15);
                }
                @media print {
                  body { background: white; padding: 0; margin: 0; }
                  img { box-shadow: none; width: 100%; }
                  @page { 
                    size: A4; 
                    margin: 0; 
                  }
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // Fallback to direct print if window.open is blocked
        window.print();
      }
    } catch (error) {
      console.error('Erro ao gerar imagem para impressão:', error);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[210mm] mx-auto">
      <div className="flex justify-end pt-6 border-t border-[#eee] no-print">
        <button
          data-save-trigger
          onClick={() => onSave(data)}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-lg"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar Alterações
        </button>
      </div>

      {/* Main Charter Container */}
      <div id="project-charter-print" className="bg-white p-4 shadow-lg border border-gray-200 max-w-[210mm] mx-auto print:shadow-none print:p-0 print:m-0 print:border-none font-sans text-black">
        
        {/* Header: Logo + Title */}
        <div className="flex border-2 border-black mb-1 h-16">
          <div className="w-[30%] bg-white flex items-center justify-center p-2 border-r-2 border-black">
            <img 
              src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" 
              alt="LBW Logo" 
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-[70%] bg-gray-100 flex items-center justify-center">
            <h1 className="text-xl md:text-2xl font-black text-black tracking-widest uppercase">Contrato do Projeto</h1>
          </div>
        </div>

        {/* Row 1: Title, Date, Rev */}
        <div className="flex border-2 border-black border-t-0 mb-1">
          <div className="w-[60%] border-r-2 border-black p-1">
            <label className="block text-[8px] font-black uppercase">Título do Projeto:</label>
            <input 
              name="title"
              value={data.title}
              onChange={handleChange}
              className="w-full text-[10px] font-bold p-0 border-none focus:ring-0 uppercase"
              placeholder="NOME DO PROJETO..."
            />
          </div>
          <div className="w-[25%] border-r-2 border-black p-1">
            <label className="block text-[8px] font-black uppercase">Data:</label>
            <input 
              name="date"
              value={data.date}
              onChange={handleChange}
              className="w-full text-[10px] font-bold p-0 border-none focus:ring-0"
            />
          </div>
          <div className="w-[15%] p-1">
            <label className="block text-[8px] font-black uppercase">Rev:</label>
            <input 
              name="rev"
              value={data.rev}
              onChange={handleChange}
              className="w-full text-[10px] font-bold p-0 border-none focus:ring-0"
            />
          </div>
        </div>

        {/* Row 2: Area, Leader, Champion */}
        <div className="flex border-2 border-black border-t-0 mb-1">
          <div className="w-[33%] border-r-2 border-black p-1">
            <label className="block text-[8px] font-black uppercase">Área/Planta:</label>
            <input 
              name="area"
              value={data.area}
              onChange={handleChange}
              className="w-full text-[10px] font-bold p-0 border-none focus:ring-0 uppercase"
            />
          </div>
          <div className="w-[33%] border-r-2 border-black p-1">
            <label className="block text-[8px] font-black uppercase">Líder do Projeto:</label>
            <input 
              name="leader"
              value={data.leader}
              onChange={handleChange}
              className="w-full text-[10px] font-bold p-0 border-none focus:ring-0 uppercase"
            />
          </div>
          <div className="w-[34%] p-1">
            <label className="block text-[8px] font-black uppercase">Champion:</label>
            <input 
              name="champion"
              value={data.champion}
              onChange={handleChange}
              className="w-full text-[10px] font-bold p-0 border-none focus:ring-0 uppercase"
            />
          </div>
        </div>

        {/* Problem Definition */}
        <div className="border-2 border-black border-t-0 mb-1">
          <div className="bg-gray-100 text-center border-b-2 border-black py-0.5">
            <h2 className="text-[9px] font-black uppercase">Definição Operacional do Problema</h2>
          </div>
          <textarea 
            name="problemDefinition"
            value={data.problemDefinition}
            onChange={handleChange}
            rows={3}
            className="w-full text-[10px] p-2 border-none focus:ring-0 resize-none leading-tight"
            placeholder="Descreva o problema de forma clara e objetiva..."
          />
        </div>

        {/* Problem History & Images */}
        <div className="border-2 border-black border-t-0 mb-1">
          <div className="bg-gray-100 text-center border-b-2 border-black py-0.5">
            <h2 className="text-[9px] font-black uppercase">Histórico do Problema (Gráficos ou Números)</h2>
          </div>
          <div className="flex min-h-[160px]">
            <div className="w-1/2 p-2 border-r-2 border-black">
              <textarea 
                name="problemHistory"
                value={data.problemHistory}
                onChange={handleChange}
                rows={8}
                className="w-full h-full text-[10px] p-0 border-none focus:ring-0 resize-none leading-tight"
                placeholder="Dados históricos, tendências, frequência..."
              />
            </div>
            <div className="w-1/2 p-2 flex flex-col gap-2 relative group/img-section">
              {data.images && data.images.length > 0 ? (
                <div className={cn(
                  "grid gap-2 h-full",
                  data.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {data.images.map((img: string, idx: number) => (
                    <div key={idx} className="relative group h-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded">
                      <img 
                        src={img} 
                        alt={`Evidência ${idx + 1}`} 
                        className="max-w-full max-h-full object-contain p-1"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity no-print"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {data.images.length < 2 && (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors no-print">
                      <ImageIcon size={16} className="text-gray-400 mb-1" />
                      <span className="text-[8px] text-gray-400">Add Imagem</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              ) : (
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors no-print">
                  <ImageIcon size={24} className="text-gray-400 mb-2" />
                  <span className="text-xs text-gray-400">Clique para adicionar gráficos ou fotos</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Goal & Scope (Compact) */}
        <div className="flex gap-1 mb-1">
          <div className="w-1/2 border-2 border-black">
            <div className="bg-gray-100 text-center border-b-2 border-black py-0.5">
              <h2 className="text-[9px] font-black uppercase">Definição da Meta</h2>
            </div>
            <textarea 
              name="goalDefinition"
              value={data.goalDefinition}
              onChange={handleChange}
              rows={2}
              className="w-full text-[10px] p-2 border-none focus:ring-0 resize-none leading-tight"
            />
          </div>
          <div className="w-1/2 border-2 border-black">
            <div className="bg-gray-100 text-center border-b-2 border-black py-0.5">
              <h2 className="text-[9px] font-black uppercase">Escopo (Dentro/Fora)</h2>
            </div>
            <div className="p-1 space-y-1">
              <div className="flex items-start gap-1">
                <span className="text-[8px] font-black mt-1">IN:</span>
                <input 
                  name="scopeIn"
                  value={data.scopeIn}
                  onChange={handleChange}
                  className="flex-1 text-[10px] p-0 border-none focus:ring-0"
                />
              </div>
              <div className="flex items-start gap-1">
                <span className="text-[8px] font-black mt-1">OUT:</span>
                <input 
                  name="scopeOut"
                  value={data.scopeOut}
                  onChange={handleChange}
                  className="flex-1 text-[10px] p-0 border-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stakeholder Table (Compact) */}
        <div className="border-2 border-black overflow-hidden">
          <div className="bg-gray-100 text-center border-b-2 border-black py-0.5">
            <h2 className="text-[9px] font-black uppercase">Equipe de Trabalho e Stakeholders</h2>
          </div>
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-r border-black p-1 w-[120px]">Função</th>
                <th className="border-r border-black p-1">Nome</th>
                <th className="border-r border-black p-1 w-8">D</th>
                <th className="border-r border-black p-1 w-8">M</th>
                <th className="border-r border-black p-1 w-8">A</th>
                <th className="border-r border-black p-1 w-8">I</th>
                <th className="border-r border-black p-1 w-8">C</th>
              </tr>
            </thead>
            <tbody>
              {data.stakeholders?.map((row: any, idx: number) => (
                <tr key={idx} className="border-t border-black">
                  <td className="border-r border-black p-0 bg-gray-50">
                    <input 
                      value={row.role}
                      onChange={(e) => handleStakeholderChange(idx, 'role', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px] font-bold bg-transparent" 
                    />
                  </td>
                  <td className="border-r border-black p-0">
                    <input 
                      value={row.name}
                      onChange={(e) => handleStakeholderChange(idx, 'name', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px]" 
                    />
                  </td>
                  <td className="border-r border-black p-0 text-center">
                    <select
                      value={row.definition}
                      onChange={(e) => handleStakeholderChange(idx, 'definition', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px] text-center appearance-none cursor-pointer font-black"
                    >
                      <option value=""></option>
                      <option value="A">A</option>
                      <option value="I">I</option>
                    </select>
                  </td>
                  <td className="border-r border-black p-0 text-center">
                    <select
                      value={row.measurement}
                      onChange={(e) => handleStakeholderChange(idx, 'measurement', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px] text-center appearance-none cursor-pointer font-black"
                    >
                      <option value=""></option>
                      <option value="A">A</option>
                      <option value="I">I</option>
                    </select>
                  </td>
                  <td className="border-r border-black p-0 text-center">
                    <select
                      value={row.analysis}
                      onChange={(e) => handleStakeholderChange(idx, 'analysis', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px] text-center appearance-none cursor-pointer font-black"
                    >
                      <option value=""></option>
                      <option value="A">A</option>
                      <option value="I">I</option>
                    </select>
                  </td>
                  <td className="border-r border-black p-0 text-center">
                    <select
                      value={row.improvement}
                      onChange={(e) => handleStakeholderChange(idx, 'improvement', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px] text-center appearance-none cursor-pointer font-black"
                    >
                      <option value=""></option>
                      <option value="A">A</option>
                      <option value="I">I</option>
                    </select>
                  </td>
                  <td className="p-0 text-center">
                    <select
                      value={row.control}
                      onChange={(e) => handleStakeholderChange(idx, 'control', e.target.value)}
                      className="w-full p-1 border-none focus:ring-0 text-[9px] text-center appearance-none cursor-pointer font-black"
                    >
                      <option value=""></option>
                      <option value="A">A</option>
                      <option value="I">I</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-2 no-print">
          <button 
            onClick={addStakeholder}
            className="flex items-center gap-1 text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={12} /> Adicionar Membro
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #project-charter-print, #project-charter-print * {
            visibility: visible;
          }
          #project-charter-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}} />
    </div>
  );
}
