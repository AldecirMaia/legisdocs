"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, CheckCircle, RefreshCw, XCircle, 
  FileText, Building, User, Info, FileSignature, 
  Menu, Bell, ChevronDown, LogOut 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface DocData {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  status: string;
  ementa: string;
  texto?: string; // Artigos da Lei
  artigos?: string; // Fallback caso a API guarde com este nome
  motivo?: string;
  justificativa?: string;
  secretariaDestino?: string;
  nomeSecretario?: string;
  author?: { name: string };
  gabinete?: { name: string };
  createdAt: string;
  [key: string]: unknown;
}

export default function AnalisarDocumento({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [docId, setDocId] = useState("");
  const [doc, setDoc] = useState<DocData | null>(null);
  
  const [actionType, setActionType] = useState<"APROVAR" | "REFAZER" | "CANCELADO" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    setUser(JSON.parse(storedUser));

    params.then((res) => {
      setDocId(res.id);
      carregarDocumento(res.id);
    });
  }, [params, router]);

  const carregarDocumento = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/detalhe/${id}`);
      const data = await res.json();
      setDoc(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmarAcao = async () => {
    if ((actionType === "REFAZER" || actionType === "CANCELADO") && !feedback.trim()) {
      return showToast("Obrigatório: Informe o motivo da devolução/cancelamento.", "error");
    }

    setLoading(true);
    let finalStatus = actionType === "APROVAR" ? "APROVADO" : actionType;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: finalStatus, feedback: feedback, feedbackSecretaria: feedback }),
      });
      
      showToast("Decisão registada com sucesso!", "success");
      setTimeout(() => router.push("/painel/analise"), 2000);
    } catch (error) {
      showToast("Erro ao processar a decisão.", "error");
      setLoading(false);
    }
  };

  if (!user || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">A carregar detalhes do documento...</p>
        </div>
      </div>
    );
  }

  const dataFormatada = new Date(doc.createdAt).toLocaleDateString("pt-BR");
  const horaFormatada = new Date(doc.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
  const isProjetoOuEmenda = doc.type.includes("PROJETO") || doc.type.includes("EMENDA");

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      
      {/* SIDEBAR COMPONENTE */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />} 
          {toast.msg}
        </div>
      )}

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER SUPERIOR (Menu e Perfil) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-800">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block font-bold text-gray-700 text-lg">
              LegisDocs
            </div>
          </div>
          <div className="flex items-center gap-5 ml-4">
            <button className="text-gray-500 hover:text-blue-600 transition-colors"><Bell className="w-5 h-5" /></button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user?.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{user?.role?.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {user?.name?.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* HEADER DE FOCO DA ANÁLISE */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/painel/analise" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2 font-bold text-sm bg-gray-100 hover:bg-blue-50 px-3 py-2 rounded-lg">
              <ArrowLeft className="w-4 h-4" /> Voltar à Fila
            </Link>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
            <h1 className="text-xl font-black text-slate-800 hidden sm:block tracking-tight">
              Análise de Documento
            </h1>
          </div>
          <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-blue-200 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
            <FileText className="w-3.5 h-3.5 hidden sm:block" />
            {doc.type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* SCROLL DO CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto space-y-6 pb-10">
            
            {/* ESTILO GLOBAL PARA RENDERIZAR O HTML DO QUILL (INCLUI LISTAS NUMERADAS) */}
            <style dangerouslySetInnerHTML={{__html: `
              .html-content { white-space: pre-wrap !important; word-wrap: break-word !important; overflow-wrap: break-word !important; color: #1f2937 !important; font-size: 15px; line-height: 1.7; }
              .html-content * { color: #1f2937 !important; }
              
              /* FORÇAR EXIBIÇÃO DE LISTAS NUMERADAS E MARCADORES (Quill) */
              .html-content ol { list-style-type: decimal !important; padding-left: 2rem !important; margin-bottom: 1rem !important; display: block !important; }
              .html-content ul { list-style-type: disc !important; padding-left: 2rem !important; margin-bottom: 1rem !important; display: block !important; }
              .html-content li { display: list-item !important; margin-bottom: 0.5rem !important; }
              
              .html-content table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; margin: 1rem 0; }
              .html-content td, .html-content th { border: 1px solid #d1d5db; padding: 10px; white-space: normal !important; word-break: break-word !important; }
              .html-content p { margin-bottom: 0.85rem; text-align: justify; }
            `}} />

            {/* CABEÇALHO DO DOCUMENTO */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between md:items-center gap-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Building className="w-6 h-6 text-gray-400" />
                  {doc.gabinete?.name || "Gabinete Desconhecido"}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 font-medium">
                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                    <User className="w-4 h-4 text-gray-500" /> {doc.author?.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    Enviado a {dataFormatada} às {horaFormatada}
                  </span>
                </div>
              </div>
              <div className="font-mono font-bold text-slate-800 bg-slate-100 px-5 py-3 rounded-xl border border-slate-200 text-center shrink-0">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-sans">Nº de Protocolo</div>
                <div className="text-lg">
                  {doc.protocolNum > 0 ? `${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : "S/N"}
                </div>
              </div>
            </div>

            {/* CORPO DO DOCUMENTO */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-8">
                
                {/* EMENTA */}
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Ementa
                  </h3>
                  <p className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 font-bold text-gray-800 text-[15px] leading-relaxed">
                    {doc.ementa}
                  </p>
                </div>

                {/* DESTINO */}
                {(doc.secretariaDestino || doc.nomeSecretario) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Secretaria de Destino</h3>
                      <p className="font-bold text-gray-900">{doc.secretariaDestino || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Titular</h3>
                      <p className="font-bold text-gray-900">{doc.nomeSecretario || "N/A"}</p>
                    </div>
                  </div>
                )}

                {/* MOTIVO */}
                {doc.motivo && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Motivo da Indicação</h3>
                    <p className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-gray-800 text-[15px] leading-relaxed">
                      {doc.motivo}
                    </p>
                  </div>
                )}

                {/* ARTIGOS DA LEI (Apenas se for Projeto ou Emenda) */}
                {isProjetoOuEmenda && (doc.texto || doc.artigos) && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileSignature className="w-4 h-4" /> Artigos da Lei / Corpo do Documento
                    </h3>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 html-content shadow-inner">
                      <div dangerouslySetInnerHTML={{ __html: doc.texto || doc.artigos || "" }}></div>
                    </div>
                  </div>
                )}

                {/* JUSTIFICATIVA */}
                {doc.justificativa && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {isProjetoOuEmenda ? "Justificativa Legislativa" : "Conteúdo / Justificativa"}
                    </h3>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 html-content shadow-inner">
                      <div dangerouslySetInnerHTML={{ __html: doc.justificativa }}></div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* PAINEL DE DECISÃO */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h3 className="font-black text-xl text-gray-900 mb-6">Decisão da Secretaria</h3>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button 
                  onClick={() => { setActionType("APROVAR"); setFeedback(""); }} 
                  className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all flex justify-center items-center gap-2 ${actionType === "APROVAR" ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-[1.02]" : "bg-white border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"}`}
                >
                  <CheckCircle className="w-5 h-5" /> Aprovar para Pauta
                </button>
                <button 
                  onClick={() => setActionType("REFAZER")} 
                  className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all flex justify-center items-center gap-2 ${actionType === "REFAZER" ? "bg-amber-500 border-amber-500 text-white shadow-md scale-[1.02]" : "bg-white border-gray-200 text-gray-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50"}`}
                >
                  <RefreshCw className="w-5 h-5" /> Devolver ao Gabinete
                </button>
                <button 
                  onClick={() => setActionType("CANCELADO")} 
                  className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all flex justify-center items-center gap-2 ${actionType === "CANCELADO" ? "bg-red-600 border-red-600 text-white shadow-md scale-[1.02]" : "bg-white border-gray-200 text-gray-700 hover:border-red-500 hover:text-red-700 hover:bg-red-50"}`}
                >
                  <XCircle className="w-5 h-5" /> Cancelar Definitivo
                </button>
              </div>

              {(actionType === "REFAZER" || actionType === "CANCELADO") && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Motivo da Devolução / Cancelamento <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    rows={4} 
                    value={feedback} 
                    onChange={(e) => setFeedback(e.target.value)} 
                    placeholder="Explique detalhadamente o que precisa ser corrigido..." 
                    className="w-full border border-gray-300 bg-gray-50 rounded-xl p-4 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" 
                  />
                </div>
              )}

              {actionType && (
                <button 
                  disabled={loading} 
                  onClick={handleConfirmarAcao} 
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      A Guardar Decisão...
                    </>
                  ) : (
                    "Confirmar e Enviar Decisão"
                  )}
                </button>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}