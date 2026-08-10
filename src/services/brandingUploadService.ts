/**
 * brandingUploadService — upload dos arquivos da marca do consultor (foto, logo,
 * imagens ou arquivos PPT próprios) pro Firebase Storage.
 *
 * Regras de tamanho/formato (protege o Storage e o carregamento do app):
 *  - foto  → JPEG, máx 512px  (é retrato; JPEG comprime bem)
 *  - logo  → PNG, máx 600px   (PRESERVA transparência — logo não pode virar JPEG)
 *  - ppt   → aceita PNG/JPG/SVG ou PPTX. Imagens são otimizadas; PPTX sobe bruto.
 *
 * Caminho no Storage: community_uploads/{uid}/branding-{tipo}-{stamp}
 * (reusa a regra JÁ deployada de community_uploads — sem mexer no storage.rules).
 */
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';

export type BrandingAsset = 'foto' | 'logo' | 'ppt-capa' | 'ppt-interna' | 'certificado-fundo' | 'certificado-assinatura';

const MAX_ORIGEM_BYTES = 6 * 1024 * 1024;
const MAX_PPT_BYTES = 30 * 1024 * 1024;

const CONFIG: Record<BrandingAsset, { max: number; mime: 'image/jpeg' | 'image/png'; q: number }> = {
  'foto':        { max: 512,  mime: 'image/jpeg', q: 0.85 },
  'logo':        { max: 600,  mime: 'image/png',  q: 0.92 },
  'ppt-capa':    { max: 1920, mime: 'image/png',  q: 0.92 },
  'ppt-interna': { max: 1920, mime: 'image/png',  q: 0.92 },
  'certificado-fundo':      { max: 2400, mime: 'image/png', q: 0.94 },
  'certificado-assinatura': { max: 1000, mime: 'image/png', q: 0.94 },
};

/** Redimensiona no canvas mantendo proporção; exporta no mime pedido. */
function redimensionar(file: File, max: number, mime: string, q: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponível'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar a imagem'))), mime, q);
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Processa e sobe uma imagem de marca. Devolve a URL pública (download URL).
 * Lança erro legível se o arquivo não for imagem ou for grande demais.
 */
export async function uploadBrandingImage(file: File, tipo: BrandingAsset): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('Você precisa estar logado.');
  const isPptAsset = tipo === 'ppt-capa' || tipo === 'ppt-interna';
  const extOriginal = (file.name.split('.').pop() || '').toLowerCase();
  const isPowerPoint = extOriginal === 'pptx'
    || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  if (isPptAsset && isPowerPoint) {
    if (file.size > MAX_PPT_BYTES) throw new Error('Arquivo PowerPoint muito grande (máx. 30 MB). Reduza e tente de novo.');
    const contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const caminho = `community_uploads/${u.uid}/branding-${tipo}.pptx`;
    const sref = storageRef(storage, caminho);
    await uploadBytes(sref, file, { contentType });
    return getDownloadURL(sref);
  }

  if (!(file.type || '').startsWith('image/')) {
    throw new Error(isPptAsset ? 'Envie uma imagem (PNG, JPG...) ou um PowerPoint (.pptx).' : 'Envie um arquivo de imagem (PNG, JPG...).');
  }
  if (file.size > MAX_ORIGEM_BYTES) throw new Error('Imagem muito grande (máx. 6 MB). Reduza e tente de novo.');

  const cfg = CONFIG[tipo];
  const blob = await redimensionar(file, cfg.max, cfg.mime, cfg.q);
  const ext = cfg.mime === 'image/png' ? 'png' : 'jpg';
  // Stamp estável (sem Date.now/Math.random): sobrescreve o anterior do mesmo tipo.
  const caminho = `community_uploads/${u.uid}/branding-${tipo}.${ext}`;
  const sref = storageRef(storage, caminho);
  await uploadBytes(sref, blob, { contentType: cfg.mime });
  return getDownloadURL(sref);
}
