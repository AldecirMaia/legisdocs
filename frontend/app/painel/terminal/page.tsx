"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { CheckCircle, AlertCircle, Clock, ThumbsUp, ThumbsDown, Hand } from "lucide-react";
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

  // Estado da Votação
  const [status, setStatus] = useState<"AGUARDANDO" | "ABERTA" | "ENCERRADA">("AGUARDANDO");
  const [documento, setDocumento] = useState<any>(null);
  const [meuVoto, setMeuVoto] = useState<"SIM" | "NAO" | "ABSTENCAO" | null>(null);

  useEffect(() => {
    const iniciarTerminal = () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      
      const parsedUser = JSON.parse(storedUser);
      // Apenas Vereadores (e Super Admins para testes) acedem ao terminal
      if (parsedUser.role !== "VEREADOR" && parsedUser.role !== "SUPER_ADMIN") {
        alert("Acesso restrito a Vereadores.");
        return router.push("/painel");
      }
      setUser(parsedUser);

      // Ligar ao WebSocket
      const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
      const newSocket = io(API_URL);

      newSocket.on("connect", () => {
        newSocket.emit("entrarSala", { tenantId: parsedUser.tenantId });
      });

      newSocket.on("statusVotacao", (sessao) => {
        if (sessao) {
          setDocumento(sessao.documento);
          setStatus(sessao.status);
          // Tenta recuperar o voto se a página for recarregada
          if (sessao.votos && sessao.votos[parsedUser.id]) {
            setMeuVoto(sessao.votos[parsedUser.id]);
          } else {
            setMeuVoto(null);
          }
        }
      });

      newSocket.on("votacaoAberta", (novaSessao) => {
        setDocumento(novaSessao.documento);
        setStatus("ABERTA");
        setMeuVoto(null); // Reseta o voto para a nova matéria
        
        // Faz o tablet vibrar ligeiramente para alertar o vereador (se suportado pelo dispositivo)
        if (typeof window !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      });

      newSocket.on("votacaoEncerrada", (sessaoFinal) => {
        setStatus("ENCERRADA");
        // Regista o voto final cravado pelo servidor
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

  const registarVoto = (voto: "SIM" | "NAO" | "ABSTENCAO") => {
    if (!socket || !user || status !== "ABERTA") return;
    
    // Atualiza a interface instantaneamente (Optimistic UI)
    setMeuVoto(voto);
    
    // Envia para o Telão e Controlo
    socket.emit("registrarVoto", {
      tenantId: user.tenantId,
      vereadorId: user.id,
      voto: voto
    });
  };

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-bold">A carregar terminal...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      
      {/* CABEÇALHO DO TERMINAL */}
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

      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full">
        
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
            
            {/* INFORMAÇÃO DA MATÉRIA */}
            <div className="bg-slate-800 rounded-2xl p-6 border-l-4 border-blue-500 shadow-lg mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg tracking-widest uppercase">
                Em Apreciação
              </div>
              <span className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-2 block">
                {documento.type.replace('_', ' ')} Nº {documento.protocolNum}/{documento.year}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-white leading-snug">"{documento.ementa}"</h3>
            </div>

            {/* BOTÕES DE VOTAÇÃO GIGANTES */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => registarVoto("SIM")}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-4 transition-all duration-200 active:scale-95 ${
                  meuVoto === "SIM" 
                    ? "bg-green-600 border-green-400 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)] z-10" 
                    : "bg-slate-800 border-slate-700 text-green-500 hover:bg-slate-700 opacity-90"
                } ${meuVoto && meuVoto !== "SIM" ? "opacity-40 scale-95 grayscale" : ""}`}
              >
                <ThumbsUp className={`w-16 h-16 mb-4 ${meuVoto === "SIM" ? "text-white" : "text-green-500"}`} />
                <span className="text-3xl font-black tracking-widest uppercase">Sim</span>
                {meuVoto === "SIM" && <CheckCircle className="absolute top-4 right-4 w-8 h-8 text-white" />}
              </button>

              <button 
                onClick={() => registarVoto("NAO")}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-4 transition-all duration-200 active:scale-95 ${
                  meuVoto === "NAO" 
                    ? "bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] z-10" 
                    : "bg-slate-800 border-slate-700 text-red-500 hover:bg-slate-700 opacity-90"
                } ${meuVoto && meuVoto !== "NAO" ? "opacity-40 scale-95 grayscale" : ""}`}
              >
                <ThumbsDown className={`w-16 h-16 mb-4 ${meuVoto === "NAO" ? "text-white" : "text-red-500"}`} />
                <span className="text-3xl font-black tracking-widest uppercase">Não</span>
                {meuVoto === "NAO" && <CheckCircle className="absolute top-4 right-4 w-8 h-8 text-white" />}
              </button>

              <button 
                onClick={() => registarVoto("ABSTENCAO")}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-4 transition-all duration-200 active:scale-95 ${
                  meuVoto === "ABSTENCAO" 
                    ? "bg-yellow-500 border-yellow-300 text-slate-900 shadow-[0_0_30px_rgba(234,179,8,0.5)] z-10" 
                    : "bg-slate-800 border-slate-700 text-yellow-500 hover:bg-slate-700 opacity-90"
                } ${meuVoto && meuVoto !== "ABSTENCAO" ? "opacity-40 scale-95 grayscale" : ""}`}
              >
                <Hand className={`w-16 h-16 mb-4 ${meuVoto === "ABSTENCAO" ? "text-slate-900" : "text-yellow-500"}`} />
                <span className="text-2xl font-black tracking-widest uppercase">Abstenção</span>
                {meuVoto === "ABSTENCAO" && <CheckCircle className="absolute top-4 right-4 w-8 h-8 text-slate-900" />}
              </button>
            </div>
            
            {meuVoto && (
              <p className="text-center mt-6 text-green-400 font-bold animate-pulse flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Voto registado com sucesso. Pode alterar a sua escolha enquanto a votação estiver aberta.
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
              <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-slate-700 inline-block">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">O seu voto cravado foi</p>
                <p className={`text-4xl font-black uppercase ${
                  meuVoto === "SIM" ? "text-green-500" : meuVoto === "NAO" ? "text-red-500" : "text-yellow-500"
                }`}>
                  {meuVoto}
                </p>
              </div>
            ) : (
              <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-red-900/50 inline-block">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-slate-300 font-bold">Não registou o seu voto a tempo.</p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}