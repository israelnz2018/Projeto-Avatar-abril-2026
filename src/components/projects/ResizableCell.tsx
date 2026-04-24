import React, { useRef, useEffect } from 'react';

interface ResizableCellProps {
  width: number;
  minHeight?: number;
  onColResize?: (e: React.MouseEvent) => void;
  onRowResize?: (e: React.MouseEvent) => void;
  isLastCol?: boolean;
  isLastRow?: boolean;
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
}

export function ResizableCell({
  width,
  minHeight = 40,
  onColResize,
  onRowResize,
  isLastCol,
  isLastRow,
  children,
  className = '',
  isHeader = false,
}: ResizableCellProps) {
  const Tag = isHeader ? 'th' : 'td';
  
  return (
    <Tag
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        minHeight: `${minHeight}px`,
        position: 'relative',
        verticalAlign: 'top',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        overflow: 'visible',
      }}
      className={`${className} border border-gray-200 p-2`}
    >
      <div className="w-full h-full" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
        {children}
      </div>

      {/* Handle de redimensionamento de coluna */}
      {!isLastCol && onColResize && (
        <div
          onMouseDown={onColResize}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 transition-colors z-20"
          style={{ userSelect: 'none' }}
        />
      )}

      {/* Handle de redimensionamento de linha */}
      {!isLastRow && onRowResize && (
        <div
          onMouseDown={onRowResize}
          className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-blue-400 transition-colors z-20"
          style={{ userSelect: 'none' }}
        />
      )}
    </Tag>
  );
}

export function AutoGrowTextarea({ value, onChange, placeholder, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    autoResize();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-300 focus:bg-blue-50/30 rounded px-1 py-0.5 transition-all ${className}`}
      style={{
        minHeight: '24px',
        lineHeight: '1.5',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        fontFamily: 'inherit',
        fontSize: 'inherit',
      }}
    />
  );
}
