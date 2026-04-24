import { useState, useCallback, useRef } from 'react';

// A4 paisagem = 1123px | A4 retrato = 794px
const A4_MAX_WIDTH = 1123;

export function useA4Table(initialColumnWidths: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState(initialColumnWidths);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const isResizing = useRef(false);

  // Calcula a largura total atual
  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);

  // Redimensionar coluna respeitando limite A4
  const startColResize = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = columnWidths[colId] || 150;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = ev.clientX - startX;
      const newWidth = Math.max(60, startWidth + diff);
      
      // Calcula nova largura total
      const otherColsWidth = Object.entries(columnWidths)
        .filter(([id]) => id !== colId)
        .reduce((sum, [, w]) => sum + w, 0);
      
      const newTotal = otherColsWidth + newWidth;
      
      // Só aplica se não ultrapassar A4
      if (newTotal <= A4_MAX_WIDTH) {
        setColumnWidths(prev => ({ ...prev, [colId]: newWidth }));
      }
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  // Redimensionar linha
  const startRowResize = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startY = e.clientY;
    const startHeight = rowHeights[rowId] || 40;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newHeight = Math.max(30, startHeight + ev.clientY - startY);
      setRowHeights(prev => ({ ...prev, [rowId]: newHeight }));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rowHeights]);

  return {
    columnWidths,
    rowHeights,
    totalWidth,
    A4_MAX_WIDTH,
    startColResize,
    startRowResize,
  };
}
