import { toPng } from 'html-to-image';

interface HandlePrintParams {
  toolId: string;
  projectName: string;
  setShowInlinePresentation: (show: boolean) => void;
  setIsPrinting: (printing: boolean) => void;
}

const PRESENTATION_ENABLED: string[] = [];

export async function handlePrintExport(params: HandlePrintParams): Promise<void> {
  const { toolId, projectName, setShowInlinePresentation, setIsPrinting } = params;

  // Caminho 1: ferramentas com apresentação inline ativada
  if (PRESENTATION_ENABLED.includes(toolId)) {
    setShowInlinePresentation(true);
    return;
  }

  // Caminho 2: captura DOM via report-content
  const element = document.getElementById('report-content');
  if (!element) {
    window.print();
    return;
  }

  setIsPrinting(true);
  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      filter: (node) => {
        const exclusionClasses = ['no-print'];
        if (node instanceof HTMLElement) {
          return !exclusionClasses.some(cls => node.classList.contains(cls));
        }
        return true;
      },
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório - ${projectName}</title>
            <style>
              body { margin: 0; padding: 0; display: flex; justify-content: center; background: #f3f4f6; }
              img { width: 210mm; height: auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
              @media print {
                body { background: white; }
                img { width: 100%; box-shadow: none; }
                @page { size: A4; margin: 0; }
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
      window.print();
    }
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    window.print();
  } finally {
    setIsPrinting(false);
  }
}