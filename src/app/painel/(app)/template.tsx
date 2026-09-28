/** Remonta a cada troca de tela para animar a entrada do conteúdo. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
