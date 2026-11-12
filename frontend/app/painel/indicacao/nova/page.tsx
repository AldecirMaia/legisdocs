"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import Sidebar from "@/app/components/Sidebar";
import { Menu, Search, Bell, ChevronDown, LogOut, CheckCircle, AlertTriangle, FileText, Send, Save } from "lucide-react";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface UserAuth { id: string; name: string; role: string; tenantId: string; gabineteId: string; [key: string]: unknown; }
interface Secretaria { id: string; nome: string; titular: string; [key: string]: unknown; }

export default function NovoDocumento() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form States
  const [tipo, setTipo] = useState("INDICACAO");
  const [ementa, setEmenta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [textoArtigos, setTextoArtigos] = useState("");
  const [justificativa, setJustificativa] = useState(""); 
  const [secretariaSelecionada, setSecretariaSelecionada] = useState("");
  const [customNomeSecretaria, setCustomNomeSecretaria] = useState("");
  const [customNomeTitular, setCustomNomeTitular] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/secretaria-destino/list/active/${parsedUser.tenantId}`)
      .then(res => res.json())
      .then(data => setSecretarias(data))
      .catch(console.error);
  }, [router]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const labels = (() => {
    switch (tipo) {
      case "OFICIO": return { ementa: "Assunto do Ofício", placeholderEmenta: "Ex: Solicitação...", conteudo: "Corpo do Ofício" };
      case "PROJETO_LEI_LEGISLATIVO":
      case "PROJETO_LEI_EXECUTIVO": return { ementa: "Ementa (Dispõe sobre...)", placeholderEmenta: "Ex: Dispõe sobre...", conteudo: "Justificativa Legislativa" };
      case "MOCAO": return { ementa: "Homenageado(a) / Assunto", placeholderEmenta: "Ex: Michel Nunes...", conteudo: "Texto da Moção" };
      case "PARECER": return { ementa: "Projeto de Referência", placeholderEmenta: "Ex: Projeto de Lei 024...", conteudo: "Relatório, Parecer e Conclusão" };
      case "EMENDA_ADITIVA":
      case "EMENDA_IMPOSITIVA": return { ementa: "Projeto de Lei Referente", placeholderEmenta: "Ex: PL Nº 010/2022", conteudo: "Justificativa da Emenda" };
      default: return { ementa: "Ementa (Resumo do Pedido)", placeholderEmenta: "Ex: Indica a necessidade...", conteudo: "Justificativa Legislativa" };
    }
  })();

  const mostrarSecretaria = tipo === "INDICACAO" || tipo === "OFICIO";
  const mostrarMotivo = tipo === "INDICACAO";
  const isProjetoOuEmenda = tipo.includes("PROJETO") || tipo.includes("EMENDA");

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const handleSubmit = async (intendedStatus: "RASCUNHO" | "ENVIADO") => {
    if (!ementa.trim()) return showToast("O campo ementa/assunto é obrigatório.", "error");
    if (!user) return;
    setLoading(true);

    const finalStatus = (intendedStatus === "ENVIADO" && user.role === "ASSESSOR") ? "AGUARDANDO_ASSINATURA" : intendedStatus;
    const secEncontrada = secretarias.find((s) => s.id === secretariaSelecionada);
    
    const payload = {
      type: tipo, status: finalStatus, ementa, motivo: mostrarMotivo ? motivo : "", 
      texto: isProjetoOuEmenda ? textoArtigos : "", justificativa,
      secretariaDestino: mostrarSecretaria ? (secretariaSelecionada === "outros" ? customNomeSecretaria : secEncontrada?.nome) : "",
      nomeSecretario: mostrarSecretaria ? (secretariaSelecionada === "outros" ? customNomeTitular : secEncontrada?.titular) : "",
      tenantId: user.tenantId, gabineteId: user.gabineteId, authorId: user.id
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/create`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      
      showToast(finalStatus === "ENVIADO" ? "Enviado com sucesso!" : finalStatus === "AGUARDANDO_ASSINATURA" ? "Enviado para assinatura!" : "Rascunho guardado.", "success");
      setTimeout(() => router.push("/painel/documentos"), 1500);
    } catch {
      showToast("Erro ao gravar documento.", "error");
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50">A carregar interface...</div>;

  return (
    <div lang="pt-BR" className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-blue-600 p-1"><Menu className="w-6 h-6" /></button>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 ml-2">
            <button className="text-gray-500 hover:text-blue-600"><Bell className="w-5 h-5" /></button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="relative cursor-pointer flex items-center gap-2 sm:gap-3" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user.name}</span>
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">{user.role.replace('_', ' ')}</span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
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
          <div className="max-w-4xl mx-auto space-y-6 pb-10">
            
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-600" /> Redigir Documento
              </h2>
              <p className="text-gray-500 mt-1 text-sm font-medium">Preencha os campos abaixo para criar um novo documento oficial.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tipo de Documento *</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3.5 font-bold bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option value="INDICACAO">Indicação Parlamentar</option>
                    <option value="REQUERIMENTO">Requerimento</option>
                    <option value="OFICIO">Ofício</option>
                    <option value="PROJETO_LEI_LEGISLATIVO">Projeto de Lei (Legislativo)</option>
                    <option value="PROJETO_LEI_EXECUTIVO">Projeto de Lei (Executivo)</option>
                    <option value="MOCAO">Moção (Aplausos, Repúdio)</option>
                    <option value="PARECER">Parecer de Comissão</option>
                    <option value="EMENDA_ADITIVA">Emenda Parlamentar Aditiva</option>
                    <option value="EMENDA_IMPOSITIVA">Emenda Parlamentar Impositiva</option>
                  </select>
                </div>
                
                <hr className="border-gray-100" />
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{labels.ementa} *</label>
                  <textarea rows={2} required value={ementa} onChange={(e) => setEmenta(e.target.value)} placeholder={labels.placeholderEmenta} className="w-full border border-gray-300 rounded-xl p-4 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all" />
                </div>
                
                {mostrarSecretaria && (
                  <div className="bg-slate-50/50 p-5 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Secretaria / Órgão de Destino</label>
                    <select value={secretariaSelecionada} onChange={(e) => setSecretariaSelecionada(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3.5 mb-4 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="">-- Selecione o destino --</option>
                      <option value="outros">Outros (Digitar Manualmente)</option>
                      {secretarias.map((sec) => <option key={sec.id} value={sec.id}>{sec.nome}</option>)}
                    </select>
                    {secretariaSelecionada === "outros" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Órgão</label>
                          <input type="text" value={customNomeSecretaria} onChange={(e) => setCustomNomeSecretaria(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Titular (Secretário/a)</label>
                          <input type="text" value={customNomeTitular} onChange={(e) => setCustomNomeTitular(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {mostrarMotivo && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Motivo do Pedido</label>
                    <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva brevemente o motivo..." className="w-full border border-gray-300 rounded-xl p-4 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all" />
                  </div>
                )}
                
                <style dangerouslySetInnerHTML={{__html: `.ql-editor { font-size: 15px; color: #1e293b; min-height: 250px; } .ql-toolbar { border-radius: 0.5rem 0.5rem 0 0 !important; border-color: #d1d5db !important; background: #f8fafc; } .ql-container { border-radius: 0 0 0.5rem 0.5rem !important; border-color: #d1d5db !important; }`}} />

                {isProjetoOuEmenda && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Artigos da Lei / Corpo do Documento</label>
                    <div className="bg-white"><ReactQuill theme="snow" value={textoArtigos} onChange={setTextoArtigos} modules={modules} /></div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{labels.conteudo}</label>
                  <div className="bg-white"><ReactQuill theme="snow" value={justificativa} onChange={setJustificativa} modules={modules} /></div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-6 border-t border-gray-100">
                  <button disabled={loading} onClick={() => handleSubmit("RASCUNHO")} className="flex-1 flex justify-center items-center gap-2 bg-white border-2 border-gray-300 text-slate-700 hover:bg-gray-50 hover:border-gray-400 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                    <Save className="w-5 h-5" /> Guardar Rascunho
                  </button>
                  <button disabled={loading} onClick={() => handleSubmit("ENVIADO")} className="flex-1 flex justify-center items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                    <Send className="w-5 h-5" /> {user.role === "ASSESSOR" ? "Enviar p/ Assinatura" : "Enviar para Protocolo"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}