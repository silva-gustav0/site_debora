import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { Card, PageHeader } from "@/components/painel/ui";

export const metadata = { title: "App da equipe" };

const APK = "/app/debora-equipe.apk";
const STEPS = [
  "No celular Android, toque em “Baixar o app” (ou aponte a câmera para o QR code).",
  "Abra o arquivo baixado. Se o celular pedir, permita instalar apps desta fonte (Chrome ou Arquivos).",
  "Toque em Instalar e abra o app “Débora Equipe”.",
  "Entre com o mesmo e-mail e senha do painel. Pronto: ele fica logado.",
];

/** Página de download do app Android da equipe (o painel em tela cheia, sempre atualizado). */
export default function AppPage() {
  return (
    <>
      <PageHeader eyebrow="Celular" title="App da equipe" subtitle="O painel completo no celular, em tela cheia e sempre atualizado — sem precisar reinstalar a cada mudança." />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
        <Card title="Instalar no Android" eyebrow="Versão 1.0.1 · 1,3 MB">
          <ol className="flex flex-col gap-3 mb-5">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#4A3C30]">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#82590F" }}>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <a href={APK} download className="p-btn"><Download size={15} /> Baixar o app</a>
          <p className="flex items-start gap-2 text-xs text-[#857566] mt-5">
            <ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-[#2E7D4F]" />
            O app é assinado pela clínica e só abre o painel. Precisa do Google Chrome instalado (já vem na maioria dos Android).
          </p>
          <p className="flex items-start gap-2 text-xs text-[#857566] mt-2">
            <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
            iPhone: abra o painel no Safari, toque em Compartilhar → “Adicionar à Tela de Início”.
          </p>
        </Card>
        <Card title="Pelo computador" eyebrow="Aponte a câmera do celular" className="hidden sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/app/qr-download.svg" alt="QR code para baixar o app" width={200} height={200} className="w-[200px] h-[200px]" />
        </Card>
      </div>
    </>
  );
}
