"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalisarDocumento({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  const [docId, setDocId] = useState<string>("");
  const [doc, setDoc] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // UX: Controle da caixa de feedback
  const [actionType, setActionType] = useState<"APROVAR" | "REFAZER" | "CANCELAR" | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    params.then((res) => setDocId(res.id));
  }, [params]);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    setUser(JSON.parse(storedUser));
    
    if (docId) carregarDocumento(docId);
  }, [router, docId]);

  const carregarDocumento = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/document/detalhe/${id}`);
      const data = await res.json();
      setDoc(data);
    } catch (error) {
      console.error("Erro ao carregar documento", error);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmarAcao = async () => {
    if ((actionType === "REFAZER" || actionType === "CANCELAR") && !feedback.trim()) {
      showToast("É obrigatório preencher o motivo da devolução/cancelamento.", "error");
      return;
    }

    setLoading(true);
    let finalStatus = actionType === "APROVAR" ? "APROVADO" : actionType;

    try {
      const res = await fetch(`http://localhost:4000/document/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: finalStatus, feedback }),
      });

      if (!res.ok) throw new Error();

      showToast(`Documento ${finalStatus?.toLowerCase()} com sucesso!`, "success");
      setTimeout(() => router.push("/painel/analise"), 2000);
    } catch (error) {
      showToast("Erro ao processar a decisão.", "error");
      setLoading(false);
    }
  };

  if (!doc || !user) return <div className="p-10 text-gray-500 animate-pulse">A carregar detalhes...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10 relative">
      
      {/* Estilos para renderizar tabelas e alinhamentos do Editor no Painel */}
      <style dangerouslySetInnerHTML={{__html: `
        .html-content table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; }
        .html-content th, .html-content td { border: 1px solid #d1d5db; padding: 10px; font-size: 14px; }
        .html-content th { background-color: #f3f4f6; font-weight: bold; }
        .html-content .ql-align-center { text-align: center; }
        .html-content .ql-align-right { text-align: right; }
        .html-content .ql-align-justify { text-align: justify; }
        .html-content p { margin-bottom: 0.75rem; }
      `}} />

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span>
          {toast.msg}
        </div>
      )}

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>
          LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Análise de Documento</span>
        </h1>
        <button onClick={() => router.push("/painel/analise")} className="text-blue-200 hover:text-white font-semibold transition-colors">
          Voltar à Fila
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gray-100 p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <span className="font-mono font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-md text-sm border border-blue-200 inline-block mb-2">
                {doc.type} Nº {doc.protocolNum}/{doc.year}
              </span>
              <h2 className="text-xl font-bold text-gray-800">{doc.gabinete?.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Criado por: {doc.author?.name} em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-gray-800">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ementa</h3>
              <p className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-lg font-medium">{doc.ementa}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Secretaria de Destino</h3>
                <p className="font-semibold">{doc.secretariaDestino || 'Não especificada'}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Titular</h3>
                <p className="font-semibold">{doc.nomeSecretario || 'Não especificado'}</p>
              </div>
            </div>

            <hr className="border-gray-100" />

            {doc.motivo && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Motivo da Indicação</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">{doc.motivo}</div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Conteúdo / Justificativa</h3>
              {/* Renderização rica interpretando HTML e Tabelas do Quill */}
              <div 
                className="bg-gray-50 p-4 rounded-lg border border-gray-100 html-content"
                dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}
              ></div>
            </div>
          </div>
        </div>

        {/* PAINEL DE DECISÃO (UX) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">Decisão da Secretaria</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button 
              onClick={() => setActionType("APROVAR")}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all border-2 ${actionType === "APROVAR" ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-white text-green-700 border-green-200 hover:bg-green-50"}`}
            >
              ✅ Aprovar para Pauta
            </button>
            <button 
              onClick={() => setActionType("REFAZER")}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all border-2 ${actionType === "REFAZER" ? "bg-orange-500 text-white border-orange-500 shadow-md" : "bg-white text-orange-600 border-orange-200 hover:bg-orange-50"}`}
            >
              ↩️ Devolver (Refazer)
            </button>
            <button 
              onClick={() => setActionType("CANCELAR")}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all border-2 ${actionType === "CANCELAR" ? "bg-red-600 text-white border-red-600 shadow-md" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}
            >
              ❌ Cancelar Definitivo
            </button>
          </div>

          {/* Abre campo de feedback se escolher Refazer ou Cancelar */}
          {(actionType === "REFAZER" || actionType === "CANCELAR") && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Motivo {actionType === "REFAZER" ? "da devolução" : "do cancelamento"} (Obrigatório)
              </label>
              <textarea 
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explique ao gabinete o que precisa ser corrigido ou por que o documento foi rejeitado..."
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>
          )}

          {actionType && (
            <div className="flex justify-end pt-2">
              <button 
                disabled={loading}
                onClick={handleConfirmarAcao}
                className="bg-blue-600 text-white hover:bg-blue-700 font-bold py-3 px-8 rounded-lg transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? "A processar..." : "Confirmar Decisão"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}