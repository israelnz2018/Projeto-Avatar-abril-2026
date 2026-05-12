import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Mic,
  Square,
  Trash2,
  Upload,
  FileText,
  Volume2,
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getToolContext,
  saveToolContext,
  deleteToolContext,
  uploadToolAudio,
  deleteToolAudio,
  MentorToolContext,
  ResponseMode
} from '../../services/mentorContextService';

interface MentorContextEditorProps {
  toolId: string;
  toolName: string;
  toolPhase?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function MentorContextEditor({
  toolId,
  toolName,
  toolPhase,
  onClose,
  onSaved
}: MentorContextEditorProps) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<MentorToolContext | null>(null);

  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<ResponseMode>('text');
  const [responseText, setResponseText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioPath, setAudioPath] = useState<string>('');
  const [newAudioBlob, setNewAudioBlob] = useState<Blob | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Gravação
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Carrega dados existentes
  useEffect(() => {
    getToolContext(toolId).then(ctx => {
      if (ctx) {
        setExisting(ctx);
        setQuestion(ctx.question || '');
        setMode(ctx.responseMode || 'text');
        setResponseText(ctx.responseText || '');
        setAudioUrl(ctx.audioUrl || '');
        setAudioPath(ctx.audioPath || '');
      }
      setLoading(false);
    });
  }, [toolId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const previewUrl = newAudioBlob ? URL.createObjectURL(newAudioBlob) : audioUrl;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setNewAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setRecordTime(0);
      recordIntervalRef.current = window.setInterval(() => {
        setRecordTime(t => t + 1);
      }, 1000);
    } catch (err) {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      alert('Selecione um arquivo de áudio (MP3, WAV, M4A, etc.)');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('Arquivo muito grande (máximo 30 MB).');
      return;
    }
    setNewAudioBlob(file);
  };

  const handleDiscardNewAudio = () => {
    setNewAudioBlob(null);
  };

  const handleDeleteCurrentAudio = async () => {
    if (!audioPath) return;
    if (!confirm('Apagar o áudio atual? Essa ação não pode ser desfeita.')) return;
    
    setIsDeleting(true);
    try {
      await deleteToolAudio(audioPath);
      setAudioUrl('');
      setAudioPath('');
      // Atualiza no Firestore mantendo o resto
      await saveToolContext({
        toolId,
        question,
        responseMode: mode,
        responseText,
        audioUrl: '',
        audioPath: ''
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (mode === 'text' && !responseText.trim()) {
      alert('Escreva uma resposta antes de salvar (ou selecione "Nenhum").');
      return;
    }
    if (mode === 'audio' && !newAudioBlob && !audioUrl) {
      alert('Grave ou envie um áudio antes de salvar (ou selecione "Nenhum").');
      return;
    }

    setIsSaving(true);
    try {
      let finalAudioUrl = audioUrl;
      let finalAudioPath = audioPath;

      // Upload novo áudio se existir
      if (mode === 'audio' && newAudioBlob) {
        if (audioPath) {
          await deleteToolAudio(audioPath).catch(() => {});
        }
        const uploaded = await uploadToolAudio(toolId, newAudioBlob);
        if (!uploaded) {
          alert('Erro ao fazer upload do áudio. Tente novamente.');
          setIsSaving(false);
          return;
        }
        finalAudioUrl = uploaded.url;
        finalAudioPath = uploaded.path;
        setAudioUrl(finalAudioUrl);
        setAudioPath(finalAudioPath);
        setNewAudioBlob(null);
      }

      // Se mudou de áudio pra texto ou nenhum, deleta o áudio antigo
      if (mode !== 'audio' && audioPath) {
        await deleteToolAudio(audioPath).catch(() => {});
        finalAudioUrl = '';
        finalAudioPath = '';
        setAudioUrl('');
        setAudioPath('');
      }

      const ctx: MentorToolContext = {
        toolId,
        question: question.trim(),
        responseMode: mode,
        responseText: mode === 'text' ? responseText.trim() : '',
        audioUrl: mode === 'audio' ? finalAudioUrl : '',
        audioPath: mode === 'audio' ? finalAudioPath : ''
      };

      const ok = await saveToolContext(ctx);
      if (ok) {
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2000);
        if (onSaved) onSaved();
      } else {
        alert('Erro ao salvar. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const ok = await deleteToolContext(toolId);
      if (ok) {
        if (onSaved) onSaved();
        onClose();
      } else {
        alert('Erro ao apagar. Tente novamente.');
      }
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const hasAnyContent = existing && (
    existing.question?.trim() ||
    existing.responseText?.trim() ||
    existing.audioUrl
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Volume2 size={18} />
            </div>
            <div>
              {toolPhase && (
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  {toolPhase} · Mentor LBW
                </div>
              )}
              <h3 className="text-base font-black text-gray-800 uppercase tracking-tight">
                {toolName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer border-none bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : (
          <>
            <div className="p-6 space-y-6">
              {/* PERGUNTA */}
              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  ❓ Pergunta-chave (aparece em cima da sidebar)
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: O que é a técnica dos 5 Porquês?"
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Pergunta que o aluno vê no topo do Mentor LBW ao abrir essa ferramenta.
                </p>
              </div>

              {/* MODO DE RESPOSTA */}
              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  💬 Tipo de resposta
                </label>
                <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setMode('text')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none",
                      mode === 'text' ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <FileText size={12} />
                    Texto
                  </button>
                  <button
                    onClick={() => setMode('audio')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none",
                      mode === 'audio' ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Volume2 size={12} />
                    Áudio
                  </button>
                  <button
                    onClick={() => setMode('none')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-none",
                      mode === 'none' ? "bg-white text-gray-700 shadow-sm" : "bg-transparent text-gray-400 hover:text-gray-600"
                    )}
                  >
                    Nenhum
                  </button>
                </div>

                {/* Modo TEXTO */}
                {mode === 'text' && (
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Escreva aqui a resposta que o aluno verá..."
                    className="w-full h-40 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-y"
                  />
                )}

                {/* Modo ÁUDIO */}
                {mode === 'audio' && (
                  <div className="space-y-3">
                    {/* Player */}
                    {previewUrl && !isRecording && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Volume2 size={14} className="text-blue-600" />
                            <span className="text-xs font-bold text-blue-700">
                              {newAudioBlob ? 'Novo áudio (clique em Salvar pra confirmar)' : 'Áudio salvo'}
                            </span>
                          </div>
                          {newAudioBlob && (
                            <button
                              onClick={handleDiscardNewAudio}
                              className="text-[10px] text-red-600 hover:text-red-800 font-bold cursor-pointer border-none bg-transparent"
                            >
                              Descartar
                            </button>
                          )}
                          {!newAudioBlob && audioPath && (
                            <button
                              onClick={handleDeleteCurrentAudio}
                              disabled={isDeleting}
                              className="text-[10px] text-red-600 hover:text-red-800 font-bold cursor-pointer border-none bg-transparent flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 size={10} />
                              Apagar áudio
                            </button>
                          )}
                        </div>
                        <audio
                          controls
                          controlsList="nodownload noplaybackrate"
                          src={previewUrl}
                          className="w-full h-10"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                    )}

                    {/* Gravação em andamento */}
                    {isRecording && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-bold text-red-700">Gravando...</span>
                          <span className="text-sm font-mono text-red-700">{formatTime(recordTime)}</span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer border-none"
                        >
                          <Square size={12} fill="currentColor" />
                          Parar gravação
                        </button>
                      </div>
                    )}

                    {/* Botões de ação */}
                    {!isRecording && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={startRecording}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer border-none"
                        >
                          <Mic size={14} />
                          {previewUrl ? 'Gravar novo' : 'Gravar áudio'}
                        </button>
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs cursor-pointer">
                          <Upload size={14} />
                          {previewUrl ? 'Substituir por arquivo' : 'Subir arquivo MP3/WAV'}
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      🔒 O áudio é protegido: o aluno só pode ouvir, não baixar. Tamanho máximo: 30 MB.
                    </p>
                  </div>
                )}

                {/* Modo NENHUM */}
                {mode === 'none' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">
                      Nenhuma resposta será mostrada pro aluno nesta ferramenta (só o chat normal).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer com ações */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between sticky bottom-0">
              {/* Botão deletar tudo (esquerda) */}
              <div>
                {hasAnyContent && !confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs cursor-pointer border-none bg-transparent"
                  >
                    <Trash2 size={12} />
                    Apagar tudo
                  </button>
                )}
                {confirmDelete && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-600" />
                    <span className="text-xs text-red-700 font-bold">Confirmar?</span>
                    <button
                      onClick={handleDeleteAll}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold text-xs cursor-pointer border-none disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Sim, apagar'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-bold text-xs cursor-pointer border-none"
                    >
                      Não
                    </button>
                  </div>
                )}
              </div>

              {/* Botões salvar/cancelar (direita) */}
              <div className="flex items-center gap-2">
                {savedFeedback && (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                    <CheckCircle2 size={14} />
                    Salvo!
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isRecording}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer border-none disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
