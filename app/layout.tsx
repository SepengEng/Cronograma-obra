import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Cronograma de Visitas — Obra",
  description: "Acompanhe visitas e vistorias agendadas para a obra",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full font-[family-name:var(--font-geist)]">{children}</body>
    </html>
  );
}
