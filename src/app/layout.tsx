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
  title: "Clínica Débora Silva",
  description:
    "Clínica de estética em São Paulo para mulheres e homens. Limpeza de pele, drenagem linfática, massagem relaxante. Promoção de inauguração. Agende sua consulta.",
  keywords: "clínica de estética, limpeza de pele, drenagem linfática, massagem relaxante, bem-estar, Av. Paulista",
  openGraph: {
    title: "Clínica Débora Silva",
    description: "Sua beleza, nossa arte. Estética e bem-estar para mulheres e homens.",
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
