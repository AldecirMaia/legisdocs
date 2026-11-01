"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { PlayCircle, StopCircle, MonitorPlay, CheckCircle, Users } from "lucide-react";
import Link from "next/link";

interface DocPauta {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  ementa: string;
  author?: { name: string };
  gabinete?: { name: string; users?: any[] };
}

export default function ControloSessao() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [documentos, setDocumentos] = useState<DocPauta[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do Controlo da Votação
  const [docSelecionado, setDocSelecionado] = useState<DocPauta | null>(null);
  const [status, setStatus] = useState<"AGUARDANDO" | "ABERTA" | "ENCERRADA">("AGUARDANDO");
  const [votos, setVotos] = useState<Record<string, string>>({});
  const [totalVereadores, setTotalVereadores] = useState(0);

  useEffect(() => {
    let activeSocket: Socket | null = null;

    const iniciarControlo = async () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
      setUser(parsedUser);

      try {
        const resDocs = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/aprovados/${parsedUser.tenantId}`);
        if (resDocs.ok) setDocumentos(await resDocs.json());

        const resGab = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/list/${parsedUser.tenantId}`);
        if (resGab.ok) {
          const gabinetes = await resGab.json();
          let contagem = 0;
          gabinetes.forEach((g: any) => {
            if (g.users?.some((u: any) => u.role === "VEREADOR")) contagem++;
          });
          setTotalVereadores(contagem);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da sessão:", error);
      } finally {
        setLoading(false);
      }

      // Conectar forçando o protocolo WebSocket
      const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
      activeSocket = io(API_URL, { transports: ['websocket'] });

      activeSocket.on("connect", () => {
        console.log("🟢 Controlo conectado ao Plenário!");
        activeSocket?.emit("entrarSala", { tenantId: parsedUser.tenantId });
      });

      activeSocket.on("statusVotacao", (sessao) => {
        if (sessao) {
          setDocSelecionado(sessao.documento);
          setStatus(sessao.status);
          setVotos(sessao.votos || {});
        }
      });

      activeSocket.on("votoAtualizado", (data) => {
        setVotos(data.totalVotos);
      });

      activeSocket.on("votacaoEncerrada", (sessaoFinal) => {
        setStatus("ENCERRADA");
        setVotos(sessaoFinal.votos);
      });

      setSocket(activeSocket);
    };

    iniciarControlo();

    return () => {
      if (activeSocket) activeSocket.disconnect();
    };
  }, [router]);

  // AÇÕES DA SECRETARIA
  const handleAbrirVotacao = () => {
    if (!socket || !docSelecionado) return;
    
    const nomeGabineteFormatado = docSelecionado.gabinete?.name?.replace(/^Gabinete (do|da|de)?\s*/i, '');
    const titular = docSelecionado.gabinete?.users?.find(u => u.role === "VEREADOR");
    const docFormatado = {
      ...docSelecionado,
      propositor: titular?.name || nomeGabineteFormatado || docSelecionado.author?.name
    };

    socket.emit("abrirVotacao", {
      tenantId: user.tenantId,
      documento: docFormatado
    });
    
    setStatus("ABERTA");
    setVotos({});
  };

  const handleEncerrarVotacao = async () => {
    if (!socket || !confirm("Tem a certeza que deseja encerrar esta votação? O resultado será guardado permanentemente.")) return;
    
    // 1. Trava o telão e os tablets instantaneamente
    socket.emit("encerrarVotacao", { tenantId: user.tenantId });
    setStatus("ENCERRADA");

    // 2. Calcula os totais finais
    const totalSim = Object.values(votos).filter(v => v === "SIM").length;
    const totalNao = Object.values(votos).filter(v => v === "NAO").length;
    const totalAbstencao = Object.values(votos).filter(v => v === "ABSTENCAO").length;
    const ausentes = totalVereadores - (totalSim + totalNao + totalAbstencao);

    // 3. Guarda no PostgreSQL via API NestJS
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/votacao/salvar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          documentId: docSelecionado?.id,
          sim: totalSim,
          nao: totalNao,
          abstencao: totalAbstencao,
          ausentes: ausentes > 0 ? ausentes : 0,
          votos: votos
        })
      });
      console.log("✅ Votação guardada com sucesso no Prisma!");
    } catch (error) {
      console.error("Erro ao guardar votação:", error);
    }
  };

  const handleLimparPainel = () => {
    setDocSelecionado(null);
    setStatus("AGUARDANDO");
    setVotos({});
  };

  const sim = Object.values(votos).filter(v => v === "SIM").length;
  const nao = Object.values(votos).filter(v => v === "NAO").length;
  const abs = Object.values(votos).filter(v => v === "ABSTENCAO").length;
  const totalVotos = sim + nao + abs;

  if (loading || !user) return <div className="p-10 text-center text-gray-500 animate-pulse">A preparar sistema de votação...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Controlo da Sessão</span></h1>
        <div className="flex gap-4 items-center">
          <Link href="/telao" target="_blank" className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-blue-700">
            <MonitorPlay className="w-4 h-4" /> Abrir Telão
          </Link>
          <Link href="/painel" className="text-blue-200 hover:text-white font-semibold">Voltar</Link>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[80vh]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <h2 className="font-bold text-gray-800 text-lg">Ordem do Dia (Pauta)</h2>
            <p className="text-xs text-gray-500 mt-1">Selecione o documento para colocar em votação.</p>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {documentos.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">Nenhum documento na pauta.</p>
            ) : documentos.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => status === "AGUARDANDO" && setDocSelecionado(doc)}
                className={`border rounded-lg p-4 transition-colors ${
                  docSelecionado?.id === doc.id 
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                    : status !== "AGUARDANDO" 
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed" 
                      : "border-gray-200 hover:border-blue-300 cursor-pointer"
                }`}
              >
                <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded uppercase">
                  {doc.type.replace('_', ' ')} Nº {doc.protocolNum}/{doc.year}
                </span>
                <p className="text-sm font-medium text-gray-800 mt-2 line-clamp-2">{doc.ementa}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-full flex flex-col">
            
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <MonitorPlay className="w-6 h-6 text-blue-600" /> Painel de Comando
            </h2>

            {!docSelecionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <PlayCircle className="w-20 h-20 mb-4 opacity-20" />
                <p className="font-bold text-lg">Nenhuma matéria selecionada</p>
                <p className="text-sm">Clique num documento da lista ao lado para iniciar.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl mb-8">
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded uppercase tracking-wider mb-3 inline-block">
                    Matéria Selecionada
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{docSelecionado.type.replace('_', ' ')} Nº {docSelecionado.protocolNum}/{docSelecionado.year}</h3>
                  <p className="text-sm text-gray-600 italic">"{docSelecionado.ementa}"</p>
                </div>

                {status === "AGUARDANDO" && (
                  <div className="mt-auto flex flex-col items-center">
                    <button 
                      onClick={handleAbrirVotacao}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-lg py-5 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                    >
                      <PlayCircle className="w-8 h-8" /> ABRIR VOTAÇÃO NO TELÃO
                    </button>
                    <p className="text-xs text-gray-500 mt-4 text-center">Isto irá libertar os botões nos tablets dos vereadores.</p>
                  </div>
                )}

                {status === "ABERTA" && (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8 text-center flex-1 flex flex-col justify-center">
                      <h4 className="font-bold text-blue-900 text-xl mb-4 flex items-center justify-center gap-2">
                        <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span></span>
                        Votação em Andamento
                      </h4>
                      
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        <span className="text-3xl font-black text-gray-800">{totalVotos}</span>
                        <span className="text-gray-500 font-bold">de {totalVereadores} votaram</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-4 mt-4 overflow-hidden flex">
                        <div className="bg-green-500 h-full" style={{ width: `${totalVereadores > 0 ? (sim / totalVereadores) * 100 : 0}%` }}></div>
                        <div className="bg-red-500 h-full" style={{ width: `${totalVereadores > 0 ? (nao / totalVereadores) * 100 : 0}%` }}></div>
                        <div className="bg-yellow-500 h-full" style={{ width: `${totalVereadores > 0 ? (abs / totalVereadores) * 100 : 0}%` }}></div>
                      </div>
                      
                      <div className="flex justify-center gap-6 mt-4 text-sm font-bold">
                        <span className="text-green-600">Sim: {sim}</span>
                        <span className="text-red-600">Não: {nao}</span>
                        <span className="text-yellow-600">Abs: {abs}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleEncerrarVotacao}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg py-5 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                    >
                      <StopCircle className="w-8 h-8" /> ENCERRAR VOTAÇÃO E EXIBIR RESULTADO
                    </button>
                  </div>
                )}

                {status === "ENCERRADA" && (
                  <div className="mt-auto text-center border-2 border-gray-200 rounded-xl p-8 bg-gray-50">
                    <CheckCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900 text-2xl mb-2">Votação Encerrada!</h4>
                    <p className="text-gray-600 mb-8">O resultado final está cravado no telão do plenário.</p>
                    <button 
                      onClick={handleLimparPainel}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 rounded-lg shadow-md transition-colors"
                    >
                      Limpar Painel para Próxima Matéria
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}