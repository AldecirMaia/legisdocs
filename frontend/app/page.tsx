
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  MonitorPlay,
  FileText,
  Users,
  ShieldCheck,
  PlayCircle,
  BarChart,
  Phone,
  Mail,
  MessageCircle,
  Zap,
  Lock,
  Clock,
} from "lucide-react";

export default function LandingPage() {
  const [ano, setAno] = useState("2026");

  // CONTATOS COMERCIAIS
  const telefone = "5584999422487";
  const email = "decipeixoto@gmail.com";

  const mensagemWhatsApp = encodeURIComponent(
    "Olá! Tenho interesse em conhecer o LegisDocs e gostaria de agendar uma demonstração."
  );

  const linkWhatsApp = `https://wa.me/${telefone}?text=${mensagemWhatsApp}`;

  useEffect(() => {
    setAno(new Date().getFullYear().toString());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">

      {/* NAVBAR */}
      <nav
        aria-label="Menu principal"
        className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>

            <span className="text-2xl font-black text-slate-900 tracking-tight">
              LegisDocs
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">

            <Link
              href="/login"
              className="text-slate-600 font-bold hover:text-blue-600 px-2 sm:px-4 py-2 transition-colors"
            >
              Acesso Restrito
            </Link>

            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 sm:px-6 py-2 rounded-full transition-all shadow-md hover:shadow-lg hidden sm:block"
            >
              Falar com Consultor
            </a>

          </div>
        </div>
      </nav>

      <main>

        {/* HERO SECTION */}
        <section
          aria-labelledby="hero-title"
          className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12"
        >

          <div className="flex-1 text-center lg:text-left">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold mb-6">

              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>

              A Câmara Municipal 100% Digital
            </div>

            <h1
              id="hero-title"
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6"
            >
              Modernize o Legislativo.

              <br />

              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Automatize Atas e Votações.
              </span>
            </h1>

            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              O LegisDocs é um sistema de gestão legislativa desenvolvido
              para Câmaras Municipais. Substitua o papel, organize as pautas
              em segundos e conduza votações no plenário em tempo real,
              com mais transparência, produtividade e segurança.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">

              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                Agendar Demonstração

                <ArrowRight className="w-5 h-5" />
              </a>

              <a
                href="#recursos"
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg"
              >
                <PlayCircle className="w-5 h-5 text-slate-400" />

                Ver como funciona
              </a>

            </div>

            <p className="text-sm text-slate-500 mt-5">
              <CheckCircle2 className="w-4 h-4 inline mr-1 text-green-600" />
              Solicite uma demonstração e conheça a plataforma.
            </p>

          </div>

          <div className="flex-1 w-full relative">

            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-[2rem] blur-3xl -z-10"></div>

            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-2 relative overflow-hidden">

              <img
                src="/hero-mockup.jpg"
                alt="Painel de gestão legislativa do sistema LegisDocs"
                className="w-full rounded-[1.5rem] bg-slate-100 min-h-[300px] object-cover"
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 backdrop-blur-sm rounded-[1.5rem]">

                <MonitorPlay className="w-16 h-16 text-blue-600 mb-4 drop-shadow-md" />

                <p className="font-bold text-slate-800 bg-white/90 px-4 py-2 rounded-lg shadow-sm">
                  Painel do Plenário ao Vivo
                </p>

              </div>
            </div>
          </div>

        </section>

        {/* DIFERENCIAIS */}
        <section className="border-y border-slate-200 bg-white py-10">

          <div className="max-w-7xl mx-auto px-4 text-center">

            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
              Desenvolvido para atender às necessidades do Legislativo Municipal
            </p>

            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70">

              <div className="flex items-center gap-2 font-black text-xl text-slate-800">
                <ShieldCheck />
                Segurança
              </div>

              <div className="flex items-center gap-2 font-black text-xl text-slate-800">
                <BarChart />
                Transparência Pública
              </div>

              <div className="flex items-center gap-2 font-black text-xl text-slate-800">
                <FileText />
                Organização Legislativa
              </div>

            </div>
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section id="recursos" className="py-24 bg-slate-50">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-3xl mx-auto mb-16">

              <h2 className="text-3xl font-black text-slate-900 mb-4">
                Tudo o que a Câmara e os Vereadores precisam em um só lugar
              </h2>

              <p className="text-slate-600 text-lg">
                Acabe com as pilhas de papel, os erros nas atas e a lentidão
                na aprovação de projetos. O LegisDocs automatiza e organiza
                os processos legislativos.
              </p>

            </div>

            <div className="grid md:grid-cols-3 gap-8">

              {/* RECURSO 1 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">

                <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <MonitorPlay className="w-7 h-7 text-blue-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Painel Eletrônico ao Vivo
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  Conduza as votações em um painel projetado no telão
                  da Câmara. Os vereadores votam pelo tablet ou celular
                  e o resultado é apresentado em tempo real.
                </p>

              </div>

              {/* RECURSO 2 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">

                <div className="bg-indigo-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Atas e Pautas Dinâmicas
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  Gere pautas oficiais em segundos. Ao final da sessão,
                  o sistema compila as informações e os votos para
                  facilitar a elaboração da Ata.
                </p>

              </div>

              {/* RECURSO 3 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">

                <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-green-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Gestão de Gabinetes
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  Os assessores enviam projetos de lei e indicações
                  diretamente pelo sistema. A Secretaria organiza
                  e encaminha as matérias para a Ordem do Dia.
                </p>

              </div>

            </div>
          </div>
        </section>

        {/* BENEFÍCIOS COMERCIAIS */}
        <section className="py-20 bg-white">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-3xl mx-auto mb-14">

              <h2 className="text-3xl font-black text-slate-900 mb-4">
                Mais eficiência para a gestão legislativa
              </h2>

              <p className="text-lg text-slate-600">
                Tecnologia para simplificar rotinas, otimizar o trabalho
                dos servidores e modernizar o funcionamento da Câmara.
              </p>

            </div>

            <div className="grid md:grid-cols-3 gap-10">

              <div className="text-center">
                <div className="mx-auto bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Mais produtividade
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  Automatize tarefas e reduza o tempo gasto com
                  procedimentos administrativos e legislativos.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
                  <Lock className="w-8 h-8 text-green-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Mais organização
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  Centralize documentos, pautas e informações
                  legislativas em um ambiente digital organizado.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
                  <Clock className="w-8 h-8 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Mais agilidade
                </h3>

                <p className="text-slate-600 leading-relaxed">
                  Simplifique o acompanhamento das sessões e
                  a tramitação das matérias legislativas.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* CTA / CONTATO */}
        <section
          id="contato"
          aria-labelledby="contato-title"
          className="py-24 bg-blue-900 text-white relative overflow-hidden"
        >

          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">

            <h2
              id="contato-title"
              className="text-3xl md:text-5xl font-black mb-6"
            >
              Pronto para digitalizar sua Câmara Municipal?
            </h2>

            <p className="text-blue-200 text-lg mb-10 max-w-2xl mx-auto">
              Agende uma demonstração e descubra como o LegisDocs
              pode modernizar a gestão legislativa, reduzir processos
              manuais e otimizar as atividades da sua Câmara Municipal.
            </p>

            {/* BOTÕES DE CONVERSÃO */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">

              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Conversar pelo WhatsApp"
                className="bg-green-500 hover:bg-green-400 text-white font-black px-8 py-4 rounded-xl text-lg shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />

                Falar pelo WhatsApp
              </a>

              <a
                href={`mailto:${email}?subject=${encodeURIComponent("Interesse no LegisDocs")}`}
                aria-label="Enviar e-mail comercial"
                className="bg-blue-800 hover:bg-blue-700 border border-blue-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />

                Enviar um E-mail
              </a>

              <a
                href={`tel:+${telefone}`}
                aria-label="Ligar para o contato comercial"
                className="bg-white text-blue-900 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />

                Ligar agora
              </a>

            </div>

            {/* CONTATOS */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-5 text-sm font-semibold text-blue-200">

              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                (84) 9 9942-2487
              </a>

              <a
                href={`mailto:${email}`}
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {email}
              </a>

            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-6 text-sm font-semibold text-blue-300">

              <span className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Implantação rápida
              </span>

              <span className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Treinamento incluso
              </span>

            </div>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-12 text-slate-400 border-t border-slate-800">

        <div className="max-w-7xl mx-auto px-4">

          <div className="flex flex-col md:flex-row justify-between items-center gap-8">

            <div className="flex items-center gap-2 font-bold text-white text-xl">

              <ShieldCheck className="w-6 h-6 text-blue-500" />

              LegisDocs

            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 text-sm">

              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-400 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                (84) 9 9942-2487
              </a>

              <a
                href={`mailto:${email}`}
                className="hover:text-blue-400 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {email}
              </a>

            </div>

          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center">

            <p className="text-sm">
              Desenvolvido por{" "}
              <strong className="text-white">Inova Soluções</strong>.
              © {ano} - Todos os direitos reservados.
            </p>

          </div>

        </div>
      </footer>

      {/* BOTÃO FLUTUANTE WHATSAPP */}
      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Entre em contato pelo WhatsApp"
        title="Fale conosco pelo WhatsApp"
        className="fixed bottom-6 right-6 z-[100] bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center"
      >
        <MessageCircle className="w-7 h-7" />
      </a>

    </div>
  );
}
