"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  AlertTriangle, CheckCircle, X, Info, XCircle, Search, 
  Bell, ChevronDown, Menu, LogOut, Plus, Trash2, Edit3, Printer, Send, Vote, FileText
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

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
  gabinete?: { 
    name: string;
    users?: { name: string; role: string }[];
  };
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
  regime?: "NORMAL" | "URGENCIA";
  fase?: "LEITURA" | "1_VOTACAO" | "2_VOTACAO" | "LEITURA_VOTACAO_UNICA";
  turnoVotacao?: string;
}

export default function PautaSessao() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [todosDocumentos, setTodosDocumentos] = useState<DocPauta[]>([]);
  const [itensPauta, setItensPauta] = useState<PautaItem[]>([]);
  const [config, setConfig] = useState<{ logoCabecalho: string; enderecoRodape: string; contatoRodape: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [dataSessao, setDataSessao] = useState(""); 
  const [nomeSessao, setNomeSessao] = useState("PAUTA DA 22ª SESSÃO ORDINÁRIA, DO 2º PERÍODO DE 2026 - 11ª LEGISLATURA");
  const [numeroSessao, setNumeroSessao] = useState("22");
  const [tipoSessao, setTipoSessao] = useState("Ordinária");
  const [periodoSessao, setPeriodoSessao] = useState("2º período");
  const [legislatura, setLegislatura] = useState("11");
  const [horarioSessao, setHorarioSessao] = useState("18:00");

  const [showAddManual, setShowAddManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PautaItem | null>(null);
  const [manualForm, setManualForm] = useState<PautaItem>({
    id: "", type: "PROJETO_LEI_LEGISLATIVO", numero: "", ementa: "", propositor: "", tramitacao: "LEITURA", regime: "NORMAL", fase: "LEITURA", turnoVotacao: ""
  });

  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [dataImpressao, setDataImpressao] = useState("");
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [itensParaTurno, setItensParaTurno] = useState<PautaItem[]>([]);
  const [alertConfig, setAlertConfig] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  const [showConfirmEnviar, setShowConfirmEnviar] = useState(false);

  const [buscaDoc, setBuscaDoc] = useState("");
  const [filtroTipoDoc, setFiltroTipoDoc] = useState("Todos");

  const showAlert = (message: string, type: 'success' | 'error' | 'warning') => {
    setAlertConfig({ show: true, message, type });
  };

  const isProjetoLei = (tipo: string) => {
    const t = tipo.toUpperCase();
    return t.includes("LEI") || t.includes("EMENDA");
  };

  const formatToPautaItem = (doc: DocPauta): PautaItem => {
    let typeFormatted = doc.type.replace(/_/g, " ");
    if (doc.type === "PROJETO_LEI_EXECUTIVO") typeFormatted = "PROJETO DE LEI (PREFEITURA)";
    if (doc.type === "PROJETO_LEI_LEGISLATIVO") typeFormatted = "PROJETO DE LEI (VEREADOR)";

    const isExpediente = ["INDICACAO", "OFICIO", "MOCAO"].includes(doc.type);
    const isLei = isProjetoLei(typeFormatted);
    
    const vereador = doc.gabinete?.users?.find(u => u.role === "VEREADOR");
    const nomeGabineteFormatado = doc.gabinete?.name?.replace(/^Gabinete (do|da|de)?\s*/i, '');
    let nomePropositor = vereador?.name || nomeGabineteFormatado || doc.author?.name || "N/A";
    
    if (doc.type === "PROJETO_LEI_EXECUTIVO") {
        nomePropositor = "PODER EXECUTIVO (PREFEITURA)";
    }

    return {
      id: doc.id,
      type: typeFormatted,
      numero: `${String(doc.protocolNum).padStart(3, '0')}/${doc.year}`,
      ementa: doc.ementa,
      propositor: nomePropositor,
      tramitacao: isExpediente || isLei ? "LEITURA" : "VOTAÇÃO",
      ...(isLei && { regime: "NORMAL", fase: "LEITURA" })
    };
  };

  const calcularProximoNumero = (tipoSelecionado: string) => {
    const anoAtual = new Date().getFullYear();
    const docsDoTipo = todosDocumentos.filter(doc => doc.type === tipoSelecionado && doc.year === anoAtual);
    if (docsDoTipo.length === 0) return `001/${anoAtual}`;
    const maiorNumero = Math.max(...docsDoTipo.map(doc => doc.protocolNum));
    return `${String(maiorNumero + 1).padStart(3, '0')}/${anoAtual}`;
  };

  const carregarConfiguracoes = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig({ logoCabecalho: data.logoCabecalho || "", enderecoRodape: data.enderecoRodape || "", contatoRodape: data.contatoRodape || "" });
      }
    } catch (error) { console.error(error); }
  };

  const carregarPauta = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/aprovados/${tenantId}`);
      const data = await res.json();
      setTodosDocumentos(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => {
    const iniciar = async () => {
      setDataSessao(new Date().toLocaleDateString("pt-BR"));
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
      setUser(parsedUser);
      await carregarPauta(parsedUser.tenantId);
      carregarConfiguracoes(parsedUser.tenantId);
    };
    iniciar();
  }, [router]);

  useEffect(() => {
    if (!loading && todosDocumentos.length > 0) {
      setManualForm(prev => ({ ...prev, numero: calcularProximoNumero(prev.type) }));
    }
  }, [loading, todosDocumentos]);

  useEffect(() => {
    if (dataSessao) {
      setNomeSessao(`PAUTA DA ${numeroSessao}ª SESSÃO ${tipoSessao.toUpperCase()}, DO ${periodoSessao.toUpperCase()} DE ${dataSessao.split('/').pop()} - ${legislatura}ª LEGISLATURA`);
    }
  }, [numeroSessao, tipoSessao, periodoSessao, legislatura, dataSessao]);

  const confirmRemove = (id: string) => setItemToRemove(id);
  const cancelRemove = () => setItemToRemove(null);
  const executeRemove = () => {
    if (itemToRemove) {
      setItensPauta(prev => prev.filter(item => item.id !== itemToRemove));
      setItemToRemove(null);
    }
  };

  const adicionarManual = async () => {
    if (!manualForm.ementa.trim()) return showAlert("A ementa/resumo é obrigatória.", "warning");
    if (manualForm.tramitacao === "VOTAÇÃO" && !manualForm.turnoVotacao) return showAlert("Selecione o Turno da Votação.", "warning");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/create-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: manualForm.type, ementa: manualForm.ementa, propositorManual: manualForm.propositor,
          tenantId: user?.tenantId, gabineteId: user?.gabineteId, authorId: user?.id,
        })
      });

      if (res.ok) {
        const docCriado = await res.json();
        let displayType = docCriado.type.replace(/_/g, " ");
        if (docCriado.type === "PROJETO_LEI_EXECUTIVO") displayType = "PROJETO DE LEI (PREFEITURA)";
        if (docCriado.type === "PROJETO_LEI_LEGISLATIVO") displayType = "PROJETO DE LEI (VEREADOR)";

        const novoItem: PautaItem = { 
          id: docCriado.id, type: displayType, numero: `${String(docCriado.protocolNum).padStart(3, '0')}/${docCriado.year}`, 
          ementa: docCriado.ementa, propositor: manualForm.propositor || "Mesa Diretora", tramitacao: manualForm.tramitacao, 
          regime: "NORMAL", fase: "LEITURA", turnoVotacao: manualForm.turnoVotacao 
        };
        
        setItensPauta(prev => [...prev, novoItem]);
        setShowAddManual(false);
        carregarPauta(user!.tenantId);
        setManualForm({ id: "", type: "PROJETO_LEI_LEGISLATIVO", numero: "", ementa: "", propositor: "", tramitacao: "LEITURA", regime: "NORMAL", fase: "LEITURA", turnoVotacao: "" });
        showAlert("Documento oficializado com sucesso!", "success");
      } else { showAlert("Erro ao oficializar documento.", "error"); }
    } catch (err) { console.error(err); showAlert("Erro de conexão.", "error"); }
  };

  const salvarEdicao = () => {
    if (!editForm) return;
    if (editForm.tramitacao === "VOTAÇÃO" && !editForm.turnoVotacao) return showAlert("Selecione o Turno da Votação.", "warning");
    const formFinal = editForm.tramitacao === "LEITURA" ? { ...editForm, turnoVotacao: "" } : editForm;
    setItensPauta(prev => prev.map(item => item.id === editForm.id ? formFinal : item));
    setEditingId(null);
  };

  const enviarParaPlenario = async () => {
    if (itensPauta.length === 0) return showAlert("A pauta está vazia.", "warning");
    const pendentes = itensPauta.filter(i => i.tramitacao === "VOTAÇÃO" && !i.turnoVotacao);
    if (pendentes.length > 0) return showAlert("Defina o turno de votação de todos os projetos da Ordem do Dia.", "warning");
    setShowConfirmEnviar(true);
  };

  const executarEnvioPauta = async () => {
    setShowConfirmEnviar(false);
    setEnviando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pauta/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: user?.tenantId, nomeSessao, dataSessao, itens: itensPauta })
      });
      if (res.ok) showAlert("Pauta enviada para o Plenário!", "success");
      else throw new Error();
    } catch (error) { console.error(error); showAlert("Erro ao enviar pauta.", "error"); } finally { setEnviando(false); }
  };

  const iniciarImpressao = () => {
    const votacoes = itensPauta.filter(i => i.tramitacao === "VOTAÇÃO");
    if (votacoes.length > 0 && votacoes.some(v => !v.turnoVotacao)) {
      setItensParaTurno(votacoes);
      setShowTurnoModal(true);
    } else { executarImpressao(); }
  };

  const executarImpressao = () => {
    const agora = new Date();
    setDataImpressao(`${agora.toLocaleDateString("pt-BR")}, ${agora.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}`);
    setTimeout(() => window.print(), 150);
  };

  const adicionarItemDaBiblioteca = (doc: DocPauta) => {
    if (itensPauta.some(item => item.id === doc.id)) return showAlert("Este documento já está na pauta.", "warning");
    setItensPauta(prev => [...prev, formatToPautaItem(doc)]);
  };

  const adicionarTodosFiltrados = () => {
    const novosItens = documentosFiltradosBiblioteca.filter(doc => !itensPauta.some(p => p.id === doc.id));
    if (novosItens.length === 0) return showAlert("Todos os documentos já estão na pauta.", "warning");
    setItensPauta(prev => [...prev, ...novosItens.map(formatToPautaItem)]);
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const expediente = itensPauta.filter(i => i.tramitacao === "LEITURA");
  const ordemDia = itensPauta.filter(i => i.tramitacao === "VOTAÇÃO");

  const documentosFiltradosBiblioteca = todosDocumentos.filter(doc => {
    const matchBusca = (doc.protocolNum?.toString().includes(buscaDoc) || doc.ementa?.toLowerCase().includes(buscaDoc.toLowerCase()) || (doc.author?.name || doc.gabinete?.name || "").toLowerCase().includes(buscaDoc.toLowerCase()));
    const matchTipo = filtroTipoDoc === "Todos" || doc.type === filtroTipoDoc;
    return matchBusca && matchTipo;
  }).sort((a, b) => {
    const aNaPauta = itensPauta.some(p => p.id === a.id);
    const bNaPauta = itensPauta.some(p => p.id === b.id);
    if (aNaPauta && !bNaPauta) return 1;
    if (!aNaPauta && bNaPauta) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar interface...</div>;

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans print:bg-white">
      
      {alertConfig.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex flex-col items-center text-center">
              {alertConfig.type === 'success' && <CheckCircle className="w-16 h-16 text-green-500 mb-4" />}
              {alertConfig.type === 'warning' && <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />}
              {alertConfig.type === 'error' && <XCircle className="w-16 h-16 text-red-500 mb-4" />}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{alertConfig.type === 'success' ? 'Sucesso!' : alertConfig.type === 'warning' ? 'Atenção' : 'Erro'}</h3>
              <p className="text-gray-600 mb-6">{alertConfig.message}</p>
              <button onClick={() => setAlertConfig({ ...alertConfig, show: false })} className="w-full font-bold py-3 rounded-xl bg-gray-800 text-white">OK</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmEnviar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[140] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Travar Pauta Oficial?</h3>
            <p className="text-gray-600 mb-8">Tem a certeza que deseja Travar e Enviar esta pauta para o Plenário?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmEnviar(false)} className="flex-1 bg-gray-100 text-gray-800 font-bold py-3.5 rounded-xl">Cancelar</button>
              <button onClick={executarEnvioPauta} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl">Sim, Enviar</button>
            </div>
          </div>
        </div>
      )}

      {showTurnoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Definir Turnos de Votação</h3>
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
              {itensParaTurno.map(item => (
                <div key={item.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50 flex justify-between items-center">
                  <div><p className="font-bold text-sm text-gray-800">{item.type} Nº {item.numero}</p></div>
                  <select
                    className="border border-blue-300 rounded-lg p-2 text-sm font-bold text-blue-900 bg-white"
                    value={item.turnoVotacao || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItensParaTurno(prev => prev.map(i => i.id === item.id ? { ...i, turnoVotacao: val } : i));
                      setItensPauta(prev => prev.map(i => i.id === item.id ? { ...i, turnoVotacao: val } : i));
                    }}
                  >
                    <option value="">Selecione...</option>
                    <option value="Votação Única">Votação Única</option>
                    <option value="1ª Votação">1ª Votação</option>
                    <option value="2ª Votação">2ª Votação</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button onClick={() => setShowTurnoModal(false)} className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-bold">Cancelar</button>
              <button onClick={() => { setShowTurnoModal(false); executarImpressao(); }} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold">Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {itemToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remover Documento</h3>
            <p className="text-gray-600 text-sm mb-8">Tem a certeza que deseja remover?</p>
            <div className="flex gap-3">
              <button onClick={cancelRemove} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancelar</button>
              <button onClick={executeRemove} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Remover</button>
            </div>
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0 no-print">
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

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 no-print">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Link href="/painel" className="hover:text-blue-600">Início</Link><span>/</span><span className="font-semibold text-gray-700">Pauta da Sessão</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Construtor de Pauta</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={iniciarImpressao} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimir</button>
                <button onClick={enviarParaPlenario} disabled={enviando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /> {enviando ? "A enviar..." : "Enviar Pauta"}</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Dados da Sessão <span className="text-xs font-normal text-gray-500 ml-2">Aparecem no cabeçalho do PDF</span></h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nº da sessão</label><input type="text" value={numeroSessao} onChange={e => setNumeroSessao(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label><select value={tipoSessao} onChange={e => setTipoSessao(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm"><option value="Ordinária">Ordinária</option><option value="Extraordinária">Extraordinária</option><option value="Solenidade">Solenidade</option></select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Período</label><input type="text" value={periodoSessao} onChange={e => setPeriodoSessao(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Legislatura</label><input type="text" value={legislatura} onChange={e => setLegislatura(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Data</label><input type="date" value={dataSessao.split('/').reverse().join('-')} onChange={e => { const [y, m, d] = e.target.value.split('-'); if(y&&m&&d) setDataSessao(`${d}/${m}/${y}`); }} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Horário</label><input type="time" value={horarioSessao} onChange={e => setHorarioSessao(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm" /></div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Título Oficial no PDF (Automático)</label>
                <div className="font-semibold text-blue-900">{nomeSessao}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[700px]">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">Documentos Disponíveis</h3>
                    <button onClick={adicionarTodosFiltrados} className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Add Todos</button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Nº, autor ou ementa" value={buscaDoc} onChange={e => setBuscaDoc(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs outline-none" />
                    </div>
                    <select value={filtroTipoDoc} onChange={e => setFiltroTipoDoc(e.target.value)} className="bg-gray-50 border border-gray-200 rounded text-xs px-2 py-1.5 outline-none w-28">
                      <option value="Todos">Tipos</option>
                      <option value="INDICACAO">Indicação</option>
                      <option value="REQUERIMENTO">Requerimento</option>
                      <option value="PROJETO_LEI_LEGISLATIVO">PL Vereador</option>
                      <option value="PROJETO_LEI_EXECUTIVO">PL Prefeitura</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 bg-slate-50 space-y-2">
                  {loading ? (
                    <div className="text-center p-4 text-sm text-gray-500">Carregando...</div>
                  ) : documentosFiltradosBiblioteca.length === 0 ? (
                    <div className="text-center p-4 text-sm text-gray-500">Nenhum documento encontrado.</div>
                  ) : (
                    documentosFiltradosBiblioteca.map(doc => {
                      const naPauta = itensPauta.some(p => p.id === doc.id);
                      return (
                        <div key={doc.id} className={`p-3 rounded-lg border ${naPauta ? 'bg-white border-gray-200 opacity-60' : 'bg-white border-gray-200 shadow-sm hover:border-blue-300'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{doc.type.replace('_', ' ')} Nº {doc.protocolNum}/{doc.year}</span>
                            {naPauta ? (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Na Pauta</span>
                            ) : (
                              <button onClick={() => adicionarItemDaBiblioteca(doc)} className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-2 mb-1">{doc.ementa}</p>
                          <div className="text-[10px] text-gray-500 font-medium">Por: {doc.author?.name || doc.gabinete?.name || "Autor"}</div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="p-3 border-t border-gray-200 bg-white">
                  <button onClick={() => setShowAddManual(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    + Criar Item Manualmente
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-gray-200 px-5 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" /> Leitura do Expediente
                      <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{expediente.length}</span>
                    </h3>
                  </div>
                  <div className="p-4">
                    {expediente.length === 0 ? (
                      <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">Nenhum documento no expediente.</div>
                    ) : (
                      <div className="space-y-3">{expediente.map((item, index) => renderizarCardItem(item, index))}</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-gray-200 px-5 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Vote className="w-4 h-4 text-orange-500" /> Ordem do Dia
                      <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{ordemDia.length}</span>
                    </h3>
                  </div>
                  <div className="p-4">
                    {ordemDia.length === 0 ? (
                      <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">Nenhum projeto para votação.</div>
                    ) : (
                      <div className="space-y-3">{ordemDia.map((item, index) => renderizarCardItem(item, index))}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {showAddManual && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 no-print">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-gray-900">Adicionar Item Manual</h3>
                    <button onClick={() => setShowAddManual(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Documento</label>
                      <select value={manualForm.type} onChange={(e) => { const novoTipo = e.target.value; setManualForm({ ...manualForm, type: novoTipo, numero: calcularProximoNumero(novoTipo) }); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm">
                        <option value="INDICACAO">Indicação</option><option value="REQUERIMENTO">Requerimento</option>
                        <option value="PROJETO_LEI_LEGISLATIVO">Projeto de Lei (Vereador)</option><option value="PROJETO_LEI_EXECUTIVO">Projeto de Lei (Prefeitura)</option>
                        <option value="OFICIO">Ofício</option><option value="MOCAO">Moção</option><option value="PARECER">Parecer</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Número</label><input type="text" value={manualForm.numero} onChange={(e) => setManualForm({...manualForm, numero: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm" /></div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Bloco</label>
                      <select value={manualForm.tramitacao} onChange={(e) => setManualForm({...manualForm, tramitacao: e.target.value as "LEITURA" | "VOTAÇÃO"})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm">
                        <option value="LEITURA">Expediente</option><option value="VOTAÇÃO">Ordem Dia</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Autor / Propositor</label><input type="text" value={manualForm.propositor} onChange={(e) => setManualForm({...manualForm, propositor: e.target.value.toUpperCase()})} placeholder="Nome do Vereador ou Órgão" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm" /></div>
                    {manualForm.tramitacao === "VOTAÇÃO" && (
                      <div>
                        <label className="block text-xs font-bold text-orange-600 mb-1">Turno da Votação</label>
                        <select value={manualForm.turnoVotacao || ""} onChange={(e) => setManualForm({...manualForm, turnoVotacao: e.target.value})} className="w-full border-2 border-orange-200 bg-orange-50 rounded-lg p-2 text-sm text-orange-900 font-bold">
                          <option value="">Selecione o turno...</option>
                          <option value="Votação Única">Votação Única</option><option value="1ª Votação">1ª Votação</option><option value="2ª Votação">2ª Votação</option>
                        </select>
                      </div>
                    )}
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Ementa / Resumo</label><textarea rows={3} value={manualForm.ementa} onChange={(e) => setManualForm({...manualForm, ementa: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm" placeholder="Resumo..."></textarea></div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddManual(false)} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button onClick={adicionarManual} className="px-6 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Salvar na Pauta</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      <div className="print-only">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm 10mm; size: A4 portrait; }
            body, html, .min-h-screen { background-color: #ffffff !important; color: #000000 !important; font-family: Arial, Helvetica, sans-serif !important; }
            .bg-gray-50 { background-color: #ffffff !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; width: 100%; margin: 0; padding: 0; }
            .page-break-avoid { page-break-inside: avoid; break-inside: avoid; margin-bottom: 16px; }
            .print-text-sm { font-size: 10.5pt !important; line-height: 1.25 !important; text-align: justify; }
            table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
          @media screen { .print-only { display: none !important; } }
        `}} />
        <table className="w-full font-sans">
          <thead>
            <tr>
              <td>
                <div className="w-full mb-6">
                  <div className="flex justify-between items-center text-[9pt] text-gray-800 mb-4"><span>{dataImpressao}</span><span>LegisDocs</span></div>
                  <div className="flex flex-col items-center justify-center mb-4">
                    {config?.logoCabecalho ? <img src={config.logoCabecalho} alt="Logo" className="h-20 object-contain mb-2" /> : <h1 className="font-bold text-[14pt] uppercase text-center">CÂMARA MUNICIPAL</h1>}
                  </div>
                  <hr className="border-t-[1.5px] border-black mb-4" />
                  <div className="text-center">
                    <p className="font-normal text-[12pt] uppercase">{dataSessao}. Horário: {horarioSessao}</p>
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
                  <p>{config?.enderecoRodape || "Endereço não configurado"}</p>
                  <p>{config?.contatoRodape || "Contato não configurado"}</p>
                </div>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
                {expediente.length > 0 && (
                  <div className="mb-6">
                    <div className="border border-black py-2 mb-4 w-full text-center"><h3 className="font-normal text-[11pt] uppercase m-0">LEITURA DO EXPEDIENTE</h3></div>
                    <div>{expediente.map((doc, index) => (
                      <div key={doc.id} className="page-break-avoid print-text-sm">
                        <p className="font-bold mb-0.5">{index + 1}°) {doc.type} N° {doc.numero}.</p>
                        <p className="mb-0.5">Propositor: {doc.propositor.toUpperCase()}. Tramitação: <span className="underline">LEITURA NO EXPEDIENTE</span></p>
                        <p className="uppercase">RESUMO: {doc.ementa.toUpperCase()}</p>
                      </div>
                    ))}</div>
                  </div>
                )}
                {ordemDia.length > 0 && (
                  <div>
                    <div className="border border-black py-2 mb-4 mt-6 w-full text-center"><h3 className="font-normal text-[11pt] uppercase m-0">ORDEM DO DIA</h3></div>
                    <div>{ordemDia.map((doc, index) => (
                      <div key={doc.id} className="page-break-avoid print-text-sm">
                        <p className="font-bold mb-0.5">{index + 1}°) {doc.type} N° {doc.numero}.</p>
                        <p className="mb-0.5">Propositor: {doc.propositor.toUpperCase()}. Tramitação: <span className="font-bold underline">{doc.turnoVotacao ? doc.turnoVotacao.toUpperCase() : "VOTAÇÃO"} NA ORDEM DO DIA</span></p>
                        <p className="uppercase">RESUMO: {doc.ementa.toUpperCase()}</p>
                      </div>
                    ))}</div>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  function renderizarCardItem(item: PautaItem, index: number) {
    const isEdicao = editingId === item.id;
    return (
      <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start">
        {isEdicao && editForm ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] uppercase font-bold text-gray-500">Tipo</label><input type="text" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value.toUpperCase()})} className="w-full border rounded p-1.5 text-sm" /></div>
            <div><label className="text-[10px] uppercase font-bold text-gray-500">Nº</label><input type="text" value={editForm.numero} onChange={e => setEditForm({...editForm, numero: e.target.value})} className="w-full border rounded p-1.5 text-sm" /></div>
            <div><label className="text-[10px] uppercase font-bold text-gray-500">Autor</label><input type="text" value={editForm.propositor} onChange={e => setEditForm({...editForm, propositor: e.target.value.toUpperCase()})} className="w-full border rounded p-1.5 text-sm" /></div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Bloco</label>
              <select value={editForm.tramitacao} onChange={e => setEditForm({...editForm, tramitacao: e.target.value as "LEITURA"|"VOTAÇÃO"})} className="w-full border rounded p-1.5 text-sm">
                <option value="LEITURA">Expediente</option><option value="VOTAÇÃO">Ordem Dia</option>
              </select>
            </div>
            {editForm.tramitacao === "VOTAÇÃO" && (
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-orange-600">Turno</label>
                <select value={editForm.turnoVotacao || ""} onChange={e => setEditForm({...editForm, turnoVotacao: e.target.value})} className="w-full border-orange-200 bg-orange-50 rounded p-1.5 text-sm text-orange-900 font-bold">
                  <option value="">Selecione...</option><option value="Votação Única">Votação Única</option><option value="1ª Votação">1ª Votação</option><option value="2ª Votação">2ª Votação</option>
                </select>
              </div>
            )}
            <div className="md:col-span-full"><label className="text-[10px] uppercase font-bold text-gray-500">Ementa</label><textarea rows={2} value={editForm.ementa} onChange={e => setEditForm({...editForm, ementa: e.target.value})} className="w-full border rounded p-1.5 text-sm" /></div>
            <div className="md:col-span-full flex gap-2 justify-end">
              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm font-semibold text-gray-600 border rounded">Cancelar</button>
              <button onClick={salvarEdicao} className="px-3 py-1.5 text-sm font-bold text-white bg-green-600 rounded">Salvar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-bold text-gray-900 text-sm">{item.type} {item.numero}</span>
                {item.turnoVotacao && <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-orange-100 text-orange-800 border">{item.turnoVotacao}</span>}
              </div>
              <p className="text-sm text-gray-600 mb-1">{item.ementa}</p>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="font-medium text-gray-700">{item.propositor}</span><span>•</span>
                <button onClick={() => { setEditingId(item.id); setEditForm(item); }} className="text-blue-600 hover:underline flex items-center gap-1"><Edit3 className="w-3 h-3"/> Editar</button>
              </div>
            </div>
            <button onClick={() => confirmRemove(item.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-lg"><Trash2 className="w-5 h-5" /></button>
          </>
        )}
      </div>
    );
  }
}