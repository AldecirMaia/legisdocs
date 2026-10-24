"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export default function NovoDocumento() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [secretarias, setSecretarias] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState("INDICACAO");
  const [ementa, setEmenta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState(""); 
  const [secretariaSelecionada, setSecretariaSelecionada] = useState("");
  const [customNomeSecretaria, setCustomNomeSecretaria] = useState("");
  const [customNomeTitular, setCustomNomeTitular] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    carregarSecretarias(parsedUser.tenantId);
  }, [router]);

  const carregarSecretarias = async (tenantId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/secretaria-destino/list/active/${tenantId}`);
      setSecretarias(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const showToast = (msg: string, type: "success" | "error" | "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isOutros = secretariaSelecionada === "outros";
  const secretariaEncontrada = secretarias.find((s) => s.id === secretariaSelecionada);

  const getLabels = () => {
    switch (tipo) {
      case "OFICIO": return { ementa: "Assunto do Ofício *", placeholderEmenta: "Ex: Solicitação...", conteudo: "Corpo do Ofício" };
      case "PROJETO_LEI": return { ementa: "Ementa (Dispõe sobre...) *", placeholderEmenta: "Ex: Dispõe sobre...", conteudo: "Artigos e Justificativa" };
      case "MOCAO": return { ementa: "Homenageado(a) / Assunto *", placeholderEmenta: "Ex: Michel Nunes...", conteudo: "Texto da Moção" };
      case "PARECER": return { ementa: "Projeto de Referência *", placeholderEmenta: "Ex: Projeto de Lei 024...", conteudo: "Relatório, Parecer e Conclusão" };
      case "EMENDA_ADITIVA":
      case "EMENDA_IMPOSITIVA": return { ementa: "Projeto de Lei Referente *", placeholderEmenta: "Ex: PL Nº 010/2022", conteudo: "Artigos e Tabelas Orçamentais" };
      default: return { ementa: "Ementa (Resumo do Pedido) *", placeholderEmenta: "Ex: Indica a necessidade...", conteudo: "Justificativa Legislativa" };
    }
  };

  const labels = getLabels();
  const mostrarSecretaria = tipo === "INDICACAO" || tipo === "OFICIO";
  const mostrarMotivo = tipo === "INDICACAO";

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const handleSubmit = async (status: "RASCUNHO" | "ENVIADO") => {
    if (!ementa.trim()) return showToast("O campo inicial é obrigatório.", "error");
    setLoading(true);

    const payload = {
      type: tipo, status, ementa, motivo: mostrarMotivo ? motivo : "", justificativa,
      secretariaDestino: mostrarSecretaria ? (isOutros ? customNomeSecretaria : secretariaEncontrada?.nome) : "",
      nomeSecretario: mostrarSecretaria ? (isOutros ? customNomeTitular : secretariaEncontrada?.titular) : "",
      tenantId: user.tenantId, gabineteId: user.gabineteId, authorId: user.id
    };

    try {
      const res = await fetch("http://localhost:4000/document/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      showToast(status === "ENVIADO" ? "Enviado com sucesso!" : "Rascunho guardado.", "success");
      setTimeout(() => router.push("/painel/documentos"), 2000);
    } catch {
      showToast("Erro ao gravar documento.", "error");
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10 relative">
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {toast.msg}
        </div>
      )}
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold cursor-pointer" onClick={() => router.push("/painel")}>LegisDocs / Novo Documento</h1>
        <button onClick={() => router.push("/painel")} className="text-blue-200 hover:text-white font-semibold">Voltar</button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-blue-900">Formulário de Documento</h2>
            <p className="text-blue-700 text-sm mt-1">Pode colar tabelas do Word diretamente no editor abaixo. Use o botão <strong>Tx</strong> no editor para limpar formatações coladas com erros.</p>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Documento</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 font-semibold bg-gray-50">
                <option value="INDICACAO">Indicação Parlamentar</option>
                <option value="OFICIO">Ofício</option>
                <option value="PROJETO_LEI">Projeto de Lei</option>
                <option value="MOCAO">Moção (Aplausos, Repúdio)</option>
                <option value="PARECER">Parecer de Comissão</option>
                <option value="EMENDA_ADITIVA">Emenda Parlamentar Aditiva</option>
                <option value="EMENDA_IMPOSITIVA">Emenda Parlamentar Impositiva</option>
              </select>
            </div>
            <hr className="border-gray-200" />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{labels.ementa}</label>
              <textarea rows={2} required value={ementa} onChange={(e) => setEmenta(e.target.value)} placeholder={labels.placeholderEmenta} className="w-full border border-gray-300 rounded-lg p-3" />
            </div>
            
            {mostrarSecretaria && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Secretaria / Órgão</label>
                <select value={secretariaSelecionada} onChange={(e) => setSecretariaSelecionada(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 mb-4">
                  <option value="">-- Selecione um destino --</option>
                  {secretarias.map((sec) => <option key={sec.id} value={sec.id}>{sec.nome}</option>)}
                  <option value="outros">Outros (Digitar Manualmente)</option>
                </select>
                {isOutros && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Órgão</label>
                      <input type="text" value={customNomeSecretaria} onChange={(e) => setCustomNomeSecretaria(e.target.value)} className="w-full border rounded-lg p-2.5" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Titular</label>
                      <input type="text" value={customNomeTitular} onChange={(e) => setCustomNomeTitular(e.target.value)} className="w-full border rounded-lg p-2.5" />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {mostrarMotivo && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo</label>
                <textarea rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
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
              `}} />

              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                <ReactQuill theme="snow" value={justificativa} onChange={setJustificativa} modules={modules} className="h-96 pb-12 border-none" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button disabled={loading} onClick={() => handleSubmit("RASCUNHO")} className="flex-1 bg-white border-2 border-gray-300 font-bold py-3 rounded-lg">💾 Guardar como Rascunho</button>
              <button disabled={loading} onClick={() => handleSubmit("ENVIADO")} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg">🚀 Enviar para a Secretaria</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}