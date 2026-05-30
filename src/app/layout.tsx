import type { Metadata } from "next";
import { Cormorant_Garamond, Lato } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clínica Débora | Estética & Bem-Estar",
  description:
    "Sua clínica de estética em São Paulo. Tratamentos faciais, corporais, SPA e bem-estar com profissionais especializadas. Agende sua consulta.",
  keywords: "clínica estética, tratamento facial, massagem, spa, bem-estar, limpeza de pele",
  openGraph: {
    title: "Clínica Débora | Estética & Bem-Estar",
    description: "Sua beleza, nossa arte. Tratamentos premium em ambiente acolhedor.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${lato.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
