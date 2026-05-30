// Permite import de arquivos .md como string crua via Vite (?raw)
declare module '*.md?raw' {
  const content: string;
  export default content;
}
