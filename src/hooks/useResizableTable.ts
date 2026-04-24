import { useState, useCallback, useRef } from 'react';

export function useResizableTable(initialWidths: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState(initialWidths);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(Object.keys(initialWidths));
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const isResizingCol = useRef(false);
  const isResizingRow = useRef(false);

  // Resize coluna
  const startColResize = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingCol.current = true;
    const startX = e.clientX;
    const startWidth = columnWidths[colId] || 150;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingCol.current) return;
      const newWidth = Math.max(80, startWidth + e.clientX - startX);
      setColumnWidths(prev => ({ ...prev, [colId]: newWidth }));
    };

    const onMouseUp = () => {
      isResizingCol.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  // Resize linha
  const startRowResize = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRow.current = true;
    const startY = e.clientY;
    const startHeight = rowHeights[rowId] || 52;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRow.current) return;
      const newHeight = Math.max(40, startHeight + e.clientY - startY);
      setRowHeights(prev => ({ ...prev, [rowId]: newHeight }));
    };

    const onMouseUp = () => {
      isResizingRow.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rowHeights]);

  // Drag and drop colunas
  const handleColDragStart = (colId: string) => setDraggedCol(colId);
  const handleColDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };
  const handleColDrop = (targetColId: string) => {
    if (!draggedCol || draggedCol === targetColId) return;
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedCol);
      const toIdx = newOrder.indexOf(targetColId);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedCol);
      return newOrder;
    });
    setDraggedCol(null);
    setDragOverCol(null);
  };

  return {
    columnWidths,
    rowHeights,
    columnOrder,
    setColumnOrder,
    editingHeader,
    setEditingHeader,
    draggedCol,
    dragOverCol,
    startColResize,
    startRowResize,
    handleColDragStart,
    handleColDragOver,
    handleColDrop,
  };
}
