import React, { useState, useEffect, useRef } from 'react';
import { User, Building2, Briefcase, Camera, CheckCircle2, X } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { uploadBrandingImage } from '../services/brandingUploadService';

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
const PROFILE_CLOUD_KEY = 'lbw_user_profile_cloud_synced';

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
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const current = getUserProfile();
      const usuario = auth.currentUser;
      if (!usuario) return;
      try {
        const snapshot = await getDoc(doc(db, 'users', usuario.uid));
        const dados = snapshot.data() || {};
        const perfilJaSincronizado = localStorage.getItem(PROFILE_CLOUD_KEY) === '1';
        const atualizado: UserProfileData = {
          ...current,
          name: String((perfilJaSincronizado ? dados.nome : current.name) || dados.nome || usuario.displayName || usuario.email?.split('@')[0] || ''),
          email: usuario.email || current.email,
          company: String((perfilJaSincronizado ? dados.empresaPerfil : current.company) || dados.empresaPerfil || ''),
          role: String((perfilJaSincronizado ? dados.cargo : current.role) || dados.cargo || ''),
          photoUrl: String((perfilJaSincronizado ? dados.fotoUrl : current.photoUrl) || dados.fotoUrl || usuario.photoURL || ''),
        };
        if (ativo) {
          setProfile(atualizado);
          setPhotoPreview(atualizado.photoUrl);
        }
      } catch {
        if (ativo) setProfile({ ...current, email: usuario.email || current.email });
      }
    })();
    return () => { ativo = false; };
  }, []);

  const handleChange = (field: keyof UserProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Foto muito grande. Máximo 2MB.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadBrandingImage(file, 'foto');
      setPhotoPreview(url);
      setProfile(prev => ({ ...prev, photoUrl: url }));
      setSaved(false);
    } catch (erro: any) {
      alert(erro?.message || 'Não foi possível enviar a foto.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      alert('Nome é obrigatório.');
      return;
    }
    const usuario = auth.currentUser;
    if (!usuario) return;
    setSaving(true);
    try {
      let fotoUrl = profile.photoUrl;
      // Migra fotos antigas que ainda estavam guardadas somente no navegador.
      if (fotoUrl.startsWith('data:')) {
        const blob = await (await fetch(fotoUrl)).blob();
        const arquivo = new File([blob], 'foto-perfil.jpg', { type: blob.type || 'image/jpeg' });
        fotoUrl = await uploadBrandingImage(arquivo, 'foto');
      }
      const atualizado = { ...profile, photoUrl: fotoUrl };
      await setDoc(doc(db, 'users', usuario.uid), {
        nome: atualizado.name.trim(),
        empresaPerfil: atualizado.company.trim(),
        cargo: atualizado.role.trim(),
        fotoUrl,
      }, { merge: true });
      await updateProfile(usuario, { displayName: atualizado.name.trim(), photoURL: fotoUrl || null });
      saveUserProfile(atualizado);
      localStorage.setItem(PROFILE_CLOUD_KEY, '1');
      setProfile(atualizado);
      setPhotoPreview(fotoUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (erro: any) {
      alert(erro?.message || 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

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
            disabled={uploadingPhoto}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700"
          >
            <Camera size={14} />
            {uploadingPhoto ? 'Enviando foto...' : photoPreview ? 'Trocar foto do perfil' : 'Fazer upload da foto'}
          </button>
          <p className="text-xs text-blue-500 mt-2">Máximo 2MB — JPG ou PNG</p>
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
      {/* Botão Salvar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          Seus dados ficam salvos localmente e são usados nos projetos e relatórios.
        </p>
        <button
          onClick={handleSave}
          disabled={saving || uploadingPhoto}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer shadow-lg ${
            saved
              ? 'bg-green-500 text-white shadow-green-100'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
          }`}
        >
          <CheckCircle2 size={16} />
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  );
}
