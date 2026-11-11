"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  MonitorPlay,
  FileText,
  Users,
  MessageCircle,
  Mail,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  LayoutDashboard,
  Search,
  Check,
  Lock // Ícone adicionado aqui
} from "lucide-react";

export default function LandingPage() {
  const [ano, setAno] = useState("2026");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    nome: "",
    cargo: "",
    municipio: "",
    whatsapp: "",
  });

  // CONTATOS COMERCIAIS
  const telefone = "5584999422487";
  const email = "decipeixoto@gmail.com";
  const mensagemWhatsAppPadrao = encodeURIComponent("Olá! Tenho interesse em conhecer o LegisDocs e gostaria de agendar uma demonstração.");
  const linkWhatsAppPadrao = `https://wa.me/${telefone}?text=${mensagemWhatsAppPadrao}`;

  useEffect(() => {
    setAno(new Date().getFullYear().toString());
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = `Olá, meu nome é ${formData.nome}, sou ${formData.cargo} em ${formData.municipio}. Gostaria de agendar uma demonstração do LegisDocs. Meu WhatsApp é ${formData.whatsapp}.`;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      pergunta: "Como funciona a contratação por um órgão público?",
      resposta: "O LegisDocs fornece todas as certidões e documentações necessárias para que a sua Câmara conduza o processo de contratação (Dispensa ou Inexigibilidade) conforme a legislação vigente."
    },
    {
      pergunta: "Precisamos comprar equipamentos ou instalar algo?",
      resposta: "Não! O LegisDocs funciona 100% na nuvem. Os vereadores podem usar seus próprios celulares ou tablets, e a Câmara só precisa de um computador com internet e um telão/TV para projetar o painel."
    },
    {
      pergunta: "Quanto tempo leva a implantação?",
      resposta: "A implantação é rápida (cerca de 15 dias). Nós cuidamos do cadastro de usuários, gabinetes, comissões e modelos de pautas para que o sistema fique pronto para o primeiro uso."
    },
    {
      pergunta: "E se os vereadores tiverem dificuldade com tecnologia?",
      resposta: "A interface foi pensada para ser extremamente simples. Votar exige apenas um toque na tela. Além disso, fornecemos treinamento completo para todos os servidores e parlamentares."
    },
    {
      pergunta: "Os dados da Câmara ficam seguros?",
      resposta: "Sim. Os dados ficam em servidores em nuvem de alta segurança, com backups automáticos, criptografia e controle de acesso rigoroso, em total conformidade com a LGPD."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200 pb-20 md:pb-0">
      
      {/* NAVBAR */}
      <nav aria-label="Menu principal" className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">LegisDocs</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/login" className="text-slate-600 font-bold hover:text-blue-600 transition-colors">
              Acesso Restrito
            </Link>
            <a href="#contato" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg hidden md:block">
              Falar com Consultor
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold mb-6 uppercase tracking-wider">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              A Câmara Municipal 100% Digital
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.15] tracking-tight mb-6">
              Sessões sem papel, votações em tempo real e atas prontas em minutos.
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              O LegisDocs centraliza pautas, matérias, votações e atas da sua Câmara em uma única plataforma, com mais eficiência e menos trabalho para a equipe.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4">
              <a href="#contato" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 text-lg">
                Agendar demonstração gratuita
              </a>
              <a href={linkWhatsAppPadrao} target="_blank" rel="noopener noreferrer" className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg">
                Falar com consultor
              </a>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Sem compromisso</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Demonstração de 30 min</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Treinamento incluso</span>
            </div>
          </div>

          {/* SIMULADOR DO PAINEL DE VOTAÇÃO */}
          <div className="flex-1 w-full relative max-w-xl mx-auto mt-8 lg:mt-0">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden relative z-10 text-white flex flex-col">
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="text-blue-500 w-5 h-5" />
                  <span className="font-bold text-sm">Plenário ao Vivo</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> VOTAÇÃO ABERTA
                </div>
              </div>
              <div className="p-6 text-center">
                <span className="inline-block bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1 rounded mb-3">PROJETO DE LEI</span>
                <h3 className="text-xl font-bold mb-6">Nº 045/2026 - Programa Municipal de Iluminação Pública</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-600/20 border border-green-500/30 p-3 rounded-xl flex flex-col">
                    <span className="text-xs text-green-400 font-bold mb-1">SIM</span>
                    <span className="text-3xl font-black text-green-500">12</span>
                  </div>
                  <div className="bg-red-600/20 border border-red-500/30 p-3 rounded-xl flex flex-col">
                    <span className="text-xs text-red-400 font-bold mb-1">NÃO</span>
                    <span className="text-3xl font-black text-red-500">02</span>
                  </div>
                  <div className="bg-slate-600/20 border border-slate-500/30 p-3 rounded-xl flex flex-col">
                    <span className="text-xs text-slate-400 font-bold mb-1">ABST.</span>
                    <span className="text-3xl font-black text-slate-400">00</span>
                  </div>
                </div>
                
                <div className="bg-blue-600 text-white font-black py-3 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50">
                  <Check className="w-6 h-6" /> MATÉRIA APROVADA
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ANTES E DEPOIS (PROBLEMA) */}
        <section className="py-20 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-4">Sua Câmara ainda perde horas com papel e retrabalho?</h2>
              <p className="text-slate-600 text-lg">Veja o que muda no dia a dia da Secretaria, da Presidência e dos gabinetes quando o processo legislativo fica digital.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* SEM LEGISDOCS */}
              <div className="bg-red-50/50 border border-red-100 p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
                  <h3 className="text-xl font-bold text-slate-900">Sem o LegisDocs</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-slate-700"><XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" /> Controle manual em planilhas ou cadernos.</li>
                  <li className="flex items-start gap-3 text-slate-700"><XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" /> Horas gastas digitando e revisando atas.</li>
                  <li className="flex items-start gap-3 text-slate-700"><XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" /> Votação confusa com levantamento de mãos ou chamada.</li>
                  <li className="flex items-start gap-3 text-slate-700"><XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" /> Dificuldade para cidadãos acompanharem os projetos.</li>
                </ul>
              </div>

              {/* COM LEGISDOCS */}
              <div className="bg-green-50/50 border border-green-200 p-8 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">NOVO PADRÃO</div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
                  <h3 className="text-xl font-bold text-slate-900">Com o LegisDocs</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-slate-800 font-medium"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> Pautas geradas em segundos, sem margem para erros.</li>
                  <li className="flex items-start gap-3 text-slate-800 font-medium"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> Atas pré-preenchidas automaticamente ao fim da sessão.</li>
                  <li className="flex items-start gap-3 text-slate-800 font-medium"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> Votação eletrônica transparente com resultado no telão.</li>
                  <li className="flex items-start gap-3 text-slate-800 font-medium"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> Portal público para fácil consulta da população.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* RECURSOS */}
        <section id="recursos" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-4">Tudo o que a Câmara e os vereadores precisam, em um só lugar</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1">
                  <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4"><MonitorPlay className="w-6 h-6 text-blue-600" /></div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Painel Eletrônico ao Vivo</h3>
                  <p className="text-slate-600">Projete a pauta e o cronômetro no telão. Os vereadores registram o voto de forma nominal pelo celular e o resultado aparece em tempo real para o público.</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4"><FileText className="w-6 h-6 text-indigo-600" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Atas e Pautas Dinâmicas</h3>
                <p className="text-slate-600">Pautas estruturadas em cliques. Ao encerrar a sessão, a ata é pré-compilada com todas as presenças e resultados.</p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4"><Users className="w-6 h-6 text-green-600" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Gestão de Gabinetes</h3>
                <p className="text-slate-600">Assessores protocolam projetos de lei e indicações direto no sistema, acabando com a impressão e o leva-e-traz de papel.</p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-amber-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4"><LayoutDashboard className="w-6 h-6 text-amber-600" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Tramitação Rastreável</h3>
                <p className="text-slate-600">Acompanhe cada matéria, do protocolo até a votação final, garantindo cumprimento de prazos legislativos.</p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-teal-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4"><Search className="w-6 h-6 text-teal-600" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Transparência Pública</h3>
                <p className="text-slate-600">Votações, projetos e atas publicados automaticamente para o cidadão consultar, garantindo conformidade legal.</p>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA (4 PASSOS) */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-black mb-4">Da demonstração à primeira sessão digital em 4 passos</h2>
            <p className="text-slate-400 text-lg mb-16 max-w-2xl mx-auto">Cuidamos de toda a implantação. Sua equipe só precisa participar do treinamento.</p>
            
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "1", title: "Demonstração Gratuita", desc: "Reunião de 30 min para mostrar o sistema aplicado à sua Câmara." },
                { step: "2", title: "Proposta sob medida", desc: "Enviamos o orçamento e a documentação para a contratação." },
                { step: "3", title: "Implantação Rápida", desc: "Configuramos o sistema, gabinetes e vereadores para você." },
                { step: "4", title: "Treinamento e Suporte", desc: "Ensinamos sua equipe a usar a plataforma com segurança." }
              ].map((s, i) => (
                <div key={i} className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-black mb-4 relative z-10 border-4 border-slate-900 shadow-xl">{s.step}</div>
                  <h4 className="text-xl font-bold mb-2">{s.title}</h4>
                  <p className="text-slate-400 text-sm">{s.desc}</p>
                  {i < 3 && <div className="hidden md:block absolute top-8 left-[60%] w-full h-[2px] bg-slate-700 -z-0"></div>}
                </div>
              ))}
            </div>
            
            <div className="mt-16">
              <a href="#contato" className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-4 rounded-xl hover:bg-slate-100 transition-colors">
                Começar pelo passo 1 <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        {/* RESULTADOS E DEPOIMENTOS */}
        <section className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900 mb-16">Mais eficiência, organização e agilidade desde a primeira sessão</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 text-center">
              <div><p className="text-4xl lg:text-5xl font-black text-blue-600 mb-2">até 80%</p><p className="text-sm font-bold text-slate-600">mais rapidez para gerar atas</p></div>
              <div><p className="text-4xl lg:text-5xl font-black text-blue-600 mb-2">{"<"} 1 min</p><p className="text-sm font-bold text-slate-600">para apurar os votos no plenário</p></div>
              <div><p className="text-4xl lg:text-5xl font-black text-blue-600 mb-2">0 papel</p><p className="text-sm font-bold text-slate-600">impresso para tramitar matérias</p></div>
              <div><p className="text-4xl lg:text-5xl font-black text-blue-600 mb-2">15 dias</p><p className="text-sm font-bold text-slate-600">prazo médio de implantação total</p></div>
            </div>

            <div className="text-center mb-12"><h3 className="text-2xl font-bold text-slate-800">Quem usa, não volta para o papel</h3></div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { nome: "Roberta Almeida", cargo: "Presidente da Câmara", texto: "As sessões fluem muito mais rápidas. A votação no painel acabou com as dúvidas na contagem dos votos e deu um ar profissional ao legislativo." },
                { nome: "Fernanda Lima", cargo: "Secretária Legislativa", texto: "Fazer a ata era a tarefa mais difícil. Hoje ela sai praticamente pronta ao final da sessão. Mudou a vida da Secretaria!" },
                { nome: "Marcos Vinicius", cargo: "Vereador", texto: "Meu gabinete protocola as indicações pelo celular e acompanha cada etapa. É muito simples, até quem não tem familiaridade com tecnologia consegue usar." }
              ].map((d, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-8 rounded-2xl shadow-sm relative">
                  <div className="flex gap-1 text-amber-400 mb-4"><Star className="fill-current w-5 h-5"/><Star className="fill-current w-5 h-5"/><Star className="fill-current w-5 h-5"/><Star className="fill-current w-5 h-5"/><Star className="fill-current w-5 h-5"/></div>
                  <p className="text-slate-700 italic mb-6">"{d.texto}"</p>
                  <div>
                    <p className="font-bold text-slate-900">{d.nome}</p>
                    <p className="text-sm text-slate-500">{d.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ & FORM (CONTATO) */}
        <section id="contato" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              
              {/* FAQ */}
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">Tudo o que você precisa saber antes de contratar</h2>
                <p className="text-slate-600 mb-8">Não encontrou sua resposta? Fale com nosso consultor no WhatsApp.</p>
                <div className="space-y-4">
                  {faqs.map((faq, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button onClick={() => toggleFaq(i)} className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-slate-800 hover:bg-slate-50">
                        {faq.pergunta}
                        {openFaq === i ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </button>
                      {openFaq === i && <div className="px-6 pb-4 pt-1 text-slate-600 text-sm leading-relaxed">{faq.resposta}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* FORMULÁRIO */}
              <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Solicite sua demonstração</h3>
                <p className="text-slate-600 text-sm mb-8">Preencha o formulário rápido e te direcionaremos para o WhatsApp do nosso especialista.</p>
                
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome completo</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo</label>
                    <select required value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500">
                      <option value="">Selecione seu cargo...</option>
                      <option value="Presidente">Presidente</option>
                      <option value="Vereador(a)">Vereador(a)</option>
                      <option value="Secretário(a) Legislativo">Secretário(a) Legislativo</option>
                      <option value="Assessor(a) / T.I.">Assessor(a) / Analista de T.I.</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Município / UF</label>
                      <input required type="text" value={formData.municipio} onChange={e => setFormData({...formData, municipio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500" placeholder="Ex: Natal/RN" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                      <input required type="tel" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] mt-4">
                    Quero minha demonstração gratuita
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-4 flex items-center justify-center gap-1"><Lock className="w-3 h-3"/> Seus dados estão seguros. Não enviamos spam.</p>
                </form>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-12 text-slate-400 border-t border-slate-800 pb-28 md:pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2 font-bold text-white text-xl">
              <ShieldCheck className="w-6 h-6 text-blue-500" /> LegisDocs
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6 text-sm font-semibold">
              <a href={linkWhatsAppPadrao} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> (84) 9 9942-2487
              </a>
              <a href={`mailto:${email}`} className="hover:text-white transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" /> {email}
              </a>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center">
            <p className="text-sm">Desenvolvido por <strong className="text-white">Inova Soluções</strong>. © {ano} - Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP (DESKTOP ONLY) */}
      <a href={linkWhatsAppPadrao} target="_blank" rel="noopener noreferrer" className="hidden md:flex fixed bottom-6 right-6 z-[100] bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 items-center justify-center">
        <MessageCircle className="w-7 h-7" />
      </a>

      {/* BOTTOM BAR (MOBILE ONLY) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 z-50 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <a href="#contato" className="flex-1 bg-blue-600 text-white text-center font-bold py-3 rounded-xl text-sm">
          Agendar Demo
        </a>
        <a href={linkWhatsAppPadrao} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-500 text-white flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
      </div>

    </div>
  );
}