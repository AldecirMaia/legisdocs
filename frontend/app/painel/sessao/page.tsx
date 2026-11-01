"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { PlayCircle, StopCircle, MonitorPlay, CheckCircle, Users, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface DocPauta {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  ementa: string;
  propositor?: string;
  turnoVotacao?: string;
}

export default function ControloSessao() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [documentos, setDocumentos] = useState<DocPauta[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do Controlo
  const [docSelecionado, setDocSelecionado] = useState<DocPauta | null>(null);
  const [status, setStatus] = useState<"AGUARDANDO" | "ABERTA" | "ENCERRADA">("AGUARDANDO");
  const [votos, setVotos] = useState<Record<string, string>>({});
  const [totalVereadores, setTotalVereadores] = useState(0);
  
  const [showModalEncerrar, setShowModalEncerrar] = useState(false);

  useEffect(() => {
    let activeSocket: Socket | null = null;

    const iniciarControlo = async () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
      setUser(parsedUser);

      try {
        const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        
        // 1. NOVO FLUXO: Busca a Pauta Ativa enviada pelo Construtor
        const resDocs = await fetch(`${apiEnv}/pauta/ativa/${parsedUser.tenantId}`);
        if (resDocs.ok) {
          const pauta = await resDocs.json();
          if (pauta && pauta.itens) {
            // Filtra apenas os que vão a votação e converte para manter compatibilidade com o Telão
            const ordemDoDia = pauta.itens
              .filter((item: any) => item.tramitacao === "VOTAÇÃO")
              .map((item: any) => {
                const [protocolNum, year] = item.numero.split('/');
                return {
                  id: item.id,
                  type: item.type,
                  protocolNum: parseInt(protocolNum) || 0,
                  year: parseInt(year) || new Date().getFullYear(),
                  ementa: item.ementa,
                  propositor: item.propositor,
                  turnoVotacao: item.turnoVotacao
                };
              });
            setDocumentos(ordemDoDia);
          }
        }

        // 2. Conta os vereadores para a barra de progresso
        const resGab = await fetch(`${apiEnv}/gabinete/list/${parsedUser.tenantId}`);
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

      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const socketUrl = apiEnv.replace('/api', ''); 
      activeSocket = io(socketUrl, { transports: ['websocket'] });

      activeSocket.on("connect", () => {
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

  const handleAbrirVotacao = () => {
    if (!socket || !docSelecionado) return;
    socket.emit("abrirVotacao", { tenantId: user.tenantId, documento: docSelecionado });
    setStatus("ABERTA");
    setVotos({});
  };

  const handleEncerrarVotacao = () => setShowModalEncerrar(true);

  const confirmarEncerramento = async () => {
    setShowModalEncerrar(false);
    if (!socket) return;

    socket.emit("encerrarVotacao", { tenantId: user.tenantId });
    setStatus("ENCERRADA");

    const totalSim = Object.values(votos).filter(v => v === "SIM").length;
    const totalNao = Object.values(votos).filter(v => v === "NAO").length;
    const totalAbstencao = Object.values(votos).filter(v => v === "ABSTENCAO").length;
    const ausentes = totalVereadores - (totalSim + totalNao + totalAbstencao);

    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/votacao/salvar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          // Se for um item adicionado manualmente (ex: manual-173...), evitamos salvar o ID fake na tabela de docs, guardamos só o registo de votação
          documentId: docSelecionado?.id.startsWith("manual-") ? undefined : docSelecionado?.id,
          sim: totalSim,
          nao: totalNao,
          abstencao: totalAbstencao,
          ausentes: ausentes > 0 ? ausentes : 0,
          votos: votos
        })
      });
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
          <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Ordem do Dia (Pauta)</h2>
              <p className="text-xs text-gray-500 mt-1">Selecione o documento para colocar em votação no Telão.</p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{documentos.length} itens</span>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {documentos.length === 0 ? (
              <div className="text-center text-gray-500 mt-10 p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <AlertTriangle className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="font-bold">Nenhum documento na pauta oficial.</p>
                <p className="text-sm mt-1">Vá ao "Construtor de Pauta" e envie os documentos para a Sessão.</p>
              </div>
            ) : documentos.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => status === "AGUARDANDO" && setDocSelecionado(doc)}
                className={`border rounded-lg p-4 transition-colors ${
                  docSelecionado?.id === doc.id 
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 shadow-sm" 
                    : status !== "AGUARDANDO" 
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed" 
                      : "border-gray-200 hover:border-blue-300 cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold bg-gray-800 text-white px-2 py-1 rounded uppercase">
                    {doc.type} Nº {doc.protocolNum > 0 ? String(doc.protocolNum).padStart(3, '0') : "S/N"}/{doc.year}
                  </span>
                  {doc.turnoVotacao && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded uppercase">{doc.turnoVotacao}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 line-clamp-2">"{doc.ementa}"</p>
                <p className="text-xs text-gray-500 mt-2 font-semibold">Autor: {doc.propositor}</p>
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
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded uppercase tracking-wider">
                      Matéria Selecionada
                    </span>
                    {docSelecionado.turnoVotacao && (
                      <span className="text-xs font-bold text-green-700 uppercase tracking-widest">{docSelecionado.turnoVotacao}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{docSelecionado.type} Nº {docSelecionado.protocolNum > 0 ? String(docSelecionado.protocolNum).padStart(3, '0') : "S/N"}/{docSelecionado.year}</h3>
                  <p className="text-sm text-gray-600 italic mb-2">"{docSelecionado.ementa}"</p>
                  <p className="text-sm font-bold text-gray-700 border-t pt-2 mt-2">Autoridade Proponente: {docSelecionado.propositor}</p>
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
                        <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${totalVereadores > 0 ? (sim / totalVereadores) * 100 : 0}%` }}></div>
                        <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${totalVereadores > 0 ? (nao / totalVereadores) * 100 : 0}%` }}></div>
                        <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${totalVereadores > 0 ? (abs / totalVereadores) * 100 : 0}%` }}></div>
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
                    
                    <div className="flex justify-center gap-4 mt-6 mb-8 text-lg font-black">
                      <span className="text-green-700 bg-green-100 border border-green-300 px-6 py-3 rounded-xl shadow-sm flex flex-col">
                        <span className="text-xs text-green-600 uppercase tracking-widest mb-1">Sim</span>
                        <span className="text-3xl">{sim}</span>
                      </span>
                      <span className="text-red-700 bg-red-100 border border-red-300 px-6 py-3 rounded-xl shadow-sm flex flex-col">
                        <span className="text-xs text-red-600 uppercase tracking-widest mb-1">Não</span>
                        <span className="text-3xl">{nao}</span>
                      </span>
                      <span className="text-yellow-700 bg-yellow-100 border border-yellow-300 px-6 py-3 rounded-xl shadow-sm flex flex-col">
                        <span className="text-xs text-yellow-600 uppercase tracking-widest mb-1">Abstenção</span>
                        <span className="text-3xl">{abs}</span>
                      </span>
                    </div>

                    <button 
                      onClick={handleLimparPainel}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md transition-colors text-lg"
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

      {/* MODAL DE CONFIRMAÇÃO */}
      {showModalEncerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center border-4 border-red-50">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <button onClick={() => setShowModalEncerrar(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Encerrar Votação?</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Tem a certeza que deseja encerrar o escrutínio desta matéria? O resultado será gravado permanentemente na base de dados e cravado no telão para o público.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowModalEncerrar(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEncerramento}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/30"
              >
                Sim, Encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}