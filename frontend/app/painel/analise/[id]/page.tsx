"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DocData {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  status: string;
  ementa: string;
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
  const [docId, setDocId] = useState("");
  const [doc, setDoc] = useState<DocData | null>(null);
  
  const [actionType, setActionType] = useState<"APROVAR" | "REFAZER" | "CANCELADO" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    params.then((res) => {
      setDocId(res.id);
      carregarDocumento(res.id);
    });
  }, [params]);

  const carregarDocumento = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/document/detalhe/${id}`);
      const data = await res.json();
      setDoc(data);
    } catch (error) {
      console.error(error);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmarAcao = async () => {
    if ((actionType === "REFAZER" || actionType === "CANCELADO") && !feedback.trim()) {
      return showToast("Obrigatório: Informe o motivo da devolução/cancelamento para o gabinete.", "error");
    }

    setLoading(true);
    let finalStatus = actionType === "APROVAR" ? "APROVADO" : actionType;

    try {
      await fetch(`http://localhost:4000/document/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Correção: enviamos as duas variações para garantir que a API apanha o texto 
        body: JSON.stringify({ status: finalStatus, feedback: feedback, feedbackSecretaria: feedback }),
      });
      
      showToast("Decisão registada com sucesso!", "success");
      setTimeout(() => router.push("/painel"), 2000);
    } catch (error) {
      showToast("Erro ao processar a decisão.", "error");
      setLoading(false);
    }
  };

  if (!doc) return <div className="p-10 text-gray-500 animate-pulse">A carregar documento...</div>;

  const dataFormatada = new Date(doc.createdAt).toLocaleDateString("pt-BR");

  return (
    <div lang="pt-BR" className="min-h-screen bg-gray-50 flex flex-col pb-10 relative">
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span> {toast.msg}
        </div>
      )}

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          LegisDocs <span className="text-sm text-blue-300 ml-2">/ Análise de Documento</span>
        </h1>
        <Link href="/painel" className="text-blue-200 hover:text-white font-semibold transition-colors">
          Voltar
        </Link>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{doc.gabinete?.name || "Gabinete"}</h2>
            <p className="text-gray-500 mt-1">Criado por: {doc.author?.name} em {dataFormatada}</p>
          </div>
          <div className="mt-4 sm:mt-0 font-mono font-bold text-blue-900 bg-blue-100 px-4 py-2 rounded-lg border border-blue-200">
  {doc.protocolNum > 0 ? `${doc.type} Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : `${doc.type} (Cancelado)`}
</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ementa</h3>
              <p className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-medium text-gray-800 text-sm leading-relaxed">
                {doc.ementa}
              </p>
            </div>

            {(doc.secretariaDestino || doc.nomeSecretario) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Secretaria de Destino</h3>
                  <p className="font-bold text-gray-800">{doc.secretariaDestino || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Titular</h3>
                  <p className="font-bold text-gray-800">{doc.nomeSecretario || "N/A"}</p>
                </div>
              </div>
            )}

            {doc.motivo && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Motivo da Indicação</h3>
                <p className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800 text-sm leading-relaxed">
                  {doc.motivo}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Conteúdo / Justificativa</h3>
              <style dangerouslySetInnerHTML={{__html: `
                .html-content { white-space: pre-wrap !important; word-wrap: break-word !important; overflow-wrap: break-word !important; overflow-x: hidden !important; color: #111827 !important; }
                .html-content * { color: #111827 !important; opacity: 1 !important; }
                .html-content table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; margin: 1rem 0; }
                .html-content td, .html-content th { border: 1px solid #d1d5db; padding: 8px; white-space: normal !important; word-break: break-word !important; }
                .html-content p { margin-bottom: 0.75rem; }
              `}} />
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 html-content max-h-[500px] overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h3 className="font-bold text-xl text-gray-800 mb-6">Decisão da Secretaria</h3>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button onClick={() => { setActionType("APROVAR"); setFeedback(""); }} className={`flex-1 py-3.5 rounded-lg font-bold border-2 transition-all flex justify-center items-center gap-2 ${actionType === "APROVAR" ? "bg-green-600 border-green-600 text-white shadow-md" : "bg-white border-green-200 text-green-700 hover:bg-green-50"}`}>
              ✅ Aprovar para Pauta
            </button>
            <button onClick={() => setActionType("REFAZER")} className={`flex-1 py-3.5 rounded-lg font-bold border-2 transition-all flex justify-center items-center gap-2 ${actionType === "REFAZER" ? "bg-orange-500 border-orange-500 text-white shadow-md" : "bg-white border-orange-200 text-orange-600 hover:bg-orange-50"}`}>
              🔄 Devolver (Refazer)
            </button>
            <button onClick={() => setActionType("CANCELADO")} className={`flex-1 py-3.5 rounded-lg font-bold border-2 transition-all flex justify-center items-center gap-2 ${actionType === "CANCELADO" ? "bg-red-600 border-red-600 text-white shadow-md" : "bg-white border-red-200 text-red-600 hover:bg-red-50"}`}>
              ❌ Cancelar Definitivo
            </button>
          </div>

          {(actionType === "REFAZER" || actionType === "CANCELADO") && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Motivo da Devolução / Cancelamento (Obrigatório) <span className="text-red-500">*</span>
              </label>
              <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Explique ao gabinete o que precisa ser corrigido..." className="w-full border border-gray-300 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}

          {actionType && (
            <button disabled={loading} onClick={handleConfirmarAcao} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-lg shadow-md transition-colors disabled:opacity-50">
              {loading ? "A Guardar Decisão..." : "Confirmar e Enviar Decisão"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}