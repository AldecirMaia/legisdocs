"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserAuth {
  id: string;
  name: string;
  role: string;
  tenantId: string;
  [key: string]: unknown;
}

interface DocPauta {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  ementa: string;
  author?: { name: string; partido?: string };
  createdAt: string;
  updatedAt?: string;
}

interface PautaItem {
  id: string;
  type: string;
  numero: string;
  ementa: string;
  propositor: string;
  tramitacao: "LEITURA" | "VOTAÇÃO";
}

export default function PautaSessao() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  
  const [todosDocumentos, setTodosDocumentos] = useState<DocPauta[]>([]);
  const [itensPauta, setItensPauta] = useState<PautaItem[]>([]);
  
  const [config, setConfig] = useState<{ logoCabecalho: string; enderecoRodape: string; contatoRodape: string } | null>(null);
  
  const [loading, setLoading] = useState(true);

  const [dataSessao, setDataSessao] = useState(""); 
  const [nomeSessao, setNomeSessao] = useState("PAUTA DA 22ª SESSÃO ORDINÁRIA, DO 2º PERÍODO DE 2026 - 11ª LEGISLATURA");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [showAddManual, setShowAddManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PautaItem | null>(null);
  const [manualForm, setManualForm] = useState<PautaItem>({
    id: "", type: "PROJETO DE LEI", numero: "000/2026", ementa: "", propositor: "", tramitacao: "LEITURA"
  });

  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [dataImpressao, setDataImpressao] = useState("");

  useEffect(() => {
    setDataSessao(new Date().toLocaleDateString("pt-BR"));
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
    setUser(parsedUser);
    
    carregarPauta(parsedUser.tenantId);
    carregarConfiguracoes(parsedUser.tenantId);
  }, [router]);

  const carregarConfiguracoes = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          logoCabecalho: data.logoCabecalho || "",
          enderecoRodape: data.enderecoRodape || "",
          contatoRodape: data.contatoRodape || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do tenant:", error);
    }
  };

  const carregarPauta = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/aprovados/${tenantId}`);
      const data = await res.json();
      const docsValidos: DocPauta[] = Array.isArray(data) ? data : [];
      setTodosDocumentos(docsValidos);
      setItensPauta(docsValidos.map(formatToPautaItem));
    } catch (error) {
      console.error("Erro ao carregar pauta:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatToPautaItem = (doc: DocPauta): PautaItem => {
    const isExpediente = ["INDICACAO", "OFICIO", "MOCAO"].includes(doc.type);
    return {
      id: doc.id,
      type: doc.type.replace("_", " "),
      numero: `${String(doc.protocolNum).padStart(3, '0')}/${doc.year}`,
      ementa: doc.ementa,
      propositor: doc.author?.name || "N/A",
      tramitacao: isExpediente ? "LEITURA" : "VOTAÇÃO",
    };
  };

  const aplicarFiltroData = () => {
    if (!dataInicio || !dataFim) return alert("Por favor, preencha a Data Inicial e a Data Final.");
    const start = new Date(dataInicio + "T00:00:00").getTime();
    const end = new Date(dataFim + "T23:59:59").getTime();
    const filtrados = todosDocumentos.filter(doc => {
      const dateStr = doc.updatedAt || doc.createdAt;
      if (!dateStr) return true;
      const docTime = new Date(dateStr).getTime();
      return docTime >= start && docTime <= end;
    });
    setItensPauta(filtrados.map(formatToPautaItem));
  };

  const confirmRemove = (id: string) => setItemToRemove(id);
  const cancelRemove = () => setItemToRemove(null);
  const executeRemove = () => {
    if (itemToRemove) {
      setItensPauta(prev => prev.filter(item => item.id !== itemToRemove));
      setItemToRemove(null);
    }
  };

  const adicionarManual = () => {
    if (!manualForm.ementa.trim()) return alert("A ementa/resumo é obrigatória.");
    const novoItem: PautaItem = { ...manualForm, id: "manual-" + Date.now() };
    setItensPauta(prev => [...prev, novoItem]);
    setShowAddManual(false);
    setManualForm({ id: "", type: "PROJETO DE LEI", numero: "000/2026", ementa: "", propositor: "", tramitacao: "LEITURA" });
  };

  const salvarEdicao = () => {
    if (!editForm) return;
    setItensPauta(prev => prev.map(item => item.id === editForm.id ? editForm : item));
    setEditingId(null);
  };

  const handleImprimir = () => {
    const agora = new Date();
    const formatada = `${agora.toLocaleDateString("pt-BR")}, ${agora.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}`;
    setDataImpressao(formatada);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const expediente = itensPauta.filter(i => i.tramitacao === "LEITURA");
  const ordemDia = itensPauta.filter(i => i.tramitacao === "VOTAÇÃO");

  if (!user) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div lang="pt-BR" className="min-h-screen bg-gray-50 print:bg-white flex flex-col pb-10">
      
      {itemToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remover Documento</h3>
            <p className="text-gray-600 text-sm mb-6">Tem a certeza que deseja remover este documento da pauta de hoje?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={cancelRemove} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors">Cancelar</button>
              <button onClick={executeRemove} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Exclusivo para Impressão - Fundos brancos e margens reduzidas para 10mm */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 10mm 10mm; size: A4 portrait; }
          body, html, .min-h-screen { 
            background-color: #ffffff !important; 
            color: #000000 !important; 
            font-family: Arial, Helvetica, sans-serif !important; 
          }
          .bg-gray-50 { background-color: #ffffff !important; }
          
          .no-print { display: none !important; }
          .print-only { display: block !important; width: 100%; margin: 0; padding: 0; }
          
          .page-break-avoid { page-break-inside: avoid; break-inside: avoid; margin-bottom: 16px; }
          
          .print-text-sm { 
            font-size: 10.5pt !important; 
            line-height: 1.25 !important; 
            text-align: justify; 
            word-wrap: break-word !important; 
            overflow-wrap: break-word !important; 
          }
          
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}} />

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold tracking-tight">LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Construtor de Pauta</span></h1>
        <Link href="/painel" className="text-blue-200 hover:text-white font-semibold transition-colors">Voltar ao Painel</Link>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full no-print">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Construtor de Pauta</h2>
            <p className="text-gray-600 mt-1">Filtre por datas, remova, edite ou adicione itens manualmente antes de imprimir.</p>
          </div>
          <button onClick={handleImprimir} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2">
            🖨️ Imprimir Pauta Oficial
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4">1. Período e Cabeçalho</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data Inicial (Aprovação)</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data Final (Aprovação)</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-end"><button onClick={aplicarFiltroData} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">🔍 Buscar Período</button></div>
            <div className="flex items-end"><button onClick={() => setItensPauta(todosDocumentos.map(formatToPautaItem))} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg transition-colors">🔄 Mostrar Todos</button></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Título da Pauta (Visível no PDF)</label>
              <input type="text" value={nomeSessao} onChange={(e) => setNomeSessao(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 outline-none uppercase font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data da Sessão (Visível no PDF)</label>
              <input type="text" value={dataSessao} onChange={(e) => setDataSessao(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 outline-none font-semibold text-center" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
            <h3 className="font-bold text-gray-800">2. Itens Presentes na Pauta ({itensPauta.length})</h3>
            <button onClick={() => setShowAddManual(!showAddManual)} className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors">+ Adicionar Manual</button>
          </div>

          {showAddManual && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6 animate-in slide-in-from-top-4">
              <h4 className="font-bold text-purple-900 mb-3 text-sm">Adicionar Item Manual</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Tipo</label><input type="text" value={manualForm.type} onChange={(e) => setManualForm({...manualForm, type: e.target.value.toUpperCase()})} placeholder="Ex: PARECER" className="w-full border border-purple-300 rounded p-2 text-sm text-gray-900 outline-none" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Número/Ano</label><input type="text" value={manualForm.numero} onChange={(e) => setManualForm({...manualForm, numero: e.target.value})} placeholder="Ex: 001/2026" className="w-full border border-purple-300 rounded p-2 text-sm text-gray-900 outline-none" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Autor</label><input type="text" value={manualForm.propositor} onChange={(e) => setManualForm({...manualForm, propositor: e.target.value.toUpperCase()})} placeholder="Nome do Autor" className="w-full border border-purple-300 rounded p-2 text-sm text-gray-900 outline-none" /></div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tramitação</label>
                  <select value={manualForm.tramitacao} onChange={(e) => setManualForm({...manualForm, tramitacao: e.target.value as "LEITURA" | "VOTAÇÃO"})} className="w-full border border-purple-300 rounded p-2 text-sm text-gray-900 outline-none">
                    <option value="LEITURA">LEITURA (Expediente)</option><option value="VOTAÇÃO">VOTAÇÃO (Ordem Dia)</option>
                  </select>
                </div>
              </div>
              <div className="mb-3"><label className="block text-xs font-bold text-gray-700 mb-1">Ementa / Resumo</label><textarea rows={2} value={manualForm.ementa} onChange={(e) => setManualForm({...manualForm, ementa: e.target.value})} className="w-full border border-purple-300 rounded p-2 text-sm text-gray-900 outline-none" placeholder="Resumo do pedido..."></textarea></div>
              <button onClick={adicionarManual} className="bg-purple-700 text-white font-bold py-2 px-6 rounded shadow-sm hover:bg-purple-800 transition-colors text-sm">Salvar Item Manual</button>
            </div>
          )}

          <div className="space-y-4">
            {loading ? (<p className="text-center text-gray-500 py-4">A carregar...</p>) : itensPauta.length === 0 ? (<p className="text-center text-gray-500 py-4">Nenhum documento na pauta.</p>) : (
              itensPauta.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  {editingId === item.id && editForm ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in">
                      <div className="md:col-span-1"><input type="text" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value.toUpperCase()})} className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 mb-2" /></div>
                      <div className="md:col-span-1"><input type="text" value={editForm.numero} onChange={(e) => setEditForm({...editForm, numero: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 mb-2" /></div>
                      <div className="md:col-span-1"><input type="text" value={editForm.propositor} onChange={(e) => setEditForm({...editForm, propositor: e.target.value.toUpperCase()})} className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 mb-2" /></div>
                      <div className="md:col-span-1">
                        <select value={editForm.tramitacao} onChange={(e) => setEditForm({...editForm, tramitacao: e.target.value as "LEITURA"|"VOTAÇÃO"})} className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 mb-2">
                          <option value="LEITURA">LEITURA (Expediente)</option><option value="VOTAÇÃO">VOTAÇÃO (Ordem Dia)</option>
                        </select>
                      </div>
                      <div className="md:col-span-4"><textarea rows={2} value={editForm.ementa} onChange={(e) => setEditForm({...editForm, ementa: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 mb-2" /></div>
                      <div className="md:col-span-4 flex gap-2">
                        <button onClick={salvarEdicao} className="bg-green-600 text-white font-bold py-1.5 px-4 rounded text-sm hover:bg-green-700">💾 Guardar</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white font-bold py-1.5 px-4 rounded text-sm hover:bg-gray-500">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800 text-sm">{index + 1}º) {item.type} Nº {item.numero}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${item.tramitacao === 'LEITURA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{item.tramitacao}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1"><strong>Autor:</strong> {item.propositor}</p>
                        <p className="text-sm text-gray-600 line-clamp-2 italic">"{item.ementa}"</p>
                      </div>
                      <div className="flex flex-row sm:flex-col gap-2 justify-center">
                        <button onClick={() => { setEditingId(item.id); setEditForm(item); }} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-200 font-bold py-1.5 px-3 rounded text-xs shadow-sm w-full">✏️ Alterar</button>
                        <button onClick={() => confirmRemove(item.id)} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold py-1.5 px-3 rounded text-xs shadow-sm w-full">🗑️ Remover</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ========================================== */}
      {/* ÁREA DE IMPRESSÃO (Oculta na Tela, Visível no Papel) */}
      {/* ========================================== */}
      <div className="print-only">
        
        <table className="w-full font-sans">
          <thead>
            <tr>
              <td>
                <div className="w-full mb-6">
                  
                  <div className="flex justify-between items-center text-[9pt] text-gray-800 mb-4">
                    <span>{dataImpressao}</span>
                    <span>LegisDocs - Sistema de Gestão Legislativa</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center mb-4">
                    {config?.logoCabecalho ? (
                      <img 
                        src={config.logoCabecalho} 
                        alt="Logo Câmara" 
                        className="h-20 object-contain mb-2" 
                      />
                    ) : (
                      <h1 className="font-bold text-[14pt] uppercase tracking-wide text-center">CÂMARA MUNICIPAL</h1>
                    )}
                  </div>
                  
                  <hr className="border-t-[1.5px] border-black mb-4" />
                  
                  <div className="text-center">
                    <p className="font-normal text-[12pt] uppercase">{dataSessao}.</p>
                    <h2 className="font-normal text-[12pt] uppercase max-w-3xl mx-auto mt-1">{nomeSessao}.</h2>
                  </div>
                  
                </div>
              </td>
            </tr>
          </thead>

          <tfoot>
            <tr>
              <td>
                <div className="border-t-[1.5px] border-black mt-4 pt-1 text-[8pt] text-center text-black whitespace-pre-wrap">
                  <p>{config?.enderecoRodape || "RUA HORTO FLORESTAL, 506, CENTRO, BARAÚNA - RN. | CEP: 59695-000"}</p>
                  <p>{config?.contatoRodape || "e-mail: camara@barauna.rn.leg.br | Site: barauna.rn.leg.br\nFone: (84) 3191-9495 - CNPJ: 08.546.178/0001-44"}</p>
                </div>
              </td>
            </tr>
          </tfoot>

          <tbody>
            <tr>
              <td>
                {expediente.length > 0 && (
                  <div className="mb-6">
                    <div className="border border-black py-2 mb-4 w-full text-center">
                      <h3 className="font-normal text-[11pt] uppercase tracking-wide m-0">LEITURA DO EXPEDIENTE</h3>
                    </div>
                    <div>
                      {expediente.map((doc, index) => (
                        <div key={doc.id} className="page-break-avoid print-text-sm">
                          <p className="font-bold mb-0.5">{index + 1}°) {doc.type} N° {doc.numero}.</p>
                          <p className="mb-0.5">Propositor: {doc.propositor.toUpperCase()}. Tramitação: {doc.tramitacao.toUpperCase()}</p>
                          <p className="uppercase">RESUMO: {doc.ementa.toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ordemDia.length > 0 && (
                  <div>
                    <div className="border border-black py-2 mb-4 mt-6 w-full text-center">
                      <h3 className="font-normal text-[11pt] uppercase tracking-wide m-0">ORDEM DO DIA</h3>
                    </div>
                    <div>
                      {ordemDia.map((doc, index) => (
                        <div key={doc.id} className="page-break-avoid print-text-sm">
                          <p className="font-bold mb-0.5">{index + 1}°) {doc.type} N° {doc.numero}.</p>
                          <p className="mb-0.5">Propositor: {doc.propositor.toUpperCase()}. Tramitação: {doc.tramitacao.toUpperCase()}</p>
                          <p className="uppercase">RESUMO: {doc.ementa.toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}