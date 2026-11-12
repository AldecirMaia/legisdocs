"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import { 
  Menu, Bell, ChevronDown, LogOut, Search, Plus, 
  FileEdit, Eye, FileText, CheckCircle, XCircle, AlertTriangle, Download
} from "lucide-react";

interface UserAuth {
  id: string;
  name: string;
  role: string;
  tenantId: string;
  gabineteId: string;
  [key: string]: unknown;
}

interface DocList {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  status: string;
  ementa: string;
  secretariaDestino?: string;
  feedbackSecretaria?: string; 
  author?: { name: string };
  gabinete?: { name: string };
  createdAt: string;
}

export default function ListaDocumentos() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [documentos, setDocumentos] = useState<DocList[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  // Estados de UI e Interação
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [docToSign, setDocToSign] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const carregarDocumentos = async (userParsed: UserAuth) => {
    try {
      const token = localStorage.getItem("legisdocs_token");
      let url = "";

      // INTELIGÊNCIA DE ACESSO: Secretaria vê todos os aprovados, Gabinete vê apenas os seus
      if (userParsed.role === "SECRETARIA" || userParsed.role === "SUPER_ADMIN") {
        url = `${process.env.NEXT_PUBLIC_API_URL}/document/aprovados/${userParsed.tenantId}`;
      } else {
        url = `${process.env.NEXT_PUBLIC_API_URL}/document/gabinete/${userParsed.gabineteId}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocumentos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar documentos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    carregarDocumentos(parsedUser);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmarAssinatura = async () => {
    if (!docToSign) return;
    setIsSigning(true);
    
    try {
      const token = localStorage.getItem("legisdocs_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/${docToSign}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'ENVIADO' }),
      });

      if (res.ok) {
        showToast("Documento assinado e enviado com sucesso!", "success");
        if (user) carregarDocumentos(user);
      } else {
        showToast("Erro ao assinar o documento.", "error");
      }
    } catch (error) {
      showToast("Erro de conexão com o servidor.", "error");
    } finally {
      setIsSigning(false);
      setDocToSign(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      RASCUNHO: "bg-gray-100 text-gray-700 border-gray-300",
      AGUARDANDO_ASSINATURA: "bg-yellow-100 text-yellow-800 border-yellow-300",
      ENVIADO: "bg-blue-100 text-blue-700 border-blue-300",
      REFAZER: "bg-orange-100 text-orange-700 border-orange-300",
      CANCELADO: "bg-red-100 text-red-700 border-red-300",
      APROVADO: "bg-green-100 text-green-700 border-green-300",
    };
    return badges[status] || "bg-gray-100 text-gray-700";
  };

  // Filtragem local
  const documentosFiltrados = documentos.filter(doc => {
    const matchBusca = (
      doc.protocolNum?.toString().includes(busca) || 
      doc.ementa?.toLowerCase().includes(busca.toLowerCase()) || 
      doc.gabinete?.name?.toLowerCase().includes(busca.toLowerCase())
    );
    const matchTipo = filtroTipo === "Todos" || doc.type === filtroTipo;
    return matchBusca && matchTipo;
  });

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar interface...</div>;

  return (
    <div lang="pt-BR" className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* TOAST CUSTOMIZADO */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* MODAL DE ASSINATURA */}
      {docToSign && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assinar Documento</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Tem a certeza que deseja assinar digitalmente e enviar este documento para a secretaria? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDocToSign(null)} disabled={isSigning} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleConfirmarAssinatura} disabled={isSigning} className="px-5 py-2 bg-yellow-500 text-yellow-900 font-bold hover:bg-yellow-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                {isSigning ? "A processar..." : "✍️ Assinar e Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-blue-600 p-1">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por ementa, nº ou gabinete..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 ml-2">
            <button className="relative text-gray-500 hover:text-blue-600 transition-colors"><Bell className="w-5 h-5" /></button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            
            <div className="relative cursor-pointer flex items-center gap-2 sm:gap-3" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user.name}</span>
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">{user.role.replace('_', ' ')}</span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                {user.name.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
              
              <div className={`absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 transition-all z-50 ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-xl">
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setIsDropdownOpen(false)}>
          <div className="max-w-[1200px] mx-auto space-y-6 pb-10">
            
            {/* CABEÇALHO DA SEÇÃO */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <FileText className="w-7 h-7 text-blue-600" /> 
                  {user.role === "SECRETARIA" || user.role === "SUPER_ADMIN" ? "Biblioteca do Legislativo" : "Histórico de Documentos"}
                </h2>
                <p className="text-gray-500 mt-1 text-sm font-medium">
                  {user.role === "SECRETARIA" ? "Aceda a todos os documentos aprovados e protocolados." : "Acompanhe o andamento das suas indicações e requerimentos."}
                </p>
              </div>
              {(user.role === "VEREADOR" || user.role === "ASSESSOR") && (
                <Link href="/painel/indicacao/nova" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Novo Documento
                </Link>
              )}
            </div>

            {/* LISTA DE DOCUMENTOS COM FILTROS AVANÇADOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:hidden">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none" />
                </div>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Todos">Todos os tipos</option>
                  <option value="INDICACAO">Indicações</option>
                  <option value="REQUERIMENTO">Requerimentos</option>
                  <option value="PROJETO_LEI_LEGISLATIVO">Projetos de Lei (Legislativo)</option>
                  <option value="PROJETO_LEI_EXECUTIVO">Projetos de Lei (Executivo)</option>
                  <option value="MOCAO">Moções</option>
                  <option value="OFICIO">Ofícios</option>
                </select>
                <button className="hidden sm:flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gray-50 ml-auto transition-colors">
                  <Download className="w-4 h-4" /> Exportar Relatório
                </button>
              </div>

              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium animate-pulse">A carregar a biblioteca...</p>
                </div>
              ) : documentosFiltrados.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center border-dashed border-2 border-gray-100 m-4 rounded-xl bg-gray-50/50">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-600 font-bold text-lg">Nenhum documento encontrado</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Não foram encontrados documentos com os filtros aplicados.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {documentosFiltrados.map((doc) => (
                    <li key={doc.id} className="p-5 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded text-xs border border-slate-200">
                            {doc.protocolNum > 0 ? `${doc.type.replace(/_/g, ' ')} Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : `${doc.type.replace(/_/g, ' ')} (Sem Número)`}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${getStatusBadge(doc.status)}`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <p className="text-slate-800 font-medium line-clamp-2 text-sm leading-relaxed mb-2 pr-4" title={doc.ementa}>
                          {doc.ementa || <span className="text-gray-400 italic">Sem ementa definida.</span>}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 font-medium">
                          {(user.role === "SECRETARIA" || user.role === "SUPER_ADMIN") && (
                            <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded">🏛️ Gabinete: {doc.gabinete?.name || 'N/A'}</span>
                          )}
                          <span className="flex items-center gap-1">📍 Destino: <span className="text-gray-700">{doc.secretariaDestino || 'N/A'}</span></span>
                          <span className="hidden sm:inline text-gray-300">•</span>
                          <span className="flex items-center gap-1">📅 Criado em: <span className="text-gray-700">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span></span>
                        </div>

                        {(doc.status === "REFAZER" || doc.status === "CANCELADO") && doc.feedbackSecretaria && (user.role === "VEREADOR" || user.role === "ASSESSOR") && (
                          <div className={`mt-3 p-3 rounded-lg text-sm border ${doc.status === "REFAZER" ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                            <strong className="flex items-center gap-1.5 mb-1">
                              {doc.status === "REFAZER" ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              {doc.status === "REFAZER" ? "Motivo da Devolução (Secretaria):" : "Motivo do Cancelamento:"}
                            </strong> 
                            <span className="block text-gray-700">{doc.feedbackSecretaria}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap lg:flex-col lg:justify-center gap-2 shrink-0 border-t border-gray-100 pt-4 lg:border-t-0 lg:pt-0 lg:pl-4">
                        
                        {(user.role === "VEREADOR" || user.role === "ASSESSOR") && (doc.status === "RASCUNHO" || doc.status === "REFAZER" || (doc.status === "AGUARDANDO_ASSINATURA" && user.role === "ASSESSOR")) ? (
                          <Link href={`/painel/documentos/${doc.id}`} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                            <FileEdit className="w-4 h-4" /> Editar
                          </Link>
                        ) : (
                          <Link href={`/painel/documentos/${doc.id}`} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" /> Visualizar
                          </Link>
                        )}

                        {doc.status === "AGUARDANDO_ASSINATURA" && user.role === "VEREADOR" && (
                          <button onClick={() => setDocToSign(doc.id)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-yellow-500 text-yellow-950 hover:bg-yellow-400 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                            ✍️ Assinar e Enviar
                          </button>
                        )}

                        {doc.status === "APROVADO" && (
                          <a href={`/painel/documentos/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                            🖨️ Imprimir PDF
                          </a>
                        )}
                      </div>
                      
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}