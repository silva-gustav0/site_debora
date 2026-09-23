import type { Metadata } from "next";
import { logout } from "../auth-actions";

export const metadata: Metadata = {
  title: "Sem acesso · Painel Talissa",
  robots: { index: false, follow: false },
};

export default function NoAccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FFF5F7" }}>
      <div className="p-card p-8 max-w-sm text-center">
        <h1 className="text-3xl font-light text-rose-900 mb-2">Acesso restrito</h1>
        <p className="text-sm text-text-secondary mb-6">
          Sua conta ainda não foi liberada para o painel. Peça à responsável pela clínica para adicioná-la à equipe.
        </p>
        <form action={logout}>
          <button className="p-btn">Sair</button>
        </form>
      </div>
    </main>
  );
}
