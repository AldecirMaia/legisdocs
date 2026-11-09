"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { LayoutGrid, Clock, UserCircle, Filter, Inbox, UserCog, Gavel, CheckCircle2, ArrowLeft, FileSignature, Edit3, CheckSquare, Plus, Eye, Download, FileDown } from "lucide-react";
import Link from "next/link";

const colunasBase = {
  AGUARDANDO_DESPACHO: { id: "AGUARDANDO_DESPACHO", titulo: "Aguardando Despacho", corBorda: "border-t-slate-500", icone: Inbox, items: [] },
  EM_ANALISE: { id: "EM_ANALISE", titulo: "Em Análise", corBorda: "border-t-blue-500", icone: UserCog, items: [] },
  AGUARDANDO_VOTACAO: { id: "AGUARDANDO_VOTACAO", titulo: "Aguardando Votação", corBorda: "border-t-amber-500", icone: Gavel, items: [] },
  CONCLUIDO: { id: "CONCLUIDO", titulo: "Parecer Concluído", corBorda: "border-t-emerald-500", icone: CheckCircle2, items: [] },
};

export default function KanbanComissoes() {
  const [colunas, setColunas] = useState<any>(colunasBase);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [comissaoSelecionada, setComissaoSelecionada] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);

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
  const [filtroDataDespacho, setFiltroDataDespacho] = useState(""); // NOVO: Filtro de data
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
      setFiltroDataDespacho(""); // Reseta o filtro ao abrir
      setDocumentoSelecionado("");
      setComissaoAlvoDespacho(comissaoSelecionada || (comissoes[0]?.id || ""));
      setPrazoDespacho(15); 
      setShowModalDespacho(true);
    } catch (e) {
      console.error("Erro ao buscar documentos para despacho", e);
    }
  };

  // Filtragem local baseada no input type="month"
  const documentosFiltradosParaDespacho = documentosDisponiveis.filter(doc => {
    if (!filtroDataDespacho) return true;
    
    // Se a data de criação existir (ex: 2026-10-15T...), filtramos por ela. 
    // Se não, fazemos um fallback pro campo 'year' do documento.
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

  // NOVO: Função para baixar/visualizar o PDF original do Projeto de Lei
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

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-500 font-medium">A carregar painel de comissões...</div>;

  return (
    <div className="p-8 h-[calc(100vh-80px)] flex flex-col bg-slate-50">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/painel" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
              <LayoutGrid className="w-6 h-6" />
            </div>
            Central das Comissões
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-sm flex items-center gap-2">
            Gerencie o fluxo de relatores e prazos legais dos projetos.
            {roleLogado && roleLogado !== 'ADMIN' && (
              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-bold border border-indigo-200">
                O seu perfil nesta comissão: {roleLogado.replace('_', ' ')}
              </span>
            )}
            {roleLogado === 'ADMIN' && (
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-300">
                Acesso Administrativo (Secretaria)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {roleLogado === 'ADMIN' && (
            <button 
              onClick={abrirModalDespacho}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Despachar Projeto p/ Comissão
            </button>
          )}

          <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Comissão:</span>
            <select 
              value={comissaoSelecionada}
              onChange={(e) => setComissaoSelecionada(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-blue-700 font-bold text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[200px]"
            >
              {comissoes.length === 0 && <option value="">Sem Comissões</option>}
              {(Array.isArray(comissoes) ? comissoes : []).map(c => (
                <option key={c.id} value={c.id}>{c.sigla} - {c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-6 h-full min-w-max px-1">
            
            {Object.values(colunas).map((coluna: any) => {
              const Icone = coluna.icone;
              const itensColuna = coluna.items.filter((i: any) => i.comissaoId === comissaoSelecionada);

              return (
                <div key={coluna.id} className="w-[340px] flex flex-col h-[75vh] max-h-[800px] bg-slate-100/60 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
                  
                  <div className={`px-5 py-4 bg-white rounded-t-2xl border-b border-slate-200 border-t-4 ${coluna.corBorda} flex justify-between items-center shadow-sm z-10`}>
                    <div className="flex items-center gap-2 text-slate-800">
                      <Icone className="w-5 h-5 opacity-70" />
                      <h3 className="font-bold text-sm uppercase tracking-wider">{coluna.titulo}</h3>
                    </div>
                    
                    <span className="bg-slate-100 text-slate-600 text-xs font-black px-2.5 py-1 rounded-full border border-slate-200">
                      {itensColuna.length}
                    </span>
                  </div>

                  <Droppable droppableId={coluna.id} isDropDisabled={roleLogado !== 'ADMIN' && roleLogado !== 'PRESIDENTE'}>
                    {(provided, snapshot) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 p-4 overflow-y-auto transition-colors duration-200 ${
                          snapshot.isDraggingOver ? "bg-slate-200/80 ring-2 ring-inset ring-blue-300 rounded-b-2xl" : ""
                        }`}
                      >
                        {itensColuna.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl mt-2 bg-slate-50/50">
                            <span className="text-sm font-semibold">Nenhum projeto</span>
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
                                className={`bg-white p-5 rounded-xl border border-slate-200 mb-3 transition-all ${
                                  snapshot.isDragging ? "shadow-2xl shadow-blue-900/10 rotate-2 scale-105 ring-2 ring-blue-500 cursor-grabbing" : "shadow-sm hover:border-blue-400"
                                }`}
                              >
                                {/* CABEÇALHO DO CARD COM BOTÃO DE VER PROJETO ORIGINAL */}
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black tracking-widest text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-max">
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
                                
                                <p className="text-sm text-slate-800 font-semibold line-clamp-3 mb-4 leading-relaxed">
                                  {item.document?.ementa}
                                </p>

                                <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
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
                                      <div className="flex items-center gap-1.5 text-orange-700 text-xs font-bold bg-orange-50 border border-orange-100 w-full justify-center py-2 rounded-md">
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
              
              {/* CAMPO NOVO: FILTRO DE DATA */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Filtro de Data (Mês/Ano)</label>
                <input 
                  type="month"
                  value={filtroDataDespacho}
                  onChange={e => setFiltroDataDespacho(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-white"
                  title="Filtre para encontrar os projetos com mais facilidade"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">1. Selecione a Comissão de Destino</label>
                <select 
                  value={comissaoAlvoDespacho} 
                  onChange={e => setComissaoAlvoDespacho(e.target.value)} 
                  className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
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
                  className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
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
                  className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModalDespacho(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
              <button 
                onClick={despacharProjeto} 
                disabled={!documentoSelecionado || !comissaoAlvoDespacho}
                className="flex-1 bg-blue-600 disabled:bg-blue-300 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
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
                className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              >
                <option value="">-- Escolha um Relator --</option>
                {comissaoAtualObj?.membros?.map((m: any) => (
                  <option key={m.userId} value={m.userId}>{m.user?.name} ({m.cargo.replace('_', ' ')})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModalDesignar(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmarDesignacaoRelator} disabled={!relatorSelecionado} className="flex-1 bg-indigo-600 disabled:bg-indigo-300 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg">Confirmar Designação</button>
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
                className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              >
                <option value="ACOMPANHA_RELATOR">Acompanha o Relator (Favorável)</option>
                <option value="CONTRARIO">Voto Contrário (Rejeição ao Parecer)</option>
                <option value="COM_RESSALVAS">Acompanha com Ressalvas</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModalAssinar(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmarAssinatura} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg">Confirmar Voto e Assinar</button>
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
                <select value={resultadoParecer} onChange={e => setResultadoParecer(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50">
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
                  className="w-full p-4 rounded-lg border border-slate-300 h-40 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModalParecer(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
              <button onClick={salvarParecer} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg">Finalizar Parecer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}