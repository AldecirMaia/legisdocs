"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { 
  PlayCircle, StopCircle, MonitorPlay, CheckCircle, Users, AlertTriangle, X, Clock, 
  PlusCircle, CheckSquare, FileText, Search, Bell, ChevronDown, Menu, LogOut 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface DocPauta {
  id: string;
  type?: string;
  tipo?: string;
  numero?: number;
  protocolNum?: number;
  year: number;
  ementa: string;
  autor?: string;
  propositor?: string;
  turnoVotacao?: string;
}

export default function ControloSessao() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [documentos, setDocumentos] = useState<DocPauta[]>([]);
  const [vereadores, setVereadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicadoChamada, setClicadoChamada] = useState(false);

  const [docSelecionado, setDocSelecionado] = useState<DocPauta | null>(null);
  const [status, setStatus] = useState<"AGUARDANDO" | "ABERTA" | "ENCERRADA">("AGUARDANDO");
  const [votos, setVotos] = useState<Record<string, string>>({});
  const [totalVereadores, setTotalVereadores] = useState(0);
  const [abaAtiva, setAbaAtiva] = useState<'PAUTA' | 'PRESENCA' | 'CRONOMETRO'>('PAUTA');
  const [showModalEncerrar, setShowModalEncerrar] = useState(false);

  const [estadoSessaoGlobal, setEstadoSessaoGlobal] = useState<"SUSPENSA" | "EM_ANDAMENTO" | "ENCERRADA">("SUSPENSA");
  const [showModalEncerrarSessao, setShowModalEncerrarSessao] = useState(false);
  const [showModalSucessoAta, setShowModalSucessoAta] = useState(false);

  const [presencas, setPresencas] = useState<string[]>([]);
  const [chamadaAtiva, setChamadaAtiva] = useState(false);

  const [tempoRestante, setTempoRestante] = useState(300);
  const [timerAtivo, setTimerAtivo] = useState(false);
  const [tipoOrador, setTipoOrador] = useState<"VEREADOR" | "OUTRO">("VEREADOR");
  const [oradorSelecionado, setOradorSelecionado] = useState<string>("");
  const [nomeConvidado, setNomeConvidado] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let activeSocket: Socket | null = null;

    const iniciarControlo = async () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      try {
        const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const resDocs = await fetch(`${apiEnv}/pauta/ativa/${parsedUser.tenantId}`);
        if (resDocs.ok) {
          const text = await resDocs.text();
          if (text && text.trim() !== "") {
            const pauta = JSON.parse(text);
            if (pauta && pauta.itens) {
              const ordemDoDia = pauta.itens.filter((i: any) => i.tramitacao === 'VOTAÇÃO').map((item: any) => ({
                id: item.id, tipo: item.type, numero: item.numero, protocolNum: item.numero,
                year: item.ano || new Date().getFullYear(), autor: item.propositor, propositor: item.propositor,
                ementa: item.ementa, turnoVotacao: item.turnoVotacao, status: 'PENDENTE'
              }));
              setDocumentos(ordemDoDia);
            }
          }
        }

        const resGab = await fetch(`${apiEnv}/gabinete/list/${parsedUser.tenantId}`);
        if (resGab.ok) {
          const gabinetes = await resGab.json();
          let listaVereadores: any[] = [];
          gabinetes.forEach((g: any) => {
            const vereadoresDoGabinete = g.users?.filter((u: any) => u.role === "VEREADOR") || [];
            listaVereadores = [...listaVereadores, ...vereadoresDoGabinete];
          });
          setVereadores(listaVereadores);
          setTotalVereadores(listaVereadores.length);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }

      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      activeSocket = io(apiEnv.replace('/api', ''), { transports: ['websocket'] });

      activeSocket.on("connect", () => { activeSocket?.emit("entrarSala", { tenantId: parsedUser.tenantId }); });
      activeSocket.on("statusVotacao", (sessao) => {
        if (sessao) { setDocSelecionado(sessao.documento); setStatus(sessao.status); setVotos(sessao.votos || {}); }
      });
      activeSocket.on("votoAtualizado", (data) => setVotos(data.totalVotos));
      activeSocket.on("votacaoEncerrada", (sessaoFinal) => { setStatus("ENCERRADA"); setVotos(sessaoFinal.votos); });
      activeSocket.on("presencaConfirmada", (data) => { setPresencas(prev => [...new Set([...prev, data.vereadorId])]); });

      setSocket(activeSocket);
    };

    iniciarControlo();
    return () => { if (activeSocket) activeSocket.disconnect(); };
  }, [router]);

  const mudarEstadoSessao = (novoEstado: "SUSPENSA" | "EM_ANDAMENTO" | "ENCERRADA") => {
    if (novoEstado === "ENCERRADA") { setShowModalEncerrarSessao(true); return; }
    setEstadoSessaoGlobal(novoEstado);
    if (socket && user?.tenantId) socket.emit("atualizarEstadoSessao", { tenantId: user.tenantId, estado: novoEstado });
  };

  const confirmarEncerramentoSessao = async () => {
    setShowModalEncerrarSessao(false);
    setEstadoSessaoGlobal("ENCERRADA");
    if (socket && user?.tenantId) socket.emit("atualizarEstadoSessao", { tenantId: user.tenantId, estado: "ENCERRADA" });
    localStorage.setItem("legisdocs_presencas_sessao", JSON.stringify(presencas));
    localStorage.setItem("legisdocs_data_sessao", new Date().toISOString());
    setShowModalSucessoAta(true);
  };

  useEffect(() => {
    let intervalo: NodeJS.Timeout;
    if (timerAtivo && tempoRestante > 0) {
      intervalo = setInterval(() => {
        setTempoRestante((prev) => {
          const novoTempo = prev - 1;
          if (socket && user?.tenantId) {
            socket.emit("syncCronometro", { tenantId: user.tenantId, tempo: novoTempo, ativo: true, visivel: true });
            if (novoTempo === 60) socket.emit("alertaCronometro", { tenantId: user.tenantId, tipo: "1_MINUTO" });
            if (novoTempo === 30) socket.emit("alertaCronometro", { tenantId: user.tenantId, tipo: "30_SEGUNDOS" });
            if (novoTempo === 0) socket.emit("alertaCronometro", { tenantId: user.tenantId, tipo: "ESGOTADO" });
          }
          if (novoTempo <= 0) { setTimerAtivo(false); return 0; }
          return novoTempo;
        });
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [timerAtivo, tempoRestante, socket, user?.tenantId]);

  const formatarTempo = (segundos: number) => {
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSetTempo = (segundos: number) => {
    setTimerAtivo(false);
    setTempoRestante(segundos);
    if (socket && user?.tenantId) socket.emit("syncCronometro", { tenantId: user.tenantId, tempo: segundos, ativo: false, visivel: false });
  };

  const handleAdicionarTempo = (minutos: number) => {
    const novoTempo = tempoRestante + (minutos * 60);
    setTempoRestante(novoTempo);
    if (socket && user?.tenantId) socket.emit("syncCronometro", { tenantId: user.tenantId, tempo: novoTempo, ativo: timerAtivo, visivel: timerAtivo });
  };

  const handleToggleTimer = () => {
    const novoEstado = !timerAtivo;
    if (tempoRestante === 0 && novoEstado) return;
    setTimerAtivo(novoEstado);
    const nomeOrador = tipoOrador === "VEREADOR" ? vereadores.find(v => v.id === oradorSelecionado)?.name || "Vereador" : nomeConvidado || "Convidado";
    if (socket && user?.tenantId) socket.emit("syncCronometro", { tenantId: user.tenantId, tempo: tempoRestante, ativo: novoEstado, orador: nomeOrador, visivel: true });
  };

  const handleAbrirChamada = () => {
    if (!socket || !user) return;
    setChamadaAtiva(true);
    setPresencas([]);
    setClicadoChamada(true);
    socket.emit("abrirChamada", { tenantId: user.tenantId });
    setTimeout(() => setClicadoChamada(false), 2000);
  };

  const handleAbrirVotacao = () => {
    if (!socket || !docSelecionado) return;
    socket.emit("abrirVotacao", { tenantId: user.tenantId, documento: docSelecionado });
    setStatus("ABERTA");
    setVotos({});
  };

  const confirmarEncerramento = async () => {
    setShowModalEncerrar(false);
    if (!socket) return;
    socket.emit("encerrarVotacao", { tenantId: user.tenantId });
    setStatus("ENCERRADA");
  };

  const handleLimparPainel = () => { setDocSelecionado(null); setStatus("AGUARDANDO"); setVotos({}); };
  const handleLogout = () => { localStorage.removeItem("legisdocs_token"); localStorage.removeItem("legisdocs_user"); router.push("/"); };

  const getRegraVotacao = (tipo: string, total: number) => {
    const t = tipo?.toUpperCase() || '';
    if (t.includes('EMENDA') || t.includes('VETO') || t.includes('CASSAÇÃO')) return { tipoRegra: 'Maioria Qualificada (2/3)', minQuorum: Math.ceil(total * (2/3)) };
    if (t.includes('COMPLEMENTAR')) return { tipoRegra: 'Maioria Absoluta', minQuorum: Math.floor(total / 2) + 1 };
    return { tipoRegra: 'Maioria Simples', minQuorum: Math.floor(total / 2) + 1 }; 
  };

  const regraAtual = docSelecionado ? getRegraVotacao(docSelecionado.tipo || docSelecionado.type || '', totalVereadores) : null;
  const quorumAtingido = regraAtual ? presencas.length >= regraAtual.minQuorum : false;

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium animate-pulse">A preparar sistema...</div>;

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-800"><Menu className="w-6 h-6" /></button>
            <div className="hidden sm:flex max-w-xl items-center w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar documentos..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm outline-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-4">
            <button className="text-gray-500 hover:text-blue-600"><Bell className="w-5 h-5" /></button>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700">{user.name}</span>
                <span className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Link href="/painel" className="hover:text-blue-600">Início</Link><span>/</span><span className="font-semibold text-gray-700">Plenário ao Vivo</span></div>
                <h2 className="text-3xl font-bold text-gray-900">Controlo da Sessão</h2>
              </div>
              <Link href="/telao" target="_blank" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-sm flex items-center gap-2"><MonitorPlay className="w-4 h-4" /> Abrir Telão do Plenário</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
              
              <div className="lg:col-span-5 flex flex-col gap-4 h-[calc(100vh-13rem)]">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex gap-2 flex-shrink-0">
                  <button onClick={() => setAbaAtiva('PAUTA')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${abaAtiva === 'PAUTA' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-50'}`}>Matérias</button>
                  <button onClick={() => setAbaAtiva('PRESENCA')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${abaAtiva === 'PRESENCA' ? 'bg-green-100 text-green-800' : 'text-gray-500 hover:bg-gray-50'}`}>Quórum</button>
                  <button onClick={() => setAbaAtiva('CRONOMETRO')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${abaAtiva === 'CRONOMETRO' ? 'bg-orange-100 text-orange-800' : 'text-gray-500 hover:bg-gray-50'}`}>Tribuna</button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
                  {abaAtiva === 'PAUTA' && (
                    <>
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
                        <h2 className="font-bold text-gray-800 text-lg">Ordem do Dia</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{documentos.length} itens</span>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto space-y-3">
                        {documentos.map((doc) => (
                          <div key={doc.id} onClick={() => setDocSelecionado(doc)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${docSelecionado?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded uppercase">{doc.tipo || doc.type}</span>
                              <span className="text-xs font-bold text-gray-400">Nº {doc.numero || doc.protocolNum || 'S/N'}/{doc.year}</span>
                            </div>
                            <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{doc.ementa}</p>
                          </div>
                        ))}
                        {documentos.length === 0 && <p className="text-center text-sm text-gray-400 mt-6">Nenhuma matéria registada.</p>}
                      </div>
                    </>
                  )}

                  {abaAtiva === 'PRESENCA' && (
                    <div className="p-6 flex flex-col h-full">
                      <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2 flex-shrink-0"><Users className="w-5 h-5 text-green-600" /> Chamada de Vereadores</h2>
                      <div className="flex-1 overflow-y-auto space-y-2 mb-4 border border-gray-200 rounded-lg p-2">
                        {vereadores.map((v) => (
                          <div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="font-semibold text-sm text-gray-700">{v.name}</span>
                            {presencas.includes(v.id) ? (
                              <span className="text-[10px] bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full flex items-center gap-1"><CheckSquare className="w-3 h-3"/> PRESENTE</span>
                            ) : (
                              <span className="text-[10px] bg-gray-200 text-gray-500 font-bold px-3 py-1 rounded-full">AGUARDANDO</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={handleAbrirChamada} className={`w-full font-bold py-3.5 rounded-xl shadow-md ${clicadoChamada ? 'bg-blue-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                        {clicadoChamada ? '✓ Chamada Enviada!' : (chamadaAtiva ? 'Nova Chamada' : 'Iniciar Chamada Eletrónica')}
                      </button>
                    </div>
                  )}

                  {abaAtiva === 'CRONOMETRO' && (
                    <div className="p-6 flex flex-col h-full items-center text-center">
                      <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2 flex-shrink-0"><Clock className="w-5 h-5 text-orange-600" /> Tribuna / Expediente</h2>
                      <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-left flex-shrink-0">
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="orador" checked={tipoOrador === "VEREADOR"} onChange={() => setTipoOrador("VEREADOR")} /><span className="text-sm font-bold text-gray-700">Vereador</span></label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="orador" checked={tipoOrador === "OUTRO"} onChange={() => setTipoOrador("OUTRO")} /><span className="text-sm font-bold text-gray-700">Outro</span></label>
                        </div>
                        {tipoOrador === "VEREADOR" ? (
                          <select value={oradorSelecionado} onChange={(e) => setOradorSelecionado(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm bg-white">
                            <option value="">-- Selecione --</option>{vereadores.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder="Nome do convidado..." value={nomeConvidado} onChange={(e) => setNomeConvidado(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm bg-white" />
                        )}
                      </div>

                      <div className={`text-6xl font-black tracking-tighter mb-6 px-4 py-6 rounded-2xl border-2 w-full ${tempoRestante <= 30 ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' : 'bg-white text-gray-800 border-gray-200'}`}>
                        {formatarTempo(tempoRestante)}
                      </div>

                      <div className="flex gap-2 w-full mb-4">
                        <button onClick={() => handleAdicionarTempo(1)} className="flex-1 bg-blue-50 text-blue-700 font-bold py-2.5 rounded-lg border border-blue-200 text-sm"><PlusCircle className="w-3 h-3 inline mr-1"/> 1 Min</button>
                        <button onClick={() => handleAdicionarTempo(2)} className="flex-1 bg-blue-50 text-blue-700 font-bold py-2.5 rounded-lg border border-blue-200 text-sm"><PlusCircle className="w-3 h-3 inline mr-1"/> 2 Min</button>
                      </div>

                      <div className="flex gap-2 w-full mt-auto pt-4 border-t border-gray-100">
                        <button onClick={() => handleSetTempo(300)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl border text-sm">Ocultar</button>
                        <button onClick={handleToggleTimer} className={`flex-[2] font-bold py-3 rounded-xl shadow-md text-sm text-white ${timerAtivo ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {timerAtivo ? 'Pausar Tempo' : 'Exibir e Iniciar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col gap-6 h-[calc(100vh-13rem)]">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 h-full flex flex-col">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><MonitorPlay className="w-6 h-6 text-blue-600" /> Painel da Votação</h2>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1 text-sm">
                      <button onClick={() => mudarEstadoSessao("SUSPENSA")} className={`py-1.5 px-3 font-bold rounded-md ${estadoSessaoGlobal === "SUSPENSA" ? 'bg-amber-500 text-white shadow' : 'text-slate-600'}`}>Suspensa</button>
                      <button onClick={() => mudarEstadoSessao("EM_ANDAMENTO")} className={`py-1.5 px-3 font-bold rounded-md ${estadoSessaoGlobal === "EM_ANDAMENTO" ? 'bg-blue-600 text-white shadow' : 'text-slate-600'}`}>Em Andamento</button>
                      <button onClick={() => mudarEstadoSessao("ENCERRADA")} className={`py-1.5 px-3 font-bold rounded-md ${estadoSessaoGlobal === "ENCERRADA" ? 'bg-red-600 text-white shadow' : 'text-slate-600'}`}>Encerrar</button>
                    </div>
                  </div>

                  {!docSelecionado ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                      <PlayCircle className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-bold text-lg text-gray-500">Nenhuma matéria selecionada</p>
                      <p className="text-sm mt-1">Selecione uma matéria na aba lateral para abrir a votação.</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6 flex-shrink-0">
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded uppercase border">Em Análise</span>
                        <h3 className="font-bold text-xl text-gray-900 mb-2 mt-3">{docSelecionado.tipo || docSelecionado.type} Nº {docSelecionado.numero || docSelecionado.protocolNum || 'S/N'}/{docSelecionado.year}</h3>
                        <p className="text-sm text-gray-600 italic">"{docSelecionado.ementa}"</p>
                      </div>

                      {status === "AGUARDANDO" && (
                        <div className="flex-1 flex flex-col justify-end gap-4">
                          {regraAtual && !quorumAtingido && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-pulse">
                              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                              <div><p>Quórum insuficiente.</p><p className="font-medium text-red-600 mt-1">Regra: {regraAtual.tipoRegra} | Necessário: {regraAtual.minQuorum} | Atuais: {presencas.length}</p></div>
                            </div>
                          )}
                          {regraAtual && quorumAtingido && (
                             <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                               <CheckCircle className="w-5 h-5" /> Quórum atingido ({regraAtual.tipoRegra}). Presentes: {presencas.length}.
                             </div>
                          )}
                          <button onClick={handleAbrirVotacao} disabled={!quorumAtingido} className={`w-full text-white font-black text-lg py-5 rounded-xl shadow-lg flex items-center justify-center gap-3 ${quorumAtingido ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                            <PlayCircle className="w-7 h-7" /> ABRIR VOTAÇÃO NO TELÃO
                          </button>
                        </div>
                      )}

                      {status === "ABERTA" && (
                        <div className="flex-1 flex flex-col">
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6 text-center flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-blue-900 text-xl mb-6">Votação em Andamento...</h4>
                            <div className="flex items-baseline justify-center gap-2">
                              <span className="text-6xl font-black text-blue-900 tracking-tighter">{Object.keys(votos).length}</span>
                              <span className="text-xl text-blue-600 font-bold">/ {totalVereadores}</span>
                            </div>
                            <p className="text-blue-700 font-medium mt-2">Votos registados</p>
                          </div>
                          <button onClick={() => setShowModalEncerrar(true)} className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg py-5 rounded-xl shadow-lg flex items-center justify-center gap-3">
                            <StopCircle className="w-7 h-7" /> ENCERRAR VOTAÇÃO
                          </button>
                        </div>
                      )}

                      {status === "ENCERRADA" && (
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="text-center border-2 border-dashed border-gray-300 rounded-xl p-10 bg-gray-50 mb-6">
                            <h4 className="font-black text-gray-900 text-3xl mb-2">Votação Encerrada!</h4>
                            <p className="text-gray-500 font-medium">Os resultados estão fixos no Telão.</p>
                          </div>
                          <button onClick={handleLimparPainel} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl">Limpar Painel para Próxima Matéria</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {showModalEncerrar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Encerrar Votação?</h3>
            <p className="text-gray-600 mb-6">Confirma o encerramento do escrutínio?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowModalEncerrar(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancelar</button>
              <button onClick={confirmarEncerramento} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Sim, Encerrar</button>
            </div>
          </div>
        </div>
      )}

      {showModalEncerrarSessao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold mb-2 text-slate-900">Encerrar Sessão Plenária?</h3>
            <p className="text-gray-600 mb-6">A pauta será finalizada e você será redirecionado para preencher a <strong>Ata</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowModalEncerrarSessao(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancelar</button>
              <button onClick={confirmarEncerramentoSessao} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Sim, Encerrar</button>
            </div>
          </div>
        </div>
      )}
      
      {showModalSucessoAta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
            <h3 className="text-3xl font-black mb-3 text-slate-900">Sessão Encerrada!</h3>
            <p className="text-gray-600 mb-8 text-lg">Agora precisa de preencher as informações manuais para gerar o documento da Ata.</p>
            <button onClick={() => { setShowModalSucessoAta(false); router.push("/painel/ata"); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-lg">
              📝 Preencher e Gerar Ata
            </button>
          </div>
        </div>
      )}
    </div>
  );
}