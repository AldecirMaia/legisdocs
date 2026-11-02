"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { CheckCircle, AlertTriangle, Monitor, XCircle, Clock, Users } from "lucide-react";

interface Vereador {
  id: string;
  name: string;
  partido?: string;
}

export default function TelaoPlenario() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Estado da Votação
  const [status, setStatus] = useState<"AGUARDANDO" | "ABERTA" | "ENCERRADA">("AGUARDANDO");
  const [documento, setDocumento] = useState<any>(null);
  
  // Estado Global da Sessão recebido da Secretaria
  const [estadoSessaoGlobal, setEstadoSessaoGlobal] = useState<"SUSPENSA" | "EM_ANDAMENTO" | "ENCERRADA">("SUSPENSA");

  // Informações do Quórum
  const [presencas, setPresencas] = useState<string[]>([]);

  // Informações da Tribuna / Orador
  const [oradorAtual, setOradorAtual] = useState<string | null>(null);
  const [mostrarCronometro, setMostrarCronometro] = useState(false);
  const [tempoCronometro, setTempoCronometro] = useState<number | null>(null);
  const [cronometroAtivo, setCronometroAtivo] = useState(false);
  const [cronometroAlerta, setCronometroAlerta] = useState<"NORMAL" | "1_MINUTO" | "30_SEGUNDOS" | "ESGOTADO">("NORMAL");

  // Lista de Vereadores e Votos
  const [vereadores, setVereadores] = useState<Vereador[]>([]);
  const [votos, setVotos] = useState<Record<string, 'SIM' | 'NAO' | 'ABSTENCAO'>>({});

  useEffect(() => {
    const iniciarTelao = async () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      
      const parsedUser = JSON.parse(storedUser);
      setTenantId(parsedUser.tenantId);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/list/${parsedUser.tenantId}`);
        if (res.ok) {
          const gabinetes = await res.json();
          const listaVereadores: Vereador[] = [];
          gabinetes.forEach((gab: any) => {
            const titular = gab.users?.find((u: any) => u.role === "VEREADOR");
            if (titular) listaVereadores.push({ id: titular.id, name: titular.name, partido: titular.partido });
          });
          setVereadores(listaVereadores);
        }
      } catch (error) {
        console.error("Erro ao carregar vereadores:", error);
      }
    };
    
    iniciarTelao();
  }, [router]);

  useEffect(() => {
    if (!tenantId) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
    const newSocket = io(API_URL, { transports: ['websocket'] });

    newSocket.on("connect", () => {
      console.log("🟢 Telão conectado ao Plenário Digital!");
      newSocket.emit("entrarSala", { tenantId });
    });

    newSocket.on("statusVotacao", (sessao) => {
      if (sessao) {
        setDocumento(sessao.documento);
        setStatus(sessao.status);
        setVotos(sessao.votos || {});
      }
    });

    newSocket.on("votacaoAberta", (novaSessao) => {
      setDocumento(novaSessao.documento);
      setStatus("ABERTA");
      setVotos({});
    });

    newSocket.on("votoAtualizado", (data) => {
      setVotos(data.totalVotos);
    });

    newSocket.on("votacaoEncerrada", (sessaoFinal) => {
      setStatus("ENCERRADA");
      setVotos(sessaoFinal.votos);
    });

    newSocket.on("estadoSessaoAtualizado", (novoEstado) => {
      setEstadoSessaoGlobal(novoEstado);
    });

    // Escuta o Quórum
    newSocket.on("chamadaAberta", () => {
      setPresencas([]);
    });

    newSocket.on("presencaConfirmada", (data) => {
      setPresencas((prev) => [...new Set([...prev, data.vereadorId])]);
    });

    // Escuta o Cronômetro e Orador
    newSocket.on("syncCronometro", (data) => {
      setTempoCronometro(data.tempo);
      setCronometroAtivo(data.ativo);
      if (data.orador) setOradorAtual(data.orador);
      if (data.tempo > 60) setCronometroAlerta("NORMAL");
      if (data.visivel !== undefined) setMostrarCronometro(data.visivel); // Define se aparece no telão
    });

    newSocket.on("alertaCronometro", (data) => {
      setCronometroAlerta(data.tipo);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [tenantId]);

  const totalSim = Object.values(votos).filter(v => v === "SIM").length;
  const totalNao = Object.values(votos).filter(v => v === "NAO").length;
  const totalAbstencao = Object.values(votos).filter(v => v === "ABSTENCAO").length;
  const totalVotantes = Object.keys(votos).length;
  const ausentes = vereadores.length - totalVotantes;
  
  const isAprovado = totalSim > totalNao;

  const getCorVoto = (voto?: string) => {
    switch (voto) {
      case "SIM": return "bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]";
      case "NAO": return "bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]";
      case "ABSTENCAO": return "bg-yellow-500 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]";
      default: return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getTextoVoto = (voto?: string) => {
    switch (voto) {
      case "SIM": return "SIM";
      case "NAO": return "NÃO";
      case "ABSTENCAO": return "ABSTENÇÃO";
      default: return "AGUARDANDO...";
    }
  };

  const formatarTempo = (segundos: number | null) => {
    if (segundos === null) return "00:00";
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* TRIBUNA / CRONÔMETRO DE GRANDE DESTAQUE (Aparece apenas quando visivel === true) */}
      {mostrarCronometro && tempoCronometro !== null && (
        <div className={`w-full p-8 md:p-12 border-b-8 transition-all duration-700 shadow-2xl flex flex-col md:flex-row items-center justify-between z-50 relative ${
          cronometroAlerta === "ESGOTADO" ? "bg-slate-900 border-red-600" :
          cronometroAlerta === "30_SEGUNDOS" ? "bg-red-900 border-red-500 animate-[pulse_1s_ease-in-out_infinite]" :
          cronometroAlerta === "1_MINUTO" ? "bg-yellow-600 border-yellow-400" :
          "bg-blue-900 border-blue-500"
        }`}>
          <div className="flex items-center gap-6">
            <Clock className={`w-16 h-16 md:w-24 md:h-24 ${cronometroAtivo ? 'animate-spin-slow' : ''} text-white`} style={{ animationDuration: '4s' }} />
            <div>
              <h2 className="text-white/80 font-bold uppercase tracking-widest text-lg md:text-xl">Tribuna / Expediente</h2>
              <p className="text-white font-black text-3xl md:text-5xl tracking-wider mt-2 drop-shadow-md">
                {oradorAtual ? `Orador(a): ${oradorAtual}` : "Fala Parlamentar"}
              </p>
            </div>
          </div>
          <div className="text-[6rem] md:text-[10rem] leading-none font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
            {formatarTempo(tempoCronometro)}
          </div>
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4">
          <Monitor className="w-10 h-10 text-blue-500" />
          <div>
            <h1 className="text-3xl font-black tracking-wider text-white uppercase">Painel Eletrónico</h1>
            <p className="text-blue-400 font-bold tracking-widest text-sm mt-1">Câmara Municipal</p>
          </div>
        </div>
        
        {/* INDICADOR DINÂMICO DO ESTADO GLOBAL DA SESSÃO */}
        <div className="flex items-center">
          {estadoSessaoGlobal === "SUSPENSA" && (
            <div className="flex items-center gap-3 bg-amber-950/60 border border-amber-600 px-6 py-3 rounded-full">
              <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span></span>
              <span className="font-bold text-amber-400 uppercase tracking-widest">Sessão Suspensa</span>
            </div>
          )}
          {estadoSessaoGlobal === "EM_ANDAMENTO" && (
            <div className="flex items-center gap-3 bg-blue-950 border border-blue-600 px-8 py-4 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.3)]">
              <span className="relative flex h-5 w-5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500"></span></span>
              <span className="font-black text-blue-400 uppercase tracking-widest text-lg">Sessão em Andamento</span>
            </div>
          )}
          {estadoSessaoGlobal === "ENCERRADA" && (
            <div className="flex items-center gap-3 bg-red-950 border border-red-800 px-8 py-4 rounded-full">
              <CheckCircle className="w-6 h-6 text-red-500" />
              <span className="font-black text-red-400 uppercase tracking-widest text-lg">Sessão Encerrada</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-8 flex flex-col xl:flex-row gap-8">
        
        {documento ? (
          // ==============================
          // MODO 1: MATÉRIA EM VOTAÇÃO
          // ==============================
          <>
            <div className="xl:w-1/3 flex flex-col gap-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl flex-1 flex flex-col">
                <h2 className="text-slate-500 font-bold tracking-widest uppercase text-sm mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Matéria em Apreciação
                </h2>
                
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
                  <span className="inline-block bg-blue-900/50 text-blue-300 border border-blue-700/50 px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider w-max mb-4">
                    {String(documento.type || documento.tipo || 'MATÉRIA').replace('_', ' ')} Nº {documento.protocolNum || documento.numero || 'S/N'}/{documento.year || new Date().getFullYear()}
                  </span>
                  
                  <h3 className="text-2xl font-bold text-white mb-6 leading-relaxed flex-1">
                    "{documento.ementa}"
                  </h3>
                  
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 mt-auto">
                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Autoridade Proponente</p>
                    <p className="text-lg font-bold text-slate-300">{documento.propositor || documento.autor || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
                <h2 className="text-slate-500 font-bold tracking-widest uppercase text-sm mb-6">Resultado Parcial / Final</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-4 flex flex-col items-center justify-center">
                    <span className="text-green-500 font-bold uppercase text-xs tracking-wider mb-1">Sim</span>
                    <span className="text-5xl font-black text-white">{totalSim}</span>
                  </div>
                  <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex flex-col items-center justify-center">
                    <span className="text-red-500 font-bold uppercase text-xs tracking-wider mb-1">Não</span>
                    <span className="text-5xl font-black text-white">{totalNao}</span>
                  </div>
                  <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4 flex flex-col items-center justify-center">
                    <span className="text-yellow-500 font-bold uppercase text-xs tracking-wider mb-1">Abstenções</span>
                    <span className="text-4xl font-black text-white">{totalAbstencao}</span>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-1">Ausentes/Faltosos</span>
                    <span className="text-4xl font-black text-slate-300">{ausentes > 0 ? ausentes : 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-2/3 bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl flex flex-col relative overflow-hidden">
              {status === "ENCERRADA" && (
                <div className={`mb-8 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 shadow-2xl animate-in slide-in-from-top-8 fade-in duration-700 z-10 relative overflow-hidden ${isAprovado ? 'bg-green-600 border-2 border-green-400' : 'bg-red-600 border-2 border-red-400'}`}>
                  {isAprovado ? <CheckCircle className="w-16 h-16 text-white relative z-10" /> : <XCircle className="w-16 h-16 text-white relative z-10" />}
                  <div className="text-center md:text-left relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-widest">
                      MATÉRIA {isAprovado ? 'APROVADA' : 'REJEITADA'}
                    </h2>
                    <p className="text-white/90 font-bold tracking-widest mt-2 uppercase text-lg">
                      Decisão por {totalSim} votos a {totalNao}
                    </p>
                  </div>
                </div>
              )}

              <h2 className="text-slate-500 font-bold tracking-widest uppercase text-sm mb-6">Quadro de Votação Nominal</h2>
              
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {vereadores.map(ver => {
                    const votoAtual = votos[ver.id];
                    return (
                      <div key={ver.id} className={`flex flex-col justify-between p-5 rounded-xl border-2 transition-all duration-500 ${getCorVoto(votoAtual)}`}>
                        <div>
                          <h3 className="font-black text-lg uppercase tracking-wide truncate" title={ver.name}>{ver.name}</h3>
                          <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">{ver.partido || "Sem Partido"}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-current/20 flex items-center justify-between">
                          <span className="text-xs uppercase font-bold tracking-widest opacity-80">Voto</span>
                          <span className="text-xl font-black tracking-wider">{getTextoVoto(votoAtual)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          // ==============================
          // MODO 2: QUÓRUM / TELA INICIAL
          // ==============================
          <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-8 h-8 text-slate-400" />
              <h2 className="text-slate-400 font-bold tracking-widest uppercase text-lg">Quórum / Presença Parlamentar</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {vereadores.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-slate-500 font-bold tracking-widest uppercase">
                    A carregar composição da Câmara...
                  </div>
                ) : (
                  vereadores.map(ver => {
                    const isPresent = presencas.includes(ver.id);
                    return (
                      <div key={ver.id} className={`flex flex-col justify-between p-6 rounded-xl border-2 transition-all duration-500 ${isPresent ? 'bg-green-950/40 border-green-500 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-slate-800/50 border-slate-700 text-slate-300'}`}>
                        <div>
                          <h3 className="font-black text-xl uppercase tracking-wide truncate" title={ver.name}>{ver.name}</h3>
                          <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">{ver.partido || "Sem Partido"}</p>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-current/20 flex items-center justify-between">
                          <span className="text-xs uppercase font-bold tracking-widest opacity-80">Status</span>
                          <span className={`text-xl font-black tracking-wider ${isPresent ? 'text-green-400' : 'text-slate-500'}`}>
                            {isPresent ? 'PRESENTE' : 'AGUARDANDO...'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}