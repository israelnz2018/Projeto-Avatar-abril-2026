import React, { useState, useEffect, useRef } from 'react';
import { User, Building2, Briefcase, Camera, FileDown, Presentation, CheckCircle2, X, Palette } from 'lucide-react';
import { auth } from '../lib/firebase';

interface UserProfileData {
  name: string;
  email: string;
  company: string;
  role: string;
  photoUrl: string;
  wordTemplate: string;
  pptTemplate: string;
  companyLogoUrl: string;
  headerColor: string;
  headerTextColor: string;
}

const PROFILE_KEY = 'lbw_user_profile';

export const getUserProfile = (): UserProfileData => {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '',
    email: auth.currentUser?.email || '',
    company: '',
    role: '',
    photoUrl: '',
    wordTemplate: 'default',
    pptTemplate: 'default',
    companyLogoUrl: '',
    headerColor: '#1e3a5f',
    headerTextColor: '#ffffff',
  };
};

export const saveUserProfile = (profile: UserProfileData): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export default function UserProfile({ onClose }: { onClose?: () => void }) {
  const [profile, setProfile] = useState<UserProfileData>(getUserProfile());
  const [saved, setSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>(profile.photoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = getUserProfile();
    if (!current.email && auth.currentUser?.email) {
      current.email = auth.currentUser.email;
      current.name = current.name || auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
      setProfile(current);
    }
  }, []);

  const handleChange = (field: keyof UserProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Foto muito grande. Máximo 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setProfile(prev => ({ ...prev, photoUrl: base64 }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!profile.name.trim()) {
      alert('Nome é obrigatório.');
      return;
    }
    saveUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const WORD_TEMPLATES = [
    { id: 'default', label: 'Padrão LBW — Azul Corporativo' },
    { id: 'clean', label: 'Clean — Branco Minimalista' },
    { id: 'dark', label: 'Executivo — Cinza Escuro' },
  ];

  const PPT_TEMPLATES = [
    { id: 'default', label: 'Padrão LBW — Azul Corporativo' },
    { id: 'clean', label: 'Clean — Branco Minimalista' },
    { id: 'dark', label: 'Executivo — Escuro Profissional' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <User size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
            <p className="text-xs text-gray-500">Seus dados aparecem automaticamente nos projetos e relatórios</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border-none cursor-pointer bg-transparent">
            <X size={20} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Foto */}
      <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-200">
            {photoPreview ? (
              <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600">
                {profile.name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors border-2 border-white cursor-pointer"
          >
            <Camera size={13} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-base">{profile.name || 'Seu nome'}</p>
          <p className="text-sm text-gray-500">{profile.role || 'Seu cargo'}</p>
          <p className="text-xs text-gray-400">{profile.company || 'Sua empresa'}</p>
          <p className="text-xs text-blue-500 mt-1">Máximo 2MB — JPG ou PNG</p>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div className="space-y-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-gray-50 pb-2">
          <User size={16} />
          <span className="text-xs uppercase tracking-wider">Dados Pessoais</span>
        </div>

        {/* Nome */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="Seu nome completo"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">
            Email <span className="text-green-500">✓ Automático</span>
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Empresa */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">
            Empresa / Organização <span className="text-gray-400">(opcional)</span>
          </label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              value={profile.company}
              onChange={e => handleChange('company', e.target.value)}
              placeholder="Nome da sua empresa"
              className="w-full pl-9 pr-3 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
        </div>

        {/* Função */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">
            Cargo / Função <span className="text-gray-400">(opcional)</span>
          </label>
          <div className="relative">
            <Briefcase size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              value={profile.role}
              onChange={e => handleChange('role', e.target.value)}
              placeholder="Ex: Analista de Processos, Gerente de Qualidade"
              className="w-full pl-9 pr-3 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
        </div>
      </div>
      {/* Templates */}
      <div className="space-y-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-gray-50 pb-2">
          <FileDown size={16} />
          <span className="text-xs uppercase tracking-wider">Templates de Documentos</span>
        </div>

        <p className="text-xs text-gray-500">
          Escolha o design padrão dos seus relatórios Word e apresentações PowerPoint.
        </p>

        {/* Template Word */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1.5">
            <FileDown size={13} /> Template Word
          </label>
          <div className="grid grid-cols-1 gap-2">
            {WORD_TEMPLATES.map(t => (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  profile.wordTemplate === t.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="wordTemplate"
                  value={t.id}
                  checked={profile.wordTemplate === t.id}
                  onChange={() => handleChange('wordTemplate', t.id)}
                  className="accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">{t.label}</span>
                {profile.wordTemplate === t.id && (
                  <CheckCircle2 size={16} className="text-blue-500 ml-auto" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Template PPT */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1.5">
            <Presentation size={13} /> Template PowerPoint
          </label>
          <div className="grid grid-cols-1 gap-2">
            {PPT_TEMPLATES.map(t => (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  profile.pptTemplate === t.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="pptTemplate"
                  value={t.id}
                  checked={profile.pptTemplate === t.id}
                  onChange={() => handleChange('pptTemplate', t.id)}
                  className="accent-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">{t.label}</span>
                {profile.pptTemplate === t.id && (
                  <CheckCircle2 size={16} className="text-orange-500 ml-auto" />
                )}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Identidade Visual */}
      <div className="space-y-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-gray-50 pb-2">
          <Palette size={16} />
          <span className="text-xs uppercase tracking-wider">Identidade Visual</span>
        </div>

        <p className="text-xs text-gray-500">
          Sua logo e cores aparecem nos cabeçalhos das ferramentas e nos relatórios gerados.
        </p>

        {/* Logo da Empresa */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-2 block">
            Logo da Empresa <span className="text-gray-400">(opcional)</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
              {profile.companyLogoUrl ? (
                <img
                  src={profile.companyLogoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain p-1"
                />
              ) : (
                <div className="text-center">
                  <Building2 size={20} className="text-gray-300 mx-auto" />
                  <span className="text-[9px] text-gray-300 font-bold">LOGO</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-600">
                <Camera size={14} />
                {profile.companyLogoUrl ? 'Trocar logo' : 'Fazer upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      alert('Logo muito grande. Máximo 2MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleChange('companyLogoUrl', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {profile.companyLogoUrl && (
                <button
                  onClick={() => handleChange('companyLogoUrl', '')}
                  className="flex items-center gap-1 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors border-none bg-transparent cursor-pointer w-full"
                >
                  <X size={14} />
                  Remover logo
                </button>
              )}
              <p className="text-[10px] text-gray-400">PNG ou SVG recomendado — máx 2MB</p>
            </div>
          </div>
        </div>

        {/* Cor do Cabeçalho */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-2 block">
            Cor do Cabeçalho
          </label>

          {/* Paleta de cores predefinidas */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { color: '#1e3a5f', name: 'Azul Escuro' },
              { color: '#2563eb', name: 'Azul' },
              { color: '#0f766e', name: 'Verde Teal' },
              { color: '#7c3aed', name: 'Roxo' },
              { color: '#dc2626', name: 'Vermelho' },
              { color: '#ea580c', name: 'Laranja' },
              { color: '#374151', name: 'Cinza Escuro' },
              { color: '#1f2937', name: 'Quase Preto' },
            ].map(({ color, name }) => (
              <button
                key={color}
                onClick={() => handleChange('headerColor', color)}
                title={name}
                className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer"
                style={{
                  backgroundColor: color,
                  borderColor: profile.headerColor === color ? '#fff' : 'transparent',
                  boxShadow: profile.headerColor === color ? `0 0 0 2px ${color}` : 'none',
                  transform: profile.headerColor === color ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}

            {/* Color picker customizado */}
            <label
              className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
              title="Cor personalizada"
            >
              <span className="text-[10px] text-gray-400 font-bold">+</span>
              <input
                type="color"
                value={profile.headerColor}
                onChange={(e) => handleChange('headerColor', e.target.value)}
                className="absolute opacity-0 w-0 h-0"
              />
            </label>
          </div>

          {/* Preview do cabeçalho */}
          <div
            className="rounded-xl p-4 flex items-center gap-3 transition-all"
            style={{ backgroundColor: profile.headerColor }}
          >
            {profile.companyLogoUrl ? (
              <img
                src={profile.companyLogoUrl}
                alt="Logo preview"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white opacity-60" />
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm">
                {profile.company || 'Nome da Empresa'}
              </p>
              <p className="text-white text-xs opacity-70">
                Ferramenta: Espinha de Peixe
              </p>
            </div>
            <div className="ml-auto">
              <span className="text-white text-[10px] opacity-60 font-bold uppercase tracking-widest">
                LBW Copilot
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Preview de como vai aparecer nas ferramentas</p>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          Seus dados ficam salvos localmente e são usados nos projetos e relatórios.
        </p>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer shadow-lg ${
            saved
              ? 'bg-green-500 text-white shadow-green-100'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
          }`}
        >
          <CheckCircle2 size={16} />
          {saved ? 'Salvo!' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  );
}
