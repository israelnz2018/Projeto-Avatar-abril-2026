import React from 'react';
import { ArrowUpDown, Plus } from 'lucide-react';

interface TableToolbarProps {
  itemCount: number;
  selectedCount?: number;
  onSort?: () => void;
  onAddColumn?: (name: string) => void;
  isSorted?: boolean;
}

export function TableToolbar({ 
  itemCount, 
  selectedCount,
  onSort, 
  onAddColumn,
  isSorted
}: TableToolbarProps) {
  const [showAddCol, setShowAddCol] = React.useState(false);
  const [newColName, setNewColName] = React.useState('');

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          {selectedCount !== undefined && selectedCount > 0 && (
            <span className="ml-2 text-blue-600">· {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onSort && (
          <button
            onClick={onSort}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border-none cursor-pointer ${
              isSorted 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowUpDown size={12} />
            Ordenar por resultado
          </button>
        )}

        {onAddColumn && (
          <div className="relative">
            {showAddCol ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newColName.trim()) {
                      onAddColumn(newColName.trim());
                      setNewColName('');
                      setShowAddCol(false);
                    }
                    if (e.key === 'Escape') {
                      setShowAddCol(false);
                      setNewColName('');
                    }
                  }}
                  placeholder="Nome da coluna..."
                  className="px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                />
                <button
                  onClick={() => {
                    if (newColName.trim()) {
                      onAddColumn(newColName.trim());
                      setNewColName('');
                    }
                    setShowAddCol(false);
                  }}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg border-none cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCol(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border-none cursor-pointer"
              >
                <Plus size={12} />
                Coluna
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
