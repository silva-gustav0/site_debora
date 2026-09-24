import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar · Painel Débora Silva",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="panel-root min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="panel-sidebar hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(232,200,130,.35), transparent 65%)" }}
        />
        <div className="flex items-center gap-3 relative">
          <span className="w-11 h-11 rounded-full flex items-center justify-center p-display text-2xl text-[#29201A]" style={{ background: "linear-gradient(135deg,#F3DDA6,#C9973A)" }}>D</span>
          <span className="p-display text-2xl text-white">Débora Silva</span>
        </div>
        <div className="relative">
          <p className="p-eyebrow text-[#E8C882] mb-4">Gestão da clínica</p>
          <h1 className="p-display text-6xl font-light text-white leading-[1.02]">
            Agenda, clientes <br />e finanças em <em className="text-[#E8C882]">um só lugar</em>.
          </h1>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-white/70 max-w-md">
            {["Agenda com pedidos do site", "Prontuário e fotos", "Pacotes e estoque", "Financeiro e relatórios"].map((t) => (
              <li key={t} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#E8C882]" />{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40 relative">Acesso restrito à equipe.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm p-rise">
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/images/clinica/logo.png" alt="Clínica Débora Silva" width={1052} height={577} priority className="h-20 w-auto" />
          </div>
          <p className="p-eyebrow mb-2">Bem-vinda de volta</p>
          <h2 className="p-display text-5xl font-light text-[#2B221B] mb-2">Entrar</h2>
          <p className="text-sm text-[#857566] mb-8">Use o e-mail e a senha cadastrados pela clínica.</p>
          <LoginForm />
          <p className="text-center mt-8">
            <Link href="/" className="text-xs text-[#857566] hover:text-[#6B4A10]">← Voltar ao site</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
