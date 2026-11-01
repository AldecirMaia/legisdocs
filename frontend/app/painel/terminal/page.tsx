"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { CheckCircle, AlertCircle, Clock, ThumbsUp, ThumbsDown, Hand, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface UserAuth {
  id: string;
  name: string;
  role: string;
  tenantId: string;
  [key: string]: any;
}

export default function TerminalVereador() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null); // NOVO: Controlo de Bloqueio

  // Estado da Votação
  const [status, setStatus] = useState<"AGUARDANDO" | "ABERTA" | "ENCERRADA">("AGUARDANDO");
  const [documento, setDocumento] = useState<any>(null);
  
  // Controle em duas etapas (UX)
  const [votoSelecionado, setVotoSelecionado] = useState<"SIM" | "NAO" | "ABSTENCAO" | null>(null);
  const [meuVoto, setMeuVoto] = useState<"SIM" | "NAO" | "ABSTENCAO" | null>(null);

  useEffect(() => {
    const iniciarTerminal = () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      
      const parsedUser = JSON.parse(storedUser);
      
      // BLOQUEIO DE SEGURANÇA: Se não for Vereador ou Super Admin, bloqueia na hora!
      if (parsedUser.role !== "VEREADOR" && parsedUser.role !== "SUPER_ADMIN") {
        setIsAuthorized(false);
        return; // Interrompe a função aqui. Não liga ao WebSocket.
      }

      setIsAuthorized(true);
      setUser(parsedUser);

      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const socketUrl = apiEnv.replace('/api', ''); 
      const newSocket = io(socketUrl, { transports: ['websocket'] });

      newSocket.on("connect", () => {
        newSocket.emit("entrarSala", { tenantId: parsedUser.tenantId });
      });

      newSocket.on("statusVotacao", (sessao) => {
        if (sessao) {
          setDocumento(sessao.documento);
          setStatus(sessao.status);
          if (sessao.votos && sessao.votos[parsedUser.id]) {
            setMeuVoto(sessao.votos[parsedUser.id]);
            setVotoSelecionado(sessao.votos[parsedUser.id]);
          } else {
            setMeuVoto(null);
            setVotoSelecionado(null);
          }
        }
      });

      newSocket.on("votacaoAberta", (novaSessao) => {
        setDocumento(novaSessao.documento);
        setStatus("ABERTA");
        setMeuVoto(null); 
        setVotoSelecionado(null);
        
        if (typeof window !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      });

      newSocket.on("votacaoEncerrada", (sessaoFinal) => {
        setStatus("ENCERRADA");
        if (sessaoFinal.votos && sessaoFinal.votos[parsedUser.id]) {
          setMeuVoto(sessaoFinal.votos[parsedUser.id]);
        }
      });

      setSocket(newSocket);
    };

    iniciarTerminal();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [router]);

  // Apenas seleciona visualmente
  const selecionarVoto = (voto: "SIM" | "NAO" | "ABSTENCAO") => {
    if (status !== "ABERTA") return;
    setVotoSelecionado(voto);
  };

  // Envia para o Telão e grava
  const confirmarVoto = () => {
    if (!socket || !user || status !== "ABERTA" || !votoSelecionado) return;
    
    setMeuVoto(votoSelecionado);
    socket.emit("registrarVoto", {
      tenantId: user.tenantId,
      vereadorId: user.id,
      voto: votoSelecionado
    });
  };

  // 1. ECRÃ DE BLOQUEIO (Assessor tenta aceder)
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 select-none">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">Acesso Restrito</h1>
        <p className="text-slate-400 max-w-md mb-8 text-lg">
          Este terminal é de uso exclusivo dos Vereadores titulares durante as sessões. O perfil de Assessor não tem permissão para registar votos.
        </p>
        <Link href="/painel" className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition-colors border border-slate-700">
          Voltar ao Gabinete
        </Link>
      </div>
    );
  }

  // 2. ECRÃ DE CARREGAMENTO
  if (!user || isAuthorized === null) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-bold">A verificar credenciais...</div>;
  }

  const precisaConfirmar = votoSelecionado && votoSelecionado !== meuVoto;

  // 3. ECRÃ NORMAL DO VEREADOR
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      <header className="bg-slate-950 border-b border-slate-800 p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center border-2 border-blue-500">
            <span className="font-bold text-white text-lg">{user.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-400">Terminal do Vereador</h1>
            <p className="text-white font-black text-lg tracking-wide leading-tight">{user.name}</p>
          </div>
        </div>
        <Link href="/painel" className="text-slate-400 hover:text-white bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
          Sair
        </Link>
      </header>

      <main className={`flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full ${precisaConfirmar ? 'pb-32' : ''}`}>
        
        {status === "AGUARDANDO" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-8 relative">
              <span className="absolute inset-0 border-4 border-t-blue-500 border-slate-700 rounded-full animate-spin"></span>
              <Clock className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-wide">Aguardando Votação</h2>
            <p className="text-slate-400 text-lg max-w-md">O painel está bloqueado. Aguarde que a Mesa Diretora inicie a votação da próxima matéria.</p>
          </div>
        )}

        {status === "ABERTA" && documento && (
          <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="bg-slate-800 rounded-2xl p-6 border-l-4 border-blue-500 shadow-lg mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg tracking-widest uppercase">
                Em Apreciação
              </div>
              <span className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-2 block">
                {documento.type.replace('_', ' ')} Nº {documento.protocolNum}/{documento.year}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-white leading-snug">"{documento.ementa}"</h3>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => selecionarVoto("SIM")}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-4 transition-all duration-200 active:scale-95 ${
                  meuVoto === "SIM" 
                    ? "bg-green-600 border-green-400 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)] z-10" 
                    : votoSelecionado === "SIM"
                      ? "bg-slate-700 border-blue-500 text-green-400 ring-4 ring-blue-500/50"
                      : "bg-slate-800 border-slate-700 text-green-500 hover:bg-slate-700 opacity-90"
                } ${(meuVoto || votoSelecionado) && votoSelecionado !== "SIM" ? "opacity-40 scale-95 grayscale" : ""}`}
              >
                <ThumbsUp className={`w-16 h-16 mb-4 ${meuVoto === "SIM" || votoSelecionado === "SIM" ? "text-white" : "text-green-500"}`} />
                <span className="text-3xl font-black tracking-widest uppercase">Sim</span>
                {meuVoto === "SIM" && <CheckCircle className="absolute top-4 right-4 w-8 h-8 text-white" />}
              </button>

              <button 
                onClick={() => selecionarVoto("NAO")}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-4 transition-all duration-200 active:scale-95 ${
                  meuVoto === "NAO" 
                    ? "bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] z-10" 
                    : votoSelecionado === "NAO"
                      ? "bg-slate-700 border-blue-500 text-red-400 ring-4 ring-blue-500/50"
                      : "bg-slate-800 border-slate-700 text-red-500 hover:bg-slate-700 opacity-90"
                } ${(meuVoto || votoSelecionado) && votoSelecionado !== "NAO" ? "opacity-40 scale-95 grayscale" : ""}`}
              >
                <ThumbsDown className={`w-16 h-16 mb-4 ${meuVoto === "NAO" || votoSelecionado === "NAO" ? "text-white" : "text-red-500"}`} />
                <span className="text-3xl font-black tracking-widest uppercase">Não</span>
                {meuVoto === "NAO" && <CheckCircle className="absolute top-4 right-4 w-8 h-8 text-white" />}
              </button>

              <button 
                onClick={() => selecionarVoto("ABSTENCAO")}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-4 transition-all duration-200 active:scale-95 ${
                  meuVoto === "ABSTENCAO" 
                    ? "bg-yellow-500 border-yellow-300 text-slate-900 shadow-[0_0_30px_rgba(234,179,8,0.5)] z-10" 
                    : votoSelecionado === "ABSTENCAO"
                      ? "bg-slate-700 border-blue-500 text-yellow-400 ring-4 ring-blue-500/50"
                      : "bg-slate-800 border-slate-700 text-yellow-500 hover:bg-slate-700 opacity-90"
                } ${(meuVoto || votoSelecionado) && votoSelecionado !== "ABSTENCAO" ? "opacity-40 scale-95 grayscale" : ""}`}
              >
                <Hand className={`w-16 h-16 mb-4 ${meuVoto === "ABSTENCAO" ? "text-slate-900" : (votoSelecionado === "ABSTENCAO" ? "text-white" : "text-yellow-500")}`} />
                <span className="text-2xl font-black tracking-widest uppercase">Abstenção</span>
                {meuVoto === "ABSTENCAO" && <CheckCircle className="absolute top-4 right-4 w-8 h-8 text-slate-900" />}
              </button>
            </div>
            
            {meuVoto && !precisaConfirmar && (
              <p className="text-center mt-6 text-green-400 font-bold flex items-center justify-center gap-2 bg-green-900/30 py-3 rounded-xl border border-green-800">
                <CheckCircle className="w-5 h-5" /> Voto registado e enviado para o painel!
              </p>
            )}
          </div>
        )}

        {status === "ENCERRADA" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-8 duration-500">
            <div className="w-24 h-24 bg-blue-900/50 rounded-full flex items-center justify-center mb-6 border border-blue-500">
              <CheckCircle className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-wide">Votação Encerrada</h2>
            
            {meuVoto ? (
              <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-slate-700 inline-block shadow-xl">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">O seu voto cravado foi</p>
                <p className={`text-4xl font-black uppercase ${
                  meuVoto === "SIM" ? "text-green-500" : meuVoto === "NAO" ? "text-red-500" : "text-yellow-500"
                }`}>
                  {meuVoto}
                </p>
              </div>
            ) : (
              <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-red-900/50 inline-block shadow-xl">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-slate-300 font-bold">Não registou o seu voto a tempo.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {precisaConfirmar && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full flex justify-center z-50">
          <button 
            onClick={confirmarVoto}
            className="w-full max-w-md bg-blue-600 hover:bg-blue-500 text-white font-black text-xl py-5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <CheckCircle className="w-8 h-8" />
            CONFIRMAR VOTO: {votoSelecionado}
          </button>
        </div>
      )}
    </div>
  );
}