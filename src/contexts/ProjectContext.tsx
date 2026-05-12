import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Project } from '../types';

interface ProjectContextType {
  projetoAtivo: Project | null;
  setProjetoAtivo: (projeto: Project | null) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projetoAtivo, setProjetoAtivoState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura o projeto ativo do localStorage ao iniciar
  useEffect(() => {
    const restaurar = async () => {
      try {
        const projectId = localStorage.getItem('projetoAtivoId');
        const userId = auth.currentUser?.uid;
        if (projectId && userId) {
          const docRef = doc(db, 'projects', projectId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().ownerUid === userId) {
            setProjetoAtivoState({ id: docSnap.id, ...docSnap.data() } as Project);
          } else {
            // Projeto não existe mais ou não pertence ao usuário — limpa
            localStorage.removeItem('projetoAtivoId');
          }
        }
      } catch (error) {
        console.error('Erro ao restaurar projeto ativo:', error);
        localStorage.removeItem('projetoAtivoId');
      } finally {
        setLoading(false);
      }
    };
    restaurar();
  }, []);

  const setProjetoAtivo = (projeto: Project | null) => {
    setProjetoAtivoState(projeto);
    if (projeto) {
      localStorage.setItem('projetoAtivoId', projeto.id);
    } else {
      localStorage.removeItem('projetoAtivoId');
    }
  };

  return (
    <ProjectContext.Provider value={{ projetoAtivo, setProjetoAtivo, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject deve ser usado dentro de ProjectProvider');
  }
  return context;
};
