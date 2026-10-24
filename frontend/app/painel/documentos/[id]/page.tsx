"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export default function EditarDocumento({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  const [docId, setDocId] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [secretarias, setSecretarias] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const [docOriginal, setDocOriginal] = useState<any>(null);
  const [ementa, setEmenta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [secretariaSelecionada, setSecretariaSelecionada] = useState("");
  const [customNomeSecretaria, setCustomNomeSecretaria] = useState("");
  const [customNomeTitular, setCustomNomeTitular] = useState("");

  useEffect(() => {
    params.then((res) => setDocId(res.id));
  }, [params]);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    carregarSecretarias(parsedUser.tenantId);
    if (docId) carregarDocumento(docId);
  }, [router, docId]);

  const carregarSecretarias = async (tenantId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/secretaria-destino/list/active/${tenantId}`);
      setSecretarias(await res.json());
    } catch (error) { console.error(error); }
  };

  const carregarDocumento = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/document/detalhe/${id}`);
      const data = await res.json();
      setDocOriginal(data);
      setEmenta(data.ementa || "");
      setMotivo(data.motivo || "");
      setJustificativa(data.justificativa || "");
      
      setSecretariaSelecionada("outros");
      setCustomNomeSecretaria(data.secretariaDestino || "");
      setCustomNomeTitular(data.nomeSecretario || "");
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: "success" | "error" | "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isOutros = secretariaSelecionada === "outros";
  const secretariaEncontrada = secretarias.find((s) => s.id === secretariaSelecionada);
  const isReadOnly = docOriginal?.status === "ENVIADO" || docOriginal?.status === "APROVADO" || docOriginal?.status === "CANCELADO";

  const tipo = docOriginal?.type || "INDICACAO";
  const mostrarSecretaria = tipo === "INDICACAO" || tipo === "OFICIO";
  const mostrarMotivo = tipo === "INDICACAO";

  const getLabels = () => {
    switch (tipo) {
      case "OFICIO": return { ementa: "Assunto do Ofício *", conteudo: "Corpo do Ofício" };
      case "PROJETO_LEI": return { ementa: "Ementa (Dispõe sobre...) *", conteudo: "Artigos e Justificativa" };
      case "MOCAO": return { ementa: "Homenageado(a) / Assunto *", conteudo: "Texto da Moção" };
      case "PARECER": return { ementa: "Projeto de Referência *", conteudo: "Relatório, Parecer e Conclusão" };
      case "EMENDA_ADITIVA":
      case "EMENDA_IMPOSITIVA": return { ementa: "Projeto de Lei Referente *", conteudo: "Artigos da Emenda e Tabelas Orçamentais" };
      default: return { ementa: "Ementa (Resumo do Pedido) *", conteudo: "Justificativa Legislativa" };
    }
  };

  const labels = getLabels();

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const handleUpdate = async (novoStatus: "RASCUNHO" | "ENVIADO") => {
    if (!ementa.trim()) return showToast("A ementa é obrigatória.", "error");

    setSaving(true);
    const payload = {
      status: novoStatus, 
      ementa, 
      motivo: mostrarMotivo ? motivo : "", 
      justificativa,
      secretariaDestino: mostrarSecretaria ? (isOutros ? customNomeSecretaria : secretariaEncontrada?.nome) : "",
      nomeSecretario: mostrarSecretaria ? (isOutros ? customNomeTitular : secretariaEncontrada?.titular) : "",
    };

    try {
      const res = await fetch(`http://localhost:4000/document/edit/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      showToast(novoStatus === "ENVIADO" ? "Reenviado para análise!" : "Rascunho atualizado!", "success");
      setTimeout(() => router.push("/painel/documentos"), 2000);
    } catch (error) {
      showToast("Erro ao guardar documento.", "error");
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="p-10 text-gray-500 animate-pulse">A carregar documento...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10 relative">
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span> {toast.msg}
        </div>
      )}

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">LegisDocs <span className="text-sm text-blue-300 ml-2">/ Documento Nº {String(docOriginal.protocolNum).padStart(3, '0')}/{docOriginal.year}</span></h1>
        <button onClick={() => router.push("/painel/documentos")} className="text-blue-200 hover:text-white font-semibold">Voltar</button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        
        {docOriginal.status === "REFAZER" && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl shadow-sm mb-6 flex flex-col gap-2">
            <h3 className="font-bold text-orange-800 flex items-center gap-2"><span>⚠️</span> Documento Devolvido pela Secretaria</h3>
            <p className="text-orange-700 text-sm"><strong>Motivo:</strong> {docOriginal.feedbackSecretaria}</p>
            <p className="text-orange-600 text-xs mt-1">Por favor, corrija as informações abaixo e reenvie para análise. Use o botão <strong>Tx</strong> no editor se precisar limpar formatações estranhas.</p>
          </div>
        )}

        {docOriginal.status === "CANCELADO" && (
          <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm mb-6 flex flex-col gap-2">
            <h3 className="font-bold text-red-800 flex items-center gap-2"><span>❌</span> Documento Cancelado</h3>
            <p className="text-red-700 text-sm"><strong>Motivo:</strong> {docOriginal.feedbackSecretaria}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{labels.ementa}</label>
              <textarea rows={2} disabled={isReadOnly} value={ementa} onChange={(e) => setEmenta(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 text-gray-800 disabled:bg-gray-100" />
            </div>

            <hr className="border-gray-200" />

            {mostrarSecretaria && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Secretaria de Destino</label>
                <select disabled={isReadOnly} value={secretariaSelecionada} onChange={(e) => setSecretariaSelecionada(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 bg-white mb-4 disabled:bg-gray-100">
                  <option value="outros">Definido Manualmente (Outros)</option>
                  {secretarias.map((sec) => <option key={sec.id} value={sec.id}>{sec.nome}</option>)}
                </select>

                {isOutros && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Nome da Secretaria / Órgão</label>
                      <input type="text" disabled={isReadOnly} value={customNomeSecretaria} onChange={(e) => setCustomNomeSecretaria(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Nome do Titular</label>
                      <input type="text" disabled={isReadOnly} value={customNomeTitular} onChange={(e) => setCustomNomeTitular(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 disabled:bg-gray-100" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {mostrarSecretaria && <hr className="border-gray-200" />}

            {mostrarMotivo && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo da Indicação</label>
                <textarea rows={4} disabled={isReadOnly} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 disabled:bg-gray-100" />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{labels.conteudo}</label>
              
              {/* CSS Blindado: Força a legibilidade e a quebra de linha do texto colado do Word/PDF */}
              <style dangerouslySetInnerHTML={{__html: `
                /* 1. Força a cor do texto a ficar escura e remove a transparência fantasma */
                .ql-editor, .ql-editor * { 
                  color: #111827 !important; 
                  opacity: 1 !important; 
                }
                
                /* 2. Força a quebra de linha automática e remove o scroll horizontal */
                .ql-editor { 
                  font-size: 15px;
                  white-space: pre-wrap !important;
                  word-wrap: break-word !important;
                  overflow-wrap: break-word !important;
                  overflow-x: hidden !important;
                }

                /* 3. Impede que tabelas coladas expandam além da largura permitida */
                .ql-editor table {
                  width: 100% !important;
                  table-layout: fixed !important;
                }
                .ql-editor td, .ql-editor th {
                  white-space: normal !important;
                  word-break: break-word !important;
                }

                /* CSS para o modo de leitura (isReadOnly) */
                .html-content { font-size: 15px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; overflow-x: hidden; color: #111827; }
                .html-content table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; margin: 1rem 0; }
                .html-content td, .html-content th { border: 1px solid #d1d5db; padding: 8px; white-space: normal !important; word-break: break-word !important; }
              `}} />

              {isReadOnly ? (
                <div 
                  className="bg-gray-100 border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto html-content"
                  dangerouslySetInnerHTML={{ __html: justificativa }}
                ></div>
              ) : (
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <ReactQuill 
                    theme="snow" 
                    value={justificativa} 
                    onChange={setJustificativa} 
                    modules={modules}
                    className="h-96 pb-12 border-none" 
                  />
                </div>
              )}
            </div>

            {!isReadOnly && (
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button disabled={saving} onClick={() => handleUpdate("RASCUNHO")} className="flex-1 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 px-6 rounded-lg disabled:opacity-50">
                  💾 Atualizar Rascunho
                </button>
                <button disabled={saving} onClick={() => handleUpdate("ENVIADO")} className="flex-1 bg-green-600 text-white hover:bg-green-700 font-bold py-3 px-6 rounded-lg shadow-md disabled:opacity-50">
                  {saving ? "A processar..." : "🚀 Reenviar para a Secretaria"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}