import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, VerticalAlign, PageBreak } from 'docx';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Project } from '../types';

const LBW_LOGO_URL = "https://i.postimg.cc/7PgJFtZK/logo-LBW.png";

interface Tool {
  id: string;
  name: string;
  phase: string;
}

async function fetchLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(LBW_LOGO_URL);
    return await resp.arrayBuffer();
  } catch (e) {
    console.error("Erro ao carregar logo", e);
    return null;
  }
}

export const generateFullWordReport = async (
  project: Project, 
  projectData: any, 
  availableTools: any[], 
  phases: any[], 
  initiativeName?: string, 
  initiativeConfigs: any[] = [],
  toolImages: Record<string, string> = {} // New parameter for base64 images
) => {
  const logoData = await fetchLogoBuffer();
  
  const children: any[] = [];

  // ... (header logic remains same)
  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: logoData,
          transformation: { width: 100, height: 40 },
        } as any),
      ],
    }));
  }

  children.push(
    new Paragraph({
      text: `Relatório do Projeto: ${project.name}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
    new Paragraph({
      text: `Iniciativa: ${initiativeName || 'N/A'}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Data de Geração: ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "", spacing: { after: 400 } }),
  );

  // START: Insert Process Map at the beginning if it exists
  if (projectData['processMap']) {
    const processData = projectData['processMap'].toolData || projectData['processMap'];
    const { nodes, connections, lanes } = processData;

    children.push(
      new Paragraph({
        text: "Mapa do Processo (Visão Geral)",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      })
    );

    // If we have an image, prioritize it
    if (toolImages['processMap']) {
      try {
        const base64Data = toolImages['processMap'].split(',')[1];
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: buffer,
              transformation: { width: 600, height: 334 },
            } as any),
          ],
          spacing: { before: 200, after: 200 }
        }));
      } catch (e) {
        console.error("Erro ao incluir imagem do mapa no início", e);
      }
    }

    // Add structured table representation of the process
    if (nodes && nodes.length > 0) {
      children.push(new Paragraph({ text: "Atividades Mapeadas", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
      
      const rows = [
        new TableRow({
          children: ['Área', 'Tipo', 'Atividade'].map(t => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
            shading: { fill: "F0F0F0" },
            width: { size: 33, type: WidthType.PERCENTAGE }
          }))
        })
      ];

      // Sort nodes by lane then x position to follow the flow
      const sortedNodes = [...nodes].sort((a, b) => {
        const laneA = lanes.findIndex((l: any) => l.id === a.laneId);
        const laneB = lanes.findIndex((l: any) => l.id === b.laneId);
        if (laneA !== laneB) return laneA - laneB;
        return a.x - b.x;
      });

      sortedNodes.forEach((node: any) => {
        if (node.type === 'text') return;
        const lane = lanes.find((l: any) => l.id === node.laneId);
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: lane?.name || '-' })] }),
            new TableCell({ children: [new Paragraph({ text: node.type === 'start' ? 'Início/Fim' : node.type === 'decision' ? 'Decisão' : node.type === 'subprocess' ? 'Subprocesso' : 'Etapa' })] }),
            new TableCell({ children: [new Paragraph({ text: node.text })] }),
          ]
        }));
      });

      children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }
  // END: Process Map section

  // Iterate through phases in order
  phases.forEach(phase => {
    // ... (phase logic)
    let phaseToolIds: string[] = [];
    
    const config = initiativeConfigs.find(c => c.phaseId === phase.id);
    if (config) {
      phaseToolIds = config.toolIds;
    }

    const savedPhaseTools = availableTools.filter(t => phaseToolIds.includes(t.id) && projectData[t.id]);
    
    if (savedPhaseTools.length > 0) {
      children.push(
        new Paragraph({
          text: `Fase: ${phase.name}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      savedPhaseTools.forEach(tool => {
        const data = projectData[tool.id];

        // SPECIAL CASE: Project Charter - Use captured image for perfect fidelity
        if (tool.id === 'charter' && toolImages[tool.id]) {
          try {
            const base64Data = toolImages[tool.id].split(',')[1];
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            children.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: { width: 600, height: 848 }, // A4 aspect ratio (210/297)
                } as any),
              ],
              spacing: { before: 200, after: 200 }
            }));
            children.push(new Paragraph({ children: [new PageBreak()] }));
            return;
          } catch (e) {
            console.error("Erro ao inserir imagem do Charter no Word", e);
          }
        }

        children.push(
          new Paragraph({
            text: tool.name,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );

        // Include Tool Image if available (e.g., Ishikawa Diagram)
        if (toolImages[tool.id]) {
          try {
            const base64Data = toolImages[tool.id].split(',')[1];
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            children.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: { width: 600, height: 334 }, // Maintain aspect ratio roughly 1400/780
                } as any),
              ],
              spacing: { before: 200, after: 200 }
            }));
          } catch (e) {
            console.error("Erro ao incluir imagem no Word", e);
          }
        }

        // Check if there is an AI Report (Step 2)
        if (data && data.aiReport) {
          const lines = data.aiReport.split('\n');
          let inTable = false;
          let tableRows: string[][] = [];

          lines.forEach((line: string) => {
            const trimmedLine = line.trim();
            
            // Basic Markdown Table detection
            if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
              if (trimmedLine.includes('---')) return; // Skip separator line
              
              inTable = true;
              // Split by | and remove the first and last empty elements (from the leading/trailing |)
              const cells = line.split('|').map(c => c.trim());
              if (cells[0] === '') cells.shift();
              if (cells[cells.length - 1] === '') cells.pop();
              
              tableRows.push(cells);
              return;
            }

            // If we were in a table and the line is no longer a table row, render the table
            if (inTable && (!trimmedLine.startsWith('|') || trimmedLine === '')) {
              if (tableRows.length > 0) {
                const columnCount = tableRows[0].length;
                const cellWidth = 100 / columnCount;

                const rows = tableRows.map(rowCells => new TableRow({
                  children: rowCells.map(cellText => new TableCell({
                    children: [new Paragraph({ 
                      text: cellText, 
                      spacing: { before: 120, after: 120 },
                      alignment: AlignmentType.LEFT
                    })],
                    width: { size: cellWidth, type: WidthType.PERCENTAGE },
                    verticalAlign: AlignmentType.CENTER,
                  }))
                }));

                children.push(new Table({ 
                  rows, 
                  width: { size: 100, type: WidthType.PERCENTAGE }
                }));
                children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
              }
              inTable = false;
              tableRows = [];
            }

            if (line.startsWith('#')) {
              const level = line.match(/^#+/)?.[0].length || 1;
              children.push(new Paragraph({
                text: line.replace(/#/g, '').trim(),
                heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }));
            } else if (trimmedLine) {
              children.push(new Paragraph({
                children: [new TextRun(line)],
                spacing: { after: 120 },
              }));
            }
          });

          // Final table check if report ends with a table
          if (inTable && tableRows.length > 0) {
            const columnCount = tableRows[0].length;
            const cellWidth = 100 / columnCount;

            const rows = tableRows.map(rowCells => new TableRow({
              children: rowCells.map(cellText => new TableCell({
                children: [new Paragraph({ 
                  text: cellText, 
                  spacing: { before: 120, after: 120 },
                  alignment: AlignmentType.LEFT
                })],
                width: { size: cellWidth, type: WidthType.PERCENTAGE },
                verticalAlign: AlignmentType.CENTER,
              }))
            }));
            
            children.push(new Table({ 
              rows, 
              width: { size: 100, type: WidthType.PERCENTAGE }
            }));
          }

          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
          return; // Skip raw data if AI report exists
        }

        // Extract toolData if it's wrapped in ToolWrapper structure
        const toolData = data?.toolData || data;

        // SPECIAL CASE: Improvement Project Plan - Dashboard Report
        if (tool.id === 'improvementPlan' && toolData.phases) {
          const phases = toolData.phases as any[];
          const total = phases.reduce((acc, p) => acc + (p.activities?.length || 0), 0);
          const completed = phases.reduce((acc, p) => acc + (p.activities?.filter((a: any) => a.status === 'Completed').length || 0), 0);
          const today = new Date().toISOString().split('T')[0];
          const delayed = phases.reduce((acc, p) => acc + (p.activities?.filter((a: any) => a.status !== 'Completed' && a.plannedFinish && today > a.plannedFinish).length || 0), 0);
          
          const totalWeight = phases.reduce((acc, p) => acc + (p.activities?.reduce((sum: number, a: any) => sum + (a.weight || 0), 0) || 0), 0);
          const earnedWeight = phases.reduce((acc, p) => acc + (p.activities?.reduce((sum: number, a: any) => {
            const progress = a.status === 'Completed' ? 1 : a.status === 'In Progress' ? 0.5 : 0;
            return sum + ((a.weight || 0) * progress);
          }, 0) || 0), 0);

          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          const weightedProgress = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

          // Add Dashboard Indicators Table
          children.push(new Paragraph({ text: "Indicadores de Desempenho do Plano", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
          
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Progresso Geral", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F0F0F0" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Progresso Ponderado", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F0F0F0" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Concluídas", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F0F0F0" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Atrasadas", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F0F0F0" } }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: `${progress}%`, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: `${weightedProgress}%`, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: `${completed} / ${total}`, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${delayed}`, color: delayed > 0 ? "FF0000" : "000000" })], alignment: AlignmentType.CENTER })] }),
                ]
              })
            ]
          }));
          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));

          // Add AI Report if available
          if (data.aiReport) {
            children.push(new Paragraph({ text: "Análise Executiva da IA", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            data.aiReport.split('\n').forEach((line: string) => {
              children.push(new Paragraph({ children: [new TextRun(line)], spacing: { after: 120 } }));
            });
            children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
          }

          // Add Detailed Plan Table
          children.push(new Paragraph({ text: "Detalhamento das Atividades", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
          phases.forEach(phase => {
            if (phase.activities && phase.activities.length > 0) {
              children.push(new Paragraph({ children: [new TextRun({ text: `Fase: ${phase.name}`, bold: true })], spacing: { before: 150, after: 80 } }));
              const rows = [
                new TableRow({
                  children: ['Atividade', 'Status', 'Início', 'Fim', 'Responsável'].map(t => new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
                    shading: { fill: "F8F8F8" }
                  }))
                })
              ];
              phase.activities.forEach((act: any) => {
                rows.push(new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: act.text })] }),
                    new TableCell({ children: [new Paragraph({ text: act.status })] }),
                    new TableCell({ children: [new Paragraph({ text: act.plannedStart || '-' })] }),
                    new TableCell({ children: [new Paragraph({ text: act.plannedFinish || '-' })] }),
                    new TableCell({ children: [new Paragraph({ text: act.owner || '-' })] }),
                  ]
                }));
              });
              children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
              children.push(new Paragraph({ text: "", spacing: { after: 150 } }));
            }
          });
          return;
        }

        // Format data based on tool type or generic structure
        if (tool.id === 'brief' && toolData.answers) {
          Object.entries(toolData.answers).forEach(([key, value]: [string, any]) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${key.toUpperCase()}: `, bold: true }),
                new TextRun({ text: String(value) }),
              ],
            }));
          });
        } else if (tool.id === 'sipoc' && toolData.rows) {
          const rows = [
            new TableRow({
              children: ['Fornecedores', 'Entradas', 'Processo', 'Saídas', 'Clientes'].map(t => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
                shading: { fill: "F0F0F0" },
                width: { size: 20, type: WidthType.PERCENTAGE }
              }))
            })
          ];
          toolData.rows.forEach((row: any) => {
            rows.push(new TableRow({
              children: [row.suppliers, row.inputs, row.process, row.outputs, row.customers].map(v => 
                new TableCell({ 
                  children: [new Paragraph({ text: String(v || '') })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                })
              )
            }));
          });
          children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        } else if (tool.id === 'measureIshikawa' && data.causes) {
          Object.entries(data.causes).forEach(([cat, items]: [string, any]) => {
            if (items && (items as any).length > 0) {
              children.push(new Paragraph({ children: [new TextRun({ text: `${cat}:`, bold: true })] }));
              (items as any).forEach((item: string) => {
                children.push(new Paragraph({ text: `• ${item}`, bullet: { level: 0 } }));
              });
            }
          });
        } else if (tool.id === 'fiveWhys' && data.whys) {
          data.whys.forEach((item: any, idx: number) => {
            children.push(new Paragraph({ children: [new TextRun({ text: `Causa ${idx + 1}: ${item.cause}`, bold: true })] }));
            item.steps.forEach((step: string, sIdx: number) => {
              children.push(new Paragraph({ text: `${sIdx + 1}º Porquê: ${step}` }));
            });
            children.push(new Paragraph({ children: [new TextRun({ text: `Causa Raiz: ${item.rootCause}`, italics: true })] }));
          });
        } else if (tool.id === 'actionPlan' && toolData.actions) {
          const columnCount = toolData.columns.length;
          const cellWidth = 100 / columnCount;

          const rows = [
            new TableRow({
              children: toolData.columns.map((col: any) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: col.title, bold: true })] })],
                shading: { fill: "F0F0F0" },
                width: { size: cellWidth, type: WidthType.PERCENTAGE }
              }))
            })
          ];

          toolData.actions.forEach((action: any) => {
            rows.push(new TableRow({
              children: toolData.columns.map((col: any) => {
                let text = '';
                if (col.type === 'status') {
                  text = `${action[col.id]?.state || ''} (${action[col.id]?.progress || '0%'})`;
                } else {
                  text = String(action[col.id] || '');
                }
                return new TableCell({ 
                  children: [new Paragraph({ text })],
                  width: { size: cellWidth, type: WidthType.PERCENTAGE }
                });
              })
            }));
          });

          children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        } else if (tool.id === 'brainstorming' && data.ideas) {
          children.push(new Paragraph({ children: [new TextRun({ text: `Tópico: ${data.brainstormingTopic || ''}`, bold: true })] }));
          data.ideas.forEach((idea: any) => {
            children.push(new Paragraph({
              text: `• [${idea.category}] ${idea.text} (${idea.author})`,
              bullet: { level: 0 }
            }));
          });
        } else if (toolData.rows && Array.isArray(toolData.rows)) {
          // Generic Table for tools with 'rows'
          const firstRow = toolData.rows[0];
          if (firstRow) {
            const keys = Object.keys(firstRow).filter(k => k !== 'id');
            const columnCount = keys.length;
            const cellWidth = 100 / columnCount;

            const rows = [
              new TableRow({
                children: keys.map(k => new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: k.charAt(0).toUpperCase() + k.slice(1), bold: true })] })],
                  shading: { fill: "F0F0F0" },
                  width: { size: cellWidth, type: WidthType.PERCENTAGE }
                }))
              })
            ];
            toolData.rows.forEach((row: any) => {
              rows.push(new TableRow({
                children: keys.map(k => new TableCell({ 
                  children: [new Paragraph({ text: String(row[k] || '') })],
                  width: { size: cellWidth, type: WidthType.PERCENTAGE }
                }))
              }));
            });
            children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          }
        } else if (typeof data === 'object') {
          // Generic Key-Value for other objects
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value !== 'object' && value) {
              children.push(new Paragraph({
                children: [
                  new TextRun({ text: `${key}: `, bold: true }),
                  new TextRun({ text: String(value) }),
                ],
              }));
            }
          });
        }
        
        children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      });
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_${project.name.replace(/\s+/g, '_')}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const generateFullPPTReport = async (
  project: Project, 
  projectData: any, 
  availableTools: any[], 
  phases: any[], 
  initiativeName?: string, 
  initiativeConfigs: any[] = [],
  toolImages: Record<string, string> = {} // New parameter
) => {
  const pres = new pptxgen();
  
  // Title Slide
  const titleSlide = pres.addSlide();
  
  // Add Logo to Title Slide
  titleSlide.addImage({ path: LBW_LOGO_URL, x: 4.25, y: 0.5, w: 1.5, h: 0.6 });

  titleSlide.addText(`Relatório do Projeto: ${project.name}`, { x: 1, y: 2, w: '80%', h: 1, fontSize: 32, bold: true, align: 'center' });
  titleSlide.addText(`Iniciativa: ${initiativeName || 'N/A'}`, { x: 1, y: 3.5, w: '80%', h: 0.5, fontSize: 18, align: 'center' });
  titleSlide.addText(`Data: ${new Date().toLocaleDateString()}`, { x: 1, y: 4.5, w: '80%', h: 0.5, fontSize: 14, align: 'center' });

  // START: Insert Process Map at the beginning if it exists
  if (projectData['processMap']) {
    const processData = projectData['processMap'].toolData || projectData['processMap'];
    const { nodes, lanes } = processData;

    const processHeaderSlide = pres.addSlide();
    processHeaderSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
    processHeaderSlide.addText("Mapa do Processo", { x: 1, y: 2.5, w: '80%', h: 1, fontSize: 36, bold: true, align: 'center', color: '3b82f6' });

    if (toolImages['processMap']) {
      const imgSlide = pres.addSlide();
      imgSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
      imgSlide.addText("Visão Geral do Fluxo", { x: 0.5, y: 0.2, w: '80%', h: 0.5, fontSize: 24, bold: true, color: '333333' });
      imgSlide.addImage({ 
        data: toolImages['processMap'], 
        x: 0.5, y: 0.8, w: 9, h: 4.5 
      });
    }

    if (nodes && nodes.length > 0) {
      const tableSlide = pres.addSlide();
      tableSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
      tableSlide.addText("Atividades Detalhadas", { x: 0.5, y: 0.2, w: '80%', h: 0.5, fontSize: 24, bold: true, color: '333333' });

      const sortedNodes = [...nodes].sort((a, b) => {
        const laneA = lanes.findIndex((l: any) => l.id === a.laneId);
        const laneB = lanes.findIndex((l: any) => l.id === b.laneId);
        if (laneA !== laneB) return laneA - laneB;
        return a.x - b.x;
      });

      const rows: any[] = [
        ['Área', 'Tipo', 'Atividade'].map(t => ({ text: t, options: { bold: true, fill: { color: 'F0F0F0' } } }))
      ];

      sortedNodes.filter((n: any) => n.type !== 'text').slice(0, 8).forEach((node: any) => {
        const lane = lanes.find((l: any) => l.id === node.laneId);
        rows.push([
          lane?.name || '-',
          node.type,
          node.text
        ].map(v => ({ text: String(v) })));
      });

      tableSlide.addTable(rows, { x: 0.5, y: 1, w: 9, fontSize: 10 });
    }
  }
  // END: Process Map section

  // Iterate through phases
  phases.forEach(phase => {
    // ... (phase logic)
    let phaseToolIds: string[] = [];
    
    const config = initiativeConfigs.find(c => c.phaseId === phase.id);
    if (config) {
      phaseToolIds = config.toolIds;
    }

    const savedPhaseTools = availableTools.filter(t => phaseToolIds.includes(t.id) && projectData[t.id]);

    if (savedPhaseTools.length > 0) {
      // Phase Divider Slide
      const phaseSlide = pres.addSlide();
      phaseSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
      phaseSlide.addText(`Fase: ${phase.name}`, { x: 1, y: 2.5, w: '80%', h: 1, fontSize: 36, bold: true, align: 'center', color: '3b82f6' });

      savedPhaseTools.forEach(tool => {
        const data = projectData[tool.id];
        const toolSlide = pres.addSlide();
        
        // Logo on every tool slide
        toolSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
        toolSlide.addText(tool.name, { x: 0.5, y: 0.2, w: '80%', h: 0.5, fontSize: 24, bold: true, color: '333333' });

        // Include Tool Image if available
        if (toolImages[tool.id]) {
          toolSlide.addImage({ 
            data: toolImages[tool.id], 
            x: 0.5, y: 0.8, w: 9, h: 4.5 
          });
          // If it's Ishikawa, we might want to add the AI report on a new slide or below
          // For now, let's just add the image and then the report on the next slide if it exists
        }

        // Check if there is an AI Report (Step 2)
        if (data && data.aiReport) {
          // If we already added an image, let's add the report on a NEW slide
          let targetSlide = toolSlide;
          let yOffset = 0.8;

          if (toolImages[tool.id]) {
            const reportSlide = pres.addSlide();
            reportSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
            reportSlide.addText(`${tool.name} - Análise`, { x: 0.5, y: 0.2, w: '80%', h: 0.5, fontSize: 24, bold: true, color: '333333' });
            targetSlide = reportSlide;
          }

          const cleanText = data.aiReport
            .replace(/#+ /g, '')
            .split('\n')
            .filter((line: string) => line.trim() !== '')
            .join('\n');

          const fontSize = cleanText.length > 1000 ? 10 : cleanText.length > 500 ? 12 : 14;
          targetSlide.addText(cleanText, {
            x: 0.5, y: yOffset, w: '90%', h: 4.5,
            fontSize: fontSize, color: '333333', align: 'left',
            valign: 'top'
          });
          return; // Skip raw data if AI report exists
        }

        // Extract toolData if it's wrapped in ToolWrapper structure
        const toolData = data?.toolData || data;

        // SPECIAL CASE: Improvement Project Plan - Dashboard PPT
        if (tool.id === 'improvementPlan' && toolData.phases) {
          const phases = toolData.phases as any[];
          const total = phases.reduce((acc, p) => acc + (p.activities?.length || 0), 0);
          const completed = phases.reduce((acc, p) => acc + (p.activities?.filter((a: any) => a.status === 'Completed').length || 0), 0);
          const today = new Date().toISOString().split('T')[0];
          const delayed = phases.reduce((acc, p) => acc + (p.activities?.filter((a: any) => a.status !== 'Completed' && a.plannedFinish && today > a.plannedFinish).length || 0), 0);
          
          const totalWeight = phases.reduce((acc, p) => acc + (p.activities?.reduce((sum: number, a: any) => sum + (a.weight || 0), 0) || 0), 0);
          const earnedWeight = phases.reduce((acc, p) => acc + (p.activities?.reduce((sum: number, a: any) => {
            const progress = a.status === 'Completed' ? 1 : a.status === 'In Progress' ? 0.5 : 0;
            return sum + ((a.weight || 0) * progress);
          }, 0) || 0), 0);

          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          const weightedProgress = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

          // Dashboard Slide
          const dashboardSlide = pres.addSlide();
          dashboardSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
          dashboardSlide.addText(`${tool.name} - Dashboard`, { x: 0.5, y: 0.2, w: '80%', h: 0.5, fontSize: 24, bold: true, color: '3b82f6' });

          const stats = [
            { label: 'Progresso Geral', value: `${progress}%` },
            { label: 'Progresso Ponderado', value: `${weightedProgress}%` },
            { label: 'Concluídas', value: `${completed} / ${total}` },
            { label: 'Atrasadas', value: `${delayed}` }
          ];

          stats.forEach((stat, idx) => {
            dashboardSlide.addText(stat.label, { x: 0.5 + idx * 2.3, y: 1, w: 2.2, h: 0.4, fontSize: 12, bold: true, align: 'center', fill: { color: 'F0F0F0' } });
            dashboardSlide.addText(stat.value, { x: 0.5 + idx * 2.3, y: 1.4, w: 2.2, h: 0.6, fontSize: 20, bold: true, align: 'center', color: stat.label === 'Atrasadas' && delayed > 0 ? 'FF0000' : '333333' });
          });

          // AI Analysis if available
          if (data.aiReport) {
            dashboardSlide.addText("Análise Executiva da IA", { x: 0.5, y: 2.5, w: '90%', h: 0.4, fontSize: 16, bold: true, color: '3b82f6' });
            const cleanText = data.aiReport.replace(/#+ /g, '').split('\n').filter((l: string) => l.trim() !== '').join('\n');
            dashboardSlide.addText(cleanText, { x: 0.5, y: 3, w: '90%', h: 2.5, fontSize: 11, align: 'left', valign: 'top' });
          }

          // Detailed Plan Slides
          phases.forEach(phase => {
            if (phase.activities && phase.activities.length > 0) {
              const phaseSlide = pres.addSlide();
              phaseSlide.addImage({ path: LBW_LOGO_URL, x: 8.5, y: 0.2, w: 1, h: 0.4 });
              phaseSlide.addText(`${tool.name} - ${phase.name}`, { x: 0.5, y: 0.2, w: '80%', h: 0.5, fontSize: 24, bold: true, color: '333333' });

              const rows = [
                ['Atividade', 'Status', 'Fim', 'Responsável'].map(t => ({ text: t, options: { bold: true, fill: { color: 'F0F0F0' } } }))
              ];
              phase.activities.slice(0, 10).forEach((act: any) => {
                rows.push([act.text.substring(0, 50), act.status, act.plannedFinish || '-', act.owner || '-'].map(v => ({ 
                  text: String(v), 
                  options: { bold: false, fill: { color: 'FFFFFF' } } 
                })));
              });
              phaseSlide.addTable(rows, { x: 0.5, y: 1, w: 9, fontSize: 10 });
            }
          });
          return;
        }

        if (tool.id === 'actionPlan' && toolData.actions) {
          const rows: any[] = [
            toolData.columns.map((col: any) => ({ text: col.title, options: { bold: true, fill: { color: 'F0F0F0' } } }))
          ];
          toolData.actions.slice(0, 10).forEach((action: any) => {
            rows.push(toolData.columns.map((col: any) => {
              let text = '';
              if (col.type === 'status') {
                text = `${action[col.id]?.state || ''} (${action[col.id]?.progress || '0%'})`;
              } else {
                text = String(action[col.id] || '');
              }
              return { text };
            }));
          });
          toolSlide.addTable(rows, { x: 0.5, y: 1, w: 9, fontSize: 10 });
        } else if (tool.id === 'charter' && toolImages[tool.id]) {
          try {
            toolSlide.addImage({ 
              data: toolImages[tool.id], 
              x: 0.5, 
              y: 0.8, 
              w: 9, 
              h: 4.5,
              sizing: { type: 'contain', w: 9, h: 4.5 }
            });
          } catch (e) {
            console.error("Erro ao inserir imagem do Charter no PPT", e);
          }
        } else if (tool.id === 'sipoc' && toolData.rows) {
          const rows: any[] = [
            ['Fornecedores', 'Entradas', 'Processo', 'Saídas', 'Clientes'].map(t => ({ text: t, options: { bold: true, fill: { color: 'F0F0F0' } } }))
          ];
          toolData.rows.slice(0, 8).forEach((row: any) => {
            rows.push([row.suppliers, row.inputs, row.process, row.outputs, row.customers].map(v => ({ text: String(v || '') })));
          });
          toolSlide.addTable(rows, { x: 0.5, y: 1, w: 9, fontSize: 10 });
        } else if (tool.id === 'measureIshikawa' && toolData.causes) {
          let y = 0.8;
          Object.entries(toolData.causes).slice(0, 6).forEach(([cat, items]: [string, any]) => {
            if (items && (items as any).length > 0) {
              toolSlide.addText(cat, { x: 0.5, y, w: 2, h: 0.3, fontSize: 12, bold: true, color: '3b82f6' });
              const txt = (items as any).slice(0, 3).map((i: string) => `• ${i}`).join('\n');
              toolSlide.addText(txt, { x: 2.5, y, w: 6.5, h: 0.8, fontSize: 10 });
              y += 0.9;
            }
          });
        } else if (tool.id === 'fiveWhys' && toolData.whys) {
          const item = toolData.whys[0];
          if (item) {
            toolSlide.addText(`Causa: ${item.cause}`, { x: 0.5, y: 0.8, w: '90%', h: 0.4, fontSize: 14, bold: true });
            const steps = item.steps.map((s: string, i: number) => `${i + 1}º Porquê: ${s}`).join('\n');
            toolSlide.addText(steps, { x: 0.5, y: 1.3, w: '90%', h: 3, fontSize: 12 });
            toolSlide.addText(`Causa Raiz: ${item.rootCause}`, { x: 0.5, y: 4.5, w: '90%', h: 0.4, fontSize: 14, bold: true, color: 'red' });
          }
        } else if (tool.id === 'brainstorming' && toolData.ideas) {
          toolSlide.addText(`Tópico: ${toolData.brainstormingTopic || ''}`, { x: 0.5, y: 0.8, w: '90%', h: 0.4, fontSize: 14, bold: true });
          const ideasText = toolData.ideas.slice(0, 15).map((idea: any) => `• [${idea.category}] ${idea.text}`).join('\n');
          toolSlide.addText(ideasText, { x: 0.5, y: 1.3, w: '90%', h: 4, fontSize: 11, bullet: true });
        } else if (toolData.rows && Array.isArray(toolData.rows)) {
          // Generic Table for PPT
          const firstRow = toolData.rows[0];
          if (firstRow) {
            const keys = Object.keys(firstRow).filter(k => k !== 'id');
            const rows: any[] = [
              keys.map(k => ({ text: k.charAt(0).toUpperCase() + k.slice(1), options: { bold: true, fill: { color: 'F0F0F0' } } }))
            ];
            toolData.rows.slice(0, 10).forEach((row: any) => {
              rows.push(keys.map(k => ({ text: String(row[k] || '') })));
            });
            toolSlide.addTable(rows, { x: 0.5, y: 1, w: 9, fontSize: 10 });
          }
        } else {
          // Generic Text for other tools
          const text = Object.entries(toolData)
            .filter(([_, v]) => typeof v !== 'object' && v)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n\n');
          toolSlide.addText(text || "Dados salvos na ferramenta.", { x: 0.5, y: 1, w: '90%', h: 4, fontSize: 12 });
        }
      });
    }
  });

  pres.writeFile({ fileName: `Relatorio_${project.name.replace(/\s+/g, '_')}.pptx` });
};

export const generateProjectCharterExcel = async (project: Project, toolData: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Project Charter');

  // Define columns for a professional grid
  worksheet.columns = [
    { header: 'A', key: 'col1', width: 20 },
    { header: 'B', key: 'col2', width: 20 },
    { header: 'C', key: 'col3', width: 20 },
    { header: 'D', key: 'col4', width: 20 },
    { header: 'E', key: 'col5', width: 8 },
    { header: 'F', key: 'col6', width: 8 },
    { header: 'G', key: 'col7', width: 8 },
    { header: 'H', key: 'col8', width: 8 },
    { header: 'I', key: 'col9', width: 8 },
  ];

  // Styles
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  };

  const sectionHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  };

  const cellStyle: Partial<ExcelJS.Style> = {
    alignment: { vertical: 'middle', wrapText: true },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  };

  const labelStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } },
    alignment: { vertical: 'middle', horizontal: 'right' },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  };

  // 1. Main Header
  const titleRow = worksheet.addRow(['CONTRATO DO PROJETO']);
  worksheet.mergeCells(`A${titleRow.number}:I${titleRow.number}`);
  titleRow.getCell(1).style = headerStyle;
  titleRow.height = 35;

  // 2. Project Name
  const projectRow = worksheet.addRow(['PROJETO:', project.name]);
  worksheet.mergeCells(`B${projectRow.number}:I${projectRow.number}`);
  projectRow.getCell(1).style = labelStyle;
  projectRow.getCell(2).style = { ...cellStyle, font: { bold: true } };
  projectRow.height = 25;

  worksheet.addRow([]); // Spacer

  // 3. Info Grid
  const info1 = worksheet.addRow(['TÍTULO DO PROJETO:', toolData.title || "", '', 'DATA:', toolData.date || "", 'REV:', toolData.rev || ""]);
  worksheet.mergeCells(`B${info1.number}:C${info1.number}`);
  worksheet.mergeCells(`E${info1.number}:F${info1.number}`);
  worksheet.mergeCells(`H${info1.number}:I${info1.number}`);
  [1, 4, 6].forEach(i => info1.getCell(i).style = labelStyle);
  [2, 5, 7].forEach(i => info1.getCell(i).style = cellStyle);

  const info2 = worksheet.addRow(['ÁREA / PLANTA:', toolData.area || "", '', 'LÍDER:', toolData.leader || "", 'CHAMPION:', toolData.champion || ""]);
  worksheet.mergeCells(`B${info2.number}:C${info2.number}`);
  worksheet.mergeCells(`E${info2.number}:F${info2.number}`);
  worksheet.mergeCells(`H${info2.number}:I${info2.number}`);
  [1, 4, 6].forEach(i => info2.getCell(i).style = labelStyle);
  [2, 5, 7].forEach(i => info2.getCell(i).style = cellStyle);

  worksheet.addRow([]); // Spacer

  // 4. Problem Definition
  const probH = worksheet.addRow(['DEFINIÇÃO OPERACIONAL DO PROBLEMA']);
  worksheet.mergeCells(`A${probH.number}:I${probH.number}`);
  probH.getCell(1).style = sectionHeaderStyle;

  const probC = worksheet.addRow([toolData.problemDefinition || ""]);
  worksheet.mergeCells(`A${probC.number}:I${probC.number}`);
  probC.getCell(1).style = cellStyle;
  probC.height = 80;

  worksheet.addRow([]); // Spacer

  // 5. Goal & KPI
  const goalH = worksheet.addRow(['META E INDICADORES (KPI)']);
  worksheet.mergeCells(`A${goalH.number}:I${goalH.number}`);
  goalH.getCell(1).style = sectionHeaderStyle;

  const goalR = worksheet.addRow(['META:', toolData.goalDefinition || "", '', 'KPI:', toolData.kpi || ""]);
  worksheet.mergeCells(`B${goalR.number}:D${goalR.number}`);
  worksheet.mergeCells(`F${goalR.number}:I${goalR.number}`);
  [1, 5].forEach(i => goalR.getCell(i).style = labelStyle);
  [2, 6].forEach(i => goalR.getCell(i).style = cellStyle);
  goalR.height = 50;

  worksheet.addRow([]); // Spacer

  // 6. Scope & Contributions
  const scopeH = worksheet.addRow(['ESCOPO E CONTRIBUIÇÕES']);
  worksheet.mergeCells(`A${scopeH.number}:I${scopeH.number}`);
  scopeH.getCell(1).style = sectionHeaderStyle;

  const scopeR = worksheet.addRow(['IN (Escopo):', toolData.scopeIn || "", '', 'OUT (Fora):', toolData.scopeOut || ""]);
  worksheet.mergeCells(`B${scopeR.number}:D${scopeR.number}`);
  worksheet.mergeCells(`F${scopeR.number}:I${scopeR.number}`);
  [1, 5].forEach(i => scopeR.getCell(i).style = labelStyle);
  [2, 6].forEach(i => scopeR.getCell(i).style = cellStyle);
  scopeR.height = 40;

  const contribR = worksheet.addRow(['CONTRIBUIÇÕES:', toolData.businessContributions || ""]);
  worksheet.mergeCells(`B${contribR.number}:I${contribR.number}`);
  contribR.getCell(1).style = labelStyle;
  contribR.getCell(2).style = cellStyle;
  contribR.height = 40;

  worksheet.addRow([]); // Spacer

  // 7. History & Images
  const histH = worksheet.addRow(['HISTÓRICO DO PROBLEMA']);
  worksheet.mergeCells(`A${histH.number}:I${histH.number}`);
  histH.getCell(1).style = sectionHeaderStyle;

  const histStartRow = worksheet.lastRow!.number + 1;
  const histTextRow = worksheet.addRow([toolData.problemHistory || ""]);
  worksheet.mergeCells(`A${histStartRow}:E${histStartRow + 7}`);
  histTextRow.getCell(1).style = cellStyle;

  // Image Area
  worksheet.mergeCells(`F${histStartRow}:I${histStartRow + 7}`);
  worksheet.getCell(`F${histStartRow}`).style = cellStyle;

  if (toolData.images && toolData.images.length > 0) {
    try {
      for (let i = 0; i < Math.min(toolData.images.length, 2); i++) {
        const base64 = toolData.images[i];
        if (!base64.startsWith('data:image')) continue;
        const base64Data = base64.split(',')[1];
        const extension = base64.split(';')[0].split('/')[1] as 'png' | 'jpeg' | 'gif';
        const imageId = workbook.addImage({ base64: base64Data, extension: extension === 'jpeg' ? 'jpeg' : extension === 'gif' ? 'gif' : 'png' });
        
        worksheet.addImage(imageId, {
          tl: { col: 5.2 + (i % 2) * 1.8, row: histStartRow - 0.8 },
          ext: { width: 160, height: 140 }
        });
      }
    } catch (e) { console.error(e); }
  }

  for(let i=0; i<8; i++) worksheet.addRow([]); // Skip merged rows

  worksheet.addRow([]); // Spacer

  // 8. Stakeholders
  const stakH = worksheet.addRow(['EQUIPE DO PROJETO E STAKEHOLDERS']);
  worksheet.mergeCells(`A${stakH.number}:I${stakH.number}`);
  stakH.getCell(1).style = sectionHeaderStyle;

  const stakSub = worksheet.addRow(['FUNÇÃO', 'NOME', 'D', 'M', 'A', 'I', 'C', 'OUTROS', '']);
  worksheet.mergeCells(`H${stakSub.number}:I${stakSub.number}`);
  stakSub.eachCell(c => c.style = sectionHeaderStyle);

  if (toolData.stakeholders && Array.isArray(toolData.stakeholders)) {
    toolData.stakeholders.forEach((s: any) => {
      const row = worksheet.addRow([
        s.role || "",
        s.name || "",
        s.definition || "",
        s.measurement || "",
        s.analysis || "",
        s.improvement || "",
        s.control || "",
        "",
        ""
      ]);
      worksheet.mergeCells(`H${row.number}:I${row.number}`);
      row.eachCell(c => {
        c.style = cellStyle;
        if (['C','D','E','F','G'].some(col => c.address.includes(col))) {
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });
  }

  // Final border check
  worksheet.eachRow(row => {
    row.eachCell(cell => {
      if (!cell.border) {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Project_Charter_${project.name.replace(/\s+/g, '_')}.xlsx`);
};
