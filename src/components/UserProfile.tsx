import React, { useState, useEffect, useRef } from 'react';
import { User, Building2, Briefcase, Camera, CheckCircle2, X } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { uploadBrandingImage } from '../services/brandingUploadService';
import { useConsultor } from '../contexts/ConsultorContext';
import { useUserAccess } from '../hooks/useUserAccess';
import { primeiroNome } from '../services/consultorService';
import {
  cuidarDoRegistroAntigo, gravarPerfilLocal, jaSincronizou, lerPerfilLocal, marcarSincronizado,
} from '../lib/perfilLocal';

interface UserProfileData {
  name: string;
  email: string;
  company: string;
  role: string;
  photoUrl: string;
  companySlogan: string;
  wordTemplate: string;
  pptTemplate: string;
  companyLogoUrl: string;
  headerColor: string;
  headerTextColor: string;
}

/**
 * O PERFIL É GUARDADO POR USUÁRIO, e nunca numa chave só — ver lib/perfilLocal.ts,
 * que é onde essa conta mora e onde ela é testada.
 *
 * Sem usuário logado não se lê nada: melhor a tela vir vazia do que vir com o dado
 * de outra pessoa.
 */
const PERFIL_VAZIO: UserProfileData = {
  name: '',
  email: '',
  company: '',
  role: '',
  photoUrl: '',
  companySlogan: '',
  wordTemplate: 'default',
  pptTemplate: 'default',
  companyLogoUrl: '',
  headerColor: '#1e3a5f',
  headerTextColor: '#ffffff',
};

export const getUserProfile = (): UserProfileData => {
  const usuario = auth.currentUser;
  if (!usuario) return { ...PERFIL_VAZIO };
  cuidarDoRegistroAntigo(localStorage, usuario.uid, usuario.email || '');
  const salvo = lerPerfilLocal<UserProfileData>(localStorage, usuario.uid);
  if (salvo) return { ...PERFIL_VAZIO, ...salvo };
  return {
    ...PERFIL_VAZIO,
    name: usuario.displayName || usuario.email?.split('@')[0] || '',
    email: usuario.email || '',
  };
};

export const saveUserProfile = (profile: UserProfileData): void => {
  gravarPerfilLocal(localStorage, auth.currentUser?.uid, profile);
};

/**
 * Faz o perfil do navegador seguir o que está na NUVEM.
 *
 * A nuvem (users/{uid}) é a fonte da verdade; a cópia no navegador existe para as
 * outras telas lerem rápido — é dela que sai o nome na capa do PowerPoint e a
 * empresa e o cargo nos relatórios. Sem isto, trocar de máquina (ou de navegador)
 * deixava essa cópia vazia: o consultor tinha o perfil salvo e os documentos saíam
 * sem empresa e sem cargo até ele abrir a tela de perfil e salvar de novo.
 *
 * Chamado pelo ouvinte de `users/{uid}` no App: salvar em qualquer lugar chega aqui
 * sozinho, na mesma hora.
 *
 * Só sobrescreve o campo que a nuvem realmente tem: o que só existe no navegador
 * (ainda não salvo) continua onde está.
 */
export function sincronizarPerfilLocal(dados: {
  nome?: unknown; empresaPerfil?: unknown; cargo?: unknown; fotoUrl?: unknown;
}): void {
  const usuario = auth.currentUser;
  if (!usuario) return;
  const atual = getUserProfile();
  saveUserProfile({
    ...atual,
    name: String(dados.nome || atual.name || ''),
    company: String(dados.empresaPerfil || atual.company || ''),
    role: String(dados.cargo || atual.role || ''),
    photoUrl: String(dados.fotoUrl || atual.photoUrl || ''),
    email: usuario.email || atual.email || '',
  });
}

export default function UserProfile({ onClose }: { onClose?: () => void }) {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isConsultor: ehConsultor, isAdmin } = useUserAccess();

  /**
   * Quem é DONO de um site de consultor vê a tela completa: foto do consultor e
   * da IA, logo, texto abaixo da logo e o nome do IA.
   *
   * O admin também é dono do site dele (o Israel é `tipoUsuario: 'admin'` com
   * `consultorId: 'israel'`), e era justamente por não ser 'consultor' que a
   * tela dele saía diferente da da Mariana: sem logo, sem slogan e sem o aviso
   * do nome do IA, escondidos atrás de um `isConsultor` que nunca era verdade
   * para ele. Uma tela só para os dois.
   */
  const isConsultor = ehConsultor || isAdmin;
  const [profile, setProfile] = useState<UserProfileData>(getUserProfile());
  const [saved, setSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>(profile.photoUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const current = getUserProfile();
      const usuario = auth.currentUser;
      if (!usuario) return;
      try {
        const snapshot = await getDoc(doc(db, 'users', usuario.uid));
        const dados = snapshot.data() || {};
        const perfilJaSincronizado = jaSincronizou(localStorage, usuario.uid);
        const marca = isConsultor ? consultor.branding : undefined;
        const atualizado: UserProfileData = {
          ...current,
          name: String((perfilJaSincronizado ? dados.nome : current.name) || dados.nome || usuario.displayName || consultor.mentorNome || marca?.nome || usuario.email?.split('@')[0] || ''),
          email: usuario.email || current.email,
          company: String((perfilJaSincronizado ? dados.empresaPerfil : current.company) || dados.empresaPerfil || marca?.nome || ''),
          role: String((perfilJaSincronizado ? dados.cargo : current.role) || dados.cargo || ''),
          photoUrl: String((perfilJaSincronizado ? dados.fotoUrl : current.photoUrl) || dados.fotoUrl || usuario.photoURL || marca?.fotoUrl || ''),
          companySlogan: String(marca?.slogan || current.companySlogan || ''),
          companyLogoUrl: String(marca?.logoUrl || current.companyLogoUrl || ''),
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
    // O uid entra nas dependências para a tela recarregar o perfil quando quem está
    // logado muda — sem isso, trocar de conta na mesma aba deixava o perfil anterior
    // no formulário.
  }, [consultor, isConsultor, auth.currentUser?.uid]);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadBrandingImage(file, 'logo');
      setProfile(prev => ({ ...prev, companyLogoUrl: url }));
      setSaved(false);
    } catch (erro: any) {
      alert(erro?.message || 'Não foi possível enviar a logo.');
    } finally {
      setUploadingLogo(false);
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
      if (isConsultor) {
        await setDoc(doc(db, 'consultores', consultorId), {
          nome: atualizado.name.trim(),
          // O IA Consultor se chama pelo PRIMEIRO nome do consultor, e só isso.
          // Gravava o nome completo, e o IA virava "Israel Cavalcanti de Souza".
          mentorNome: primeiroNome(atualizado.name),
          branding: {
            ...consultor.branding,
            nome: atualizado.company.trim() || atualizado.name.trim(),
            slogan: atualizado.companySlogan?.trim() || '',
            logoUrl: atualizado.companyLogoUrl?.trim() || '',
            fotoUrl,
          },
          'onboarding.marca': true,
        }, { merge: true });
      }
      await updateProfile(usuario, { displayName: atualizado.name.trim(), photoURL: fotoUrl || null });

      // A cópia local e o "já sincronizou" ANTES do refresh(), de propósito.
      //
      // refresh() muda `consultor` no contexto, e o efeito lá em cima depende de
      // `consultor` — ele dispara de novo assim que o contexto atualiza. Se essa
      // disparada acontecesse com a cópia local AINDA desatualizada (porque
      // saveUserProfile/marcarSincronizado só rodariam depois), o efeito lia
      // `current.photoUrl`/`current.companyLogoUrl` do localStorage VELHO e
      // reescrevia o perfil na tela com a foto e a logo de ANTES do upload — a
      // gravação no Firestore tinha ido certa, mas a tela voltava a mostrar a
      // versão antiga, parecendo que "não salvou". Gravando a cópia local
      // primeiro, o efeito relê os mesmos dados novos, e não pisa em nada.
      saveUserProfile(atualizado);
      marcarSincronizado(localStorage, usuario.uid);
      setProfile(atualizado);
      setPhotoPreview(fotoUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (isConsultor) await refresh();
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
            <p className="text-xs text-gray-500">{isConsultor ? 'Foto, dados da empresa e IA Consultor são atualizados por aqui.' : 'Seus dados aparecem automaticamente nos projetos e relatórios.'}</p>
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
            {uploadingPhoto ? 'Enviando foto...' : photoPreview ? (isConsultor ? 'Trocar foto do consultor e da IA' : 'Trocar foto do perfil') : (isConsultor ? 'Enviar foto do consultor e da IA' : 'Fazer upload da foto')}
          </button>
          <p className="text-xs text-blue-500 mt-2">{isConsultor ? 'A mesma foto aparece no menu e no IA Consultor.' : 'Máximo 2MB — JPG ou PNG'}</p>
        </div>
      </div>

      {/* Dados pessoais e, para o consultor, identidade da empresa. */}
      <div className="space-y-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-gray-50 pb-2">
          <User size={16} />
          <span className="text-xs uppercase tracking-wider">{isConsultor ? 'Dados do consultor e da empresa' : 'Dados pessoais'}</span>
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
          {/* O consultor precisa saber daqui que o IA vai se chamar assim — o nome
              do IA não é um campo separado, é o primeiro nome dele. */}
          {isConsultor && (
            <p className="text-xs text-gray-500 mt-1.5">
              O seu <strong>IA Consultor</strong> vai se chamar{' '}
              <strong className="text-blue-700">{primeiroNome(profile.name) || 'o seu primeiro nome'}</strong>
              {' '}— é sempre o seu primeiro nome.
            </p>
          )}
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
            {isConsultor ? 'Nome da empresa / consultoria' : 'Empresa / Organização'} <span className="text-gray-400">(opcional)</span>
          </label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              value={profile.company}
              onChange={e => handleChange('company', e.target.value)}
              placeholder={isConsultor ? 'Nome da sua empresa ou consultoria' : 'Nome da sua empresa'}
              className="w-full pl-9 pr-3 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
        </div>

        {isConsultor && (
          <>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Logo da empresa <span className="text-gray-400">(opcional)</span></label>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="h-12 w-20 shrink-0 rounded-lg bg-white border border-gray-200 grid place-items-center overflow-hidden">
                  {profile.companyLogoUrl ? <img src={profile.companyLogoUrl} alt="Logo da empresa" className="max-h-full max-w-full object-contain p-1" /> : <Building2 size={18} className="text-gray-300" />}
                </div>
                <div>
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                    {uploadingLogo ? 'Enviando logo...' : profile.companyLogoUrl ? 'Trocar logo' : 'Enviar logo'}
                  </button>
                  <p className="mt-1 text-[11px] text-gray-400">PNG ou JPG. Ela aparece no cabeçalho da plataforma.</p>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Texto abaixo da logo <span className="text-gray-400">(opcional)</span></label>
              <input
                type="text"
                value={profile.companySlogan || ''}
                onChange={e => handleChange('companySlogan', e.target.value)}
                placeholder="Ex.: Educação pelo Trabalho"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
              />
            </div>
          </>
        )}

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
          {isConsultor ? 'Este é o único lugar para atualizar sua foto e os dados da empresa.' : 'Seus dados ficam salvos localmente e são usados nos projetos e relatórios.'}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || uploadingPhoto || uploadingLogo}
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
