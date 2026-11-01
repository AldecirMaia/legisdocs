
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://SEU-DOMINIO.com.br"),

  title: {
    default: "LegisDocs | Sistema de Gestão Legislativa",
    template: "%s | LegisDocs",
  },

  description:
    "Modernize sua Câmara Municipal com o LegisDocs. Sistema de gestão legislativa com atas digitais, pautas, votações eletrônicas e gestão de gabinetes. Solicite uma demonstração.",

  keywords: [
    "LegisDocs",
    "software legislativo",
    "sistema para Câmara Municipal",
    "gestão legislativa",
    "sistema de votação eletrônica",
    "ata digital",
    "gestão parlamentar",
    "processo legislativo digital",
    "modernização legislativa",
    "sistema para vereadores",
  ],

  authors: [
    {
      name: "Inova Soluções",
    },
  ],

  openGraph: {
    title: "LegisDocs | Modernize sua Câmara Municipal",
    description:
      "Digitalize processos legislativos, automatize atas e organize votações com o LegisDocs.",
    siteName: "LegisDocs",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/hero-mockup.png",
        width: 1200,
        height: 630,
        alt: "LegisDocs - Sistema de Gestão Legislativa",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
