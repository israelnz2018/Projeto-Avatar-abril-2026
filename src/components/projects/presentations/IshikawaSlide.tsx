const NAVY = '#1E3A5F';
const CORAL = '#D85A30';
const INK = '#2A2F3A';
const CHIP_BG = '#EAF1F8';
const CHIP_BORDER = '#C7D6E6';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const findCauses = (causes: Record<string, string[]>, target: string): string[] => {
  const t = norm(target);
  for (const key of Object.keys(causes || {})) {
    if (norm(key) === t) return (causes[key] || []).filter(c => c && c.trim().length > 0);
  }
  return [];
};

const CATEGORIES: { name: string; x: number; isTop: boolean }[] = [
  { name: 'Método',         x: 80,  isTop: true  },
  { name: 'Material',       x: 320, isTop: true  },
  { name: 'Medida',         x: 560, isTop: true  },
  { name: 'Máquina',        x: 80,  isTop: false },
  { name: 'Mão de obra',    x: 320, isTop: false },
  { name: 'Meio ambiente',  x: 560, isTop: false },
];

interface Props {
  toolData: { problem?: string; causes?: Record<string, string[]> };
}

export function IshikawaSlide({ toolData }: Props) {
  const causes = toolData.causes || {};
  const renderCauses = (categoryName: string, isTop: boolean) => {
    const list = findCauses(causes, categoryName).slice(0, 5);
    if (list.length === 0) return null;
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, [isTop ? 'bottom' : 'top']: '40px', fontSize: '10px', color: INK, lineHeight: 1.35, padding: '0 6px' }}>
        {list.map((c, i) => <div key={i} style={{ marginBottom: '2px' }}>• {c}</div>)}
      </div>
    );
  };

  return (
    <svg viewBox="0 0 900 360" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <line x1="20" y1="180" x2="730" y2="180" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" />
      <g transform="translate(735, 145)">
        <rect width="160" height="70" rx="4" fill={CORAL} />
        <text x="80" y="18" textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFF" letterSpacing="2">PROBLEMA</text>
        <foreignObject x="6" y="22" width="148" height="44">
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFF', textAlign: 'center', lineHeight: 1.2 }}>
            {toolData.problem || '(problema não informado)'}
          </div>
        </foreignObject>
      </g>
      {CATEGORIES.map((cat, idx) => {
        const spineX = cat.x + 75;
        const badgeY = cat.isTop ? 8 : 320;
        const diagY1 = 180;
        const diagY2 = cat.isTop ? badgeY + 26 : badgeY;
        return (
          <g key={idx}>
            <line x1={spineX} y1={diagY1} x2={cat.x + 75} y2={diagY2} stroke={NAVY} strokeWidth="1.1" />
            <rect x={cat.x} y={badgeY} width="150" height="26" rx="3" fill={CHIP_BG} stroke={CHIP_BORDER} strokeWidth="0.5" />
            <text x={cat.x + 75} y={badgeY + 17} textAnchor="middle" fontSize="11" fontWeight="700" fill={NAVY}>{cat.name}</text>
            <foreignObject x={cat.x + 0} y={cat.isTop ? badgeY + 30 : badgeY - 130} width="180" height="130">
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {renderCauses(cat.name, cat.isTop)}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
