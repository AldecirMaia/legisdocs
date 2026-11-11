"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  LayoutGrid, Clock, UserCircle, Filter, Inbox, UserCog, Gavel, 
  CheckCircle2, FileSignature, Edit3, Plus, Eye, Download, FileDown, 
  Search, Bell, ChevronDown, Menu, LogOut 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

const colunasBase = {
  AGUARDANDO_DESPACHO: { id: "AGUARDANDO_DESPACHO", titulo: "Aguardando Despacho", corBorda: "border-t-slate-500", icone: Inbox, items: [] },
  EM_ANALISE: { id: "EM_ANALISE", titulo: "Em Análise", corBorda: "border-t-blue-500", icone: UserCog, items: [] },
  AGUARDANDO_VOTACAO: { id: "AGUARDANDO_VOTACAO", titulo: "Aguardando Votação", corBorda: "border-t-amber-500", icone: Gavel, items: [] },
  CONCLUIDO: { id: "CONCLUIDO", titulo: "Parecer Concluído", corBorda: "border-t-emerald-500", icone: CheckCircle2, items: [] },
};

export default function KanbanComissoes() {
  const router = useRouter();
  const [colunas, setColunas] = useState<any>(colunasBase);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [comissaoSelecionada, setComissaoSelecionada] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modais de Parecer
  const [showModalParecer, setShowModalParecer] = useState(false);
  const [tramitacaoAtiva, setTramitacaoAtiva] = useState<any>(null);
  const [textoParecer, setTextoParecer] = useState("");
  const [resultadoParecer, setResultadoParecer] = useState("FAVORÁVEL");

  // Modal de Leitura do Parecer
  const [showModalLeitura, setShowModalLeitura] = useState(false);
  const [parecerEmLeitura, setParecerEmLeitura] = useState<any>(null);

  // Modal de Despacho (Secretaria)
  const [showModalDespacho, setShowModalDespacho] = useState(false);
  const [documentosDisponiveis, setDocumentosDisponiveis] = useState<any[]>([]);
  const [filtroDataDespacho, setFiltroDataDespacho] = useState("");
  const [documentoSelecionado, setDocumentoSelecionado] = useState("");
  const [comissaoAlvoDespacho, setComissaoAlvoDespacho] = useState("");
  const [prazoDespacho, setPrazoDespacho] = useState(15); 

  // Modal de Designar
  const [showModalDesignar, setShowModalDesignar] = useState(false);
  const [tramitacaoParaDesignar, setTramitacaoParaDesignar] = useState<any>(null);
  const [relatorSelecionado, setRelatorSelecionado] = useState("");

  // Modal de Assinatura
  const [showModalAssinar, setShowModalAssinar] = useState(false);
  const [tramitacaoParaAssinar, setTramitacaoParaAssinar] = useState<any>(null);
  const [tipoVotoAssinatura, setTipoVotoAssinatura] = useState("ACOMPANHA_RELATOR");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("legisdocs_user") || "{}");
      if (!user.tenantId) return;
      setUserContext(user);

      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // VERIFICAÇÃO DE SEGURANÇA: Módulo Comissões Ativo?
      const token = localStorage.getItem("legisdocs_token");
      const resTenant = await fetch(`${apiEnv}/tenant/${user.tenantId}`, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      if (resTenant.ok) {
        const tenantData = await resTenant.json();
        if (!tenantData.moduloComissoes) {
          alert("O Módulo de Comissões não está contratado/ativo para a sua instituição.");
          router.push("/painel");
          return;
        }
      }

      const resComissoes = await fetch(`${apiEnv}/comissoes/list/${user.tenantId}`);
      const comissoesData = await resComissoes.json();
      
      if (Array.isArray(comissoesData)) {
        setComissoes(comissoesData);
        if (comissoesData.length > 0 && !comissaoSelecionada) {
          setComissaoSelecionada(comissoesData[0].id);
        }
      } else {
        setComissoes([]);
      }

      const resKanban = await fetch(`${apiEnv}/comissoes/kanban/${user.tenantId}`);
      const tramitacoes = await resKanban.json();

      const novasColunas = {
        AGUARDANDO_DESPACHO: { ...colunasBase.AGUARDANDO_DESPACHO, items: [] },
        EM_ANALISE: { ...colunasBase.EM_ANALISE, items: [] },
        AGUARDANDO_VOTACAO: { ...colunasBase.AGUARDANDO_VOTACAO, items: [] },
        CONCLUIDO: { ...colunasBase.CONCLUIDO, items: [] },
      };
      
      if (Array.isArray(tramitacoes)) {
        tramitacoes.forEach((tramitacao: any) => {
          if (novasColunas[tramitacao.status as keyof typeof novasColunas]) {
            novasColunas[tramitacao.status as keyof typeof novasColunas].items.push(tramitacao as never);
          }
        });
      }

      setColunas(novasColunas);
    } catch (error) {
      console.error("Erro ao carregar Kanban:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserRoleNaComissao = (comissaoId: string) => {
    if (!userContext) return null;
    if (userContext.role === 'SUPER_ADMIN' || userContext.role === 'SECRETARIA') return 'ADMIN';
    const comissao = comissoes.find(c => c.id === comissaoId);
    if (!comissao) return null;
    
    const membroInfo = comissao.membros?.find((m: any) => m.userId === userContext.id);
    return membroInfo ? membroInfo.cargo : null; 
  };

  const comissaoAtualObj = comissoes.find(c => c.id === comissaoSelecionada);
  const roleLogado = getUserRoleNaComissao(comissaoSelecionada);

  // ================= AÇÕES =================

  const abrirModalDespacho = async () => {
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem("legisdocs_token");
      
      const res = await fetch(`${apiEnv}/document/aprovados-secretaria/${userContext.tenantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const docs = await res.json();
        setDocumentosDisponiveis(Array.isArray(docs) ? docs : []);
      }
      setFiltroDataDespacho("");
      setDocumentoSelecionado("");
      setComissaoAlvoDespacho(comissaoSelecionada || (comissoes[0]?.id || ""));
      setPrazoDespacho(15); 
      setShowModalDespacho(true);
    } catch (e) {
      console.error("Erro ao buscar documentos para despacho", e);
    }
  };

  const documentosFiltradosParaDespacho = documentosDisponiveis.filter(doc => {
    if (!filtroDataDespacho) return true;
    if (doc.createdAt) {
      return doc.createdAt.startsWith(filtroDataDespacho);
    }
    return doc.year?.toString() === filtroDataDespacho.split('-')[0];
  });

  const despacharProjeto = async () => {
    if (!documentoSelecionado || !comissaoAlvoDespacho) return;
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/comissoes/tramitacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: documentoSelecionado,
          comissaoId: comissaoAlvoDespacho,
          prazoDias: Number(prazoDespacho) 
        }),
      });
      setShowModalDespacho(false);
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const abrirModalDesignar = (item: any) => {
    setTramitacaoParaDesignar(item);
    setRelatorSelecionado("");
    setShowModalDesignar(true);
  };

  const confirmarDesignacaoRelator = async () => {
    if (!relatorSelecionado) return;
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/comissoes/tramitacao/${tramitacaoParaDesignar.id}/relator`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatorId: relatorSelecionado }),
      });
      setShowModalDesignar(false);
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const abrirModalDeParecer = (item: any) => {
    setTramitacaoAtiva(item);
    setTextoParecer(item.parecerFinal || "");
    setResultadoParecer(item.resultado || "FAVORÁVEL");
    setShowModalParecer(true);
  };

  const salvarParecer = async () => {
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/comissoes/tramitacao/${tramitacaoAtiva.id}/parecer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resultado: resultadoParecer,
          parecerFinal: textoParecer 
        }),
      });
      setShowModalParecer(false);
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const abrirModalLeitura = (item: any) => {
    setParecerEmLeitura(item);
    setShowModalLeitura(true);
  };

  const abrirModalAssinar = (item: any) => {
    setTramitacaoParaAssinar(item);
    setTipoVotoAssinatura("ACOMPANHA_RELATOR");
    setShowModalAssinar(true);
  };

  const confirmarAssinatura = async () => {
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/comissoes/tramitacao/${tramitacaoParaAssinar.id}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          vereadorId: userContext.id,
          tipoVoto: tipoVotoAssinatura
        }),
      });
      setShowModalAssinar(false);
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const baixarProjetoOriginal = (doc: any) => {
    if (doc?.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      alert("O arquivo PDF deste projeto ainda não foi anexado ao sistema pela Secretaria.");
    }
  };

  const baixarParecerPdf = (item: any) => {
    const assinaturasHtml = item.assinaturas && item.assinaturas.length > 0 
      ? item.assinaturas.map((a: any) => `
          <div style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 8px;">
            <strong>${a.user?.name || 'Membro'}</strong> - 
            <span style="color: ${a.tipoVoto === 'CONTRARIO' ? '#d9534f' : '#5cb85c'}; font-weight: bold;">
              ${a.tipoVoto === 'ACOMPANHA_RELATOR' ? 'Acompanha o Relator' : a.tipoVoto === 'CONTRARIO' ? 'Voto Contrário' : a.tipoVoto}
            </span>
            <br/><small style="color: #777;">Assinado digitalmente em ${new Date(a.createdAt || Date.now()).toLocaleDateString('pt-BR')}</small>
          </div>
        `).join('')
      : '<p style="color: #777; font-style: italic;">Nenhuma assinatura registrada até o momento.</p>';

    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(`
        <html>
          <head>
            <title>Parecer Técnico - ${item.document?.type} Nº ${item.document?.protocolNum}/${item.document?.year}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .voto-badge { display: inline-block; padding: 4px 10px; background: #eef2f7; border-radius: 4px; font-weight: bold; font-size: 14px; }
              .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>CÂMARA MUNICIPAL DE VEREADORES</h2>
              <h3>PARECER DA COMISSÃO DE TRÂMITE</h3>
            </div>
            <p><strong>Projeto:</strong> ${item.document?.type?.replace('_', ' ')} Nº ${item.document?.protocolNum}/${item.document?.year}</p>
            <p><strong>Ementa:</strong> ${item.document?.ementa}</p>
            <p><strong>Relator:</strong> ${item.relator?.name || 'Não informado'}</p>
            <p><strong>Voto do Relator:</strong> <span class="voto-badge">${item.resultado || 'FAVORÁVEL'}</span></p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <h3>Fundamentação Técnica:</h3>
            <p>${item.parecerFinal ? item.parecerFinal.replace(/\n/g, '<br>') : 'Nenhum texto redigido.'}</p>
            
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0 20px 0;" />
            <h3>Votos e Assinaturas dos Membros:</h3>
            <div style="margin-top: 10px;">
              ${assinaturasHtml}
            </div>

            <div class="footer">
              <p>Documento oficial gerado pelo sistema LegisDocs. Status atual: <strong>${item.status}</strong></p>
            </div>
          </body>
        </html>
      `);
      janela.document.close();
      janela.print();
    }
  };

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    if (roleLogado !== 'ADMIN' && roleLogado !== 'PRESIDENTE') {
      alert("Apenas a Secretaria ou o Presidente da comissão podem forçar a movimentação manual do card.");
      return;
    }

    const sourceCol = colunas[source.droppableId];
    const destCol = colunas[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = [...destCol.items];

    const [removido] = sourceItems.splice(source.index, 1);
    removido.status = destination.droppableId;
    destItems.splice(destination.index, 0, removido);

    setColunas({
      ...colunas,
      [source.droppableId]: { ...sourceCol, items: sourceItems },
      [destination.droppableId]: { ...destCol, items: destItems },
    });

    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiEnv}/comissoes/tramitacao/${draggableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destination.droppableId }),
      });
    } catch (error) {
      carregarDados(); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  if (loading || !userContext) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500 font-medium">A carregar painel de comissões...</div>;

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* 1. COMPONENTE SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 2. ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* CABEÇALHO SUPERIOR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-800">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex max-w-xl items-center w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar projetos nas comissões..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-4">
            <button className="relative text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{userContext.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{userContext.role?.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {userContext.name?.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
              
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-4 sm:p-6">
          
          {/* Breadcrumbs e Top Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/painel" className="hover:text-blue-600 transition-colors">Início</Link>
                <span>/</span>
                <span className="font-semibold text-gray-700">Central das Comissões</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20">
                  <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                Central das Comissões
              </h1>
              <p className="text-slate-500 font-medium mt-1 text-xs sm:text-sm flex flex-wrap items-center gap-2">
                Gerencie o fluxo de relatores e prazos legais dos projetos.
                {roleLogado && roleLogado !== 'ADMIN' && (
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-bold border border-indigo-200">
                    Seu perfil nesta comissão: {roleLogado.replace('_', ' ')}
                  </span>
                )}
                {roleLogado === 'ADMIN' && (
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-300">
                    Acesso Administrativo (Secretaria)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {roleLogado === 'ADMIN' && (
                <button 
                  onClick={abrirModalDespacho}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" /> Despachar Projeto p/ Comissão
                </button>
              )}

              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Comissão:</span>
                <select 
                  value={comissaoSelecionada}
                  onChange={(e) => setComissaoSelecionada(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-blue-700 font-bold text-xs sm:text-sm rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[180px] flex-1 sm:flex-initial"
                >
                  {comissoes.length === 0 && <option value="">Sem Comissões</option>}
                  {(Array.isArray(comissoes) ? comissoes : []).map(c => (
                    <option key={c.id} value={c.id}>{c.sigla} - {c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
              <div className="flex gap-5 h-full min-w-max px-1">
                
                {Object.values(colunas).map((coluna: any) => {
                  const Icone = coluna.icone;
                  const itensColuna = coluna.items.filter((i: any) => i.comissaoId === comissaoSelecionada);

                  return (
                    <div key={coluna.id} className="w-[320px] sm:w-[340px] flex flex-col h-full bg-slate-100/70 rounded-2xl border border-slate-200/80 shadow-sm flex-shrink-0">
                      
                      <div className={`px-4 py-3.5 bg-white rounded-t-2xl border-b border-slate-200 border-t-4 ${coluna.corBorda} flex justify-between items-center shadow-sm z-10 shrink-0`}>
                        <div className="flex items-center gap-2 text-slate-800">
                          <Icone className="w-4 h-4 opacity-70" />
                          <h3 className="font-bold text-xs uppercase tracking-wider">{coluna.titulo}</h3>
                        </div>
                        
                        <span className="bg-slate-100 text-slate-600 text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-200">
                          {itensColuna.length}
                        </span>
                      </div>

                      <Droppable droppableId={coluna.id} isDropDisabled={roleLogado !== 'ADMIN' && roleLogado !== 'PRESIDENTE'}>
                        {(provided, snapshot) => (
                          <div 
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`flex-1 p-3.5 overflow-y-auto transition-colors duration-200 ${
                              snapshot.isDraggingOver ? "bg-slate-200/80 ring-2 ring-inset ring-blue-300 rounded-b-2xl" : ""
                            }`}
                          >
                            {itensColuna.length === 0 && !snapshot.isDraggingOver && (
                              <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl mt-2 bg-slate-50/50">
                                <span className="text-xs font-semibold">Nenhum projeto</span>
                              </div>
                            )}

                            {itensColuna.map((item: any, index: number) => {
                              const isOProprioRelator = item.relatorId === userContext?.id;
                              
                              return (
                              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={roleLogado !== 'ADMIN' && roleLogado !== 'PRESIDENTE'}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white p-4 rounded-xl border border-slate-200 mb-3 transition-all ${
                                      snapshot.isDragging ? "shadow-2xl shadow-blue-900/10 rotate-2 scale-105 ring-2 ring-blue-500 cursor-grabbing" : "shadow-sm hover:border-blue-300"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2.5">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black tracking-widest text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-max uppercase">
                                          {item.document?.type?.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">
                                          Nº {item.document?.protocolNum}/{item.document?.year}
                                        </span>
                                      </div>
                                      <button 
                                        onClick={() => baixarProjetoOriginal(item.document)}
                                        title="Baixar Projeto Original em PDF"
                                        className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg border border-indigo-100 transition-colors"
                                      >
                                        <FileDown className="w-4 h-4" />
                                      </button>
                                    </div>
                                    
                                    <p className="text-xs sm:text-sm text-slate-800 font-semibold line-clamp-3 mb-3 leading-relaxed">
                                      {item.document?.ementa}
                                    </p>

                                    <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2.5">
                                      <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                          <UserCircle className="w-4 h-4" />
                                          <span className={isOProprioRelator ? "text-indigo-600 font-bold" : ""}>
                                            {item.relator?.name || "Sem relator designado"}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* AGUARDANDO DESPACHO */}
                                      {!item.relator && coluna.id === "AGUARDANDO_DESPACHO" && (roleLogado === 'PRESIDENTE' || roleLogado === 'ADMIN') && (
                                        <button onClick={() => abrirModalDesignar(item)} className="w-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                          <UserCog className="w-3.5 h-3.5" /> Designar Relator
                                        </button>
                                      )}

                                      {/* EM ANÁLISE */}
                                      {coluna.id === "EM_ANALISE" && (
                                        <div className="flex flex-col gap-2 w-full">
                                          <div className="flex items-center gap-1.5 text-orange-700 text-xs font-bold bg-orange-50 border border-orange-100 w-full justify-center py-1.5 rounded-md">
                                            <Clock className="w-3.5 h-3.5" /> Prazo: {item.prazoDias || 15} dias
                                          </div>
                                          
                                          {isOProprioRelator && (
                                            <button onClick={() => abrirModalDeParecer(item)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm">
                                              <Edit3 className="w-3.5 h-3.5" /> Redigir / Editar Parecer
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* AGUARDANDO VOTAÇÃO */}
                                      {coluna.id === "AGUARDANDO_VOTACAO" && (
                                        <div className="flex flex-col gap-2 w-full">
                                          <button onClick={() => abrirModalLeitura(item)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                            <Eye className="w-3.5 h-3.5 text-blue-600" /> Ler Parecer Emitido
                                          </button>

                                          {(roleLogado === 'PRESIDENTE' || roleLogado === 'RELATOR' || roleLogado === 'MEMBRO' || roleLogado === 'ADMIN') && (
                                            <button onClick={() => abrirModalAssinar(item)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm">
                                              <FileSignature className="w-3.5 h-3.5" /> Assinar / Votar
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* CONCLUÍDO */}
                                      {coluna.id === "CONCLUIDO" && (
                                        <div className="flex flex-col gap-2 w-full">
                                          <button onClick={() => abrirModalLeitura(item)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                            <Eye className="w-3.5 h-3.5 text-blue-600" /> Ler Parecer Concluído
                                          </button>
                                          <button onClick={() => baixarParecerPdf(item)} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            <Download className="w-3.5 h-3.5" /> Baixar Parecer com Votos
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            )})}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                    </div>
                  );
                })}

              </div>
            </div>
          </DragDropContext>

        </main>
      </div>

      {/* ======================= MODAIS ======================= */}

      {/* MODAL LER PARECER */}
      {showModalLeitura && parecerEmLeitura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" /> Leitura do Parecer Técnico
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-semibold">
              Projeto: {parecerEmLeitura.document?.type?.replace('_', ' ')} Nº {parecerEmLeitura.document?.protocolNum}/{parecerEmLeitura.document?.year}
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex justify-between text-xs font-bold text-slate-700">
              <span>Relator: {parecerEmLeitura.relator?.name || 'Não definido'}</span>
              <span className="text-blue-600 uppercase">Voto: {parecerEmLeitura.resultado || 'FAVORÁVEL'}</span>
              <span>Votos Registrados: {parecerEmLeitura.assinaturas?.length || 0}</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white border border-slate-200 p-4 rounded-xl text-sm text-slate-800 leading-relaxed whitespace-pre-wrap mb-4">
              {parecerEmLeitura.parecerFinal || "Nenhum texto de parecer redigido até o momento."}
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Votos dos Membros:</h4>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-32 overflow-y-auto flex flex-col gap-2">
                {(!parecerEmLeitura.assinaturas || parecerEmLeitura.assinaturas.length === 0) && (
                  <span className="text-xs text-slate-400 italic">Nenhum voto registrado ainda.</span>
                )}
                {parecerEmLeitura.assinaturas?.map((a: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                    <span className="font-bold text-slate-700">{a.user?.name || 'Membro'}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${a.tipoVoto === 'CONTRARIO' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {a.tipoVoto === 'ACOMPANHA_RELATOR' ? 'Acompanha o Relator' : a.tipoVoto}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {parecerEmLeitura.status === 'CONCLUIDO' && (
                <button onClick={() => baixarParecerPdf(parecerEmLeitura)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Baixar PDF com Votos
                </button>
              )}
              <button onClick={() => setShowModalLeitura(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESPACHAR PROJETO COM FILTRO */}
      {showModalDespacho && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-600" /> Despachar Projeto para Comissão
            </h3>
            <p className="text-sm text-slate-500 mb-4 font-medium">A Secretaria define qual comissão receberá o projeto, qual o projeto e o prazo regimental.</p>
            
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Filtro de Data (Mês/Ano)</label>
                <input 
                  type="month"
                  value={filtroDataDespacho}
                  onChange={e => setFiltroDataDespacho(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  title="Filtre para encontrar os projetos com mais facilidade"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">1. Selecione a Comissão de Destino</label>
                <select 
                  value={comissaoAlvoDespacho} 
                  onChange={e => setComissaoAlvoDespacho(e.target.value)} 
                  className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                >
                  {comissoes.map(c => (
                    <option key={c.id} value={c.id}>{c.sigla} - {c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">2. Selecione o Projeto de Lei / Documento</label>
                <select 
                  value={documentoSelecionado} 
                  onChange={e => setDocumentoSelecionado(e.target.value)} 
                  className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                >
                  <option value="">-- Escolha um Projeto --</option>
                  {documentosFiltradosParaDespacho.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.type.replace('_', ' ')} Nº {doc.protocolNum}/{doc.year}
                    </option>
                  ))}
                </select>
                {documentosFiltradosParaDespacho.length === 0 && (
                  <p className="text-xs text-red-500 mt-2 font-bold">Nenhum projeto encontrado para este período.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">3. Prazo para o Parecer (Dias)</label>
                <input 
                  type="number"
                  min="1"
                  value={prazoDespacho}
                  onChange={e => setPrazoDespacho(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModalDespacho(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Cancelar</button>
              <button 
                onClick={despacharProjeto} 
                disabled={!documentoSelecionado || !comissaoAlvoDespacho}
                className="flex-1 bg-blue-600 disabled:bg-blue-300 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg text-sm"
              >
                Encaminhar Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESIGNAR RELATOR */}
      {showModalDesignar && tramitacaoParaDesignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-600" /> Designar Relator
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Escolha qual membro da comissão será o responsável técnico por este projeto.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o Membro</label>
              <select 
                value={relatorSelecionado}
                onChange={e => setRelatorSelecionado(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm"
              >
                <option value="">-- Escolha um Relator --</option>
                {comissaoAtualObj?.membros?.map((m: any) => (
                  <option key={m.userId} value={m.userId}>{m.user?.name} ({m.cargo.replace('_', ' ')})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModalDesignar(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Cancelar</button>
              <button onClick={confirmarDesignacaoRelator} disabled={!relatorSelecionado} className="flex-1 bg-indigo-600 disabled:bg-indigo-300 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg text-sm">Confirmar Designação</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSINAR / VOTAR PARECER */}
      {showModalAssinar && tramitacaoParaAssinar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-emerald-600" /> Votar e Assinar Parecer
            </h3>
            <p className="text-sm text-slate-600 mb-4">Escolha o seu posicionamento em relação ao voto do relator:</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Posicionamento do Voto</label>
              <select 
                value={tipoVotoAssinatura}
                onChange={e => setTipoVotoAssinatura(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm"
              >
                <option value="ACOMPANHA_RELATOR">Acompanha o Relator (Favorável)</option>
                <option value="CONTRARIO">Voto Contrário (Rejeição ao Parecer)</option>
                <option value="COM_RESSALVAS">Acompanha com Ressalvas</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModalAssinar(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Cancelar</button>
              <button onClick={confirmarAssinatura} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg text-sm">Confirmar Voto e Assinar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMITIR PARECER */}
      {showModalParecer && tramitacaoAtiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" /> Emitir Parecer do Relator
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium line-clamp-2">Projeto: {tramitacaoAtiva.document.ementa}</p>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Resultado do Parecer</label>
                <select value={resultadoParecer} onChange={e => setResultadoParecer(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm">
                  <option value="FAVORÁVEL">Favorável à Aprovação</option>
                  <option value="CONTRÁRIO">Contrário (Pela Rejeição)</option>
                  <option value="COM_EMENDAS">Favorável com Emendas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fundamentação / Voto do Relator</label>
                <textarea 
                  value={textoParecer}
                  onChange={e => setTextoParecer(e.target.value)}
                  placeholder="Redija o texto do seu parecer técnico aqui..."
                  className="w-full p-4 rounded-lg border border-slate-300 h-40 resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModalParecer(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Cancelar</button>
              <button onClick={salvarParecer} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg text-sm">Finalizar Parecer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}