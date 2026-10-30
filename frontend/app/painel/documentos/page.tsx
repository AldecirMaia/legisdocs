"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  createdAt: string;
}

export default function MeusDocumentos() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [documentos, setDocumentos] = useState<DocList[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Novos estados para substituir os alertas padrão do JS
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [docToSign, setDocToSign] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const carregarDocumentos = async (gabineteId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/gabinete/${gabineteId}`);
      const data = await res.json();
      setDocumentos(data);
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
    
    carregarDocumentos(parsedUser.gabineteId);
  }, [router]);

  

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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ENVIADO' }),
      });

      if (res.ok) {
        showToast("Documento assinado e enviado com sucesso!", "success");
        if (user) carregarDocumentos(user.gabineteId);
      } else {
        showToast("Erro ao assinar o documento.", "error");
      }
    } catch (error) {
      console.error("Erro ao assinar:", error);
      showToast("Erro de conexão com o servidor.", "error");
    } finally {
      setIsSigning(false);
      setDocToSign(null); // Fecha o modal
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

  if (!user) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10 relative">
      
      {/* Notificação Toast Customizada */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Modal Customizado de Confirmação */}
      {docToSign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assinar Documento</h3>
            <p className="text-gray-600 text-sm mb-6">
              Tem a certeza que deseja assinar digitalmente e enviar este documento para a secretaria? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDocToSign(null)} 
                disabled={isSigning} 
                className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmarAssinatura} 
                disabled={isSigning} 
                className="px-4 py-2 bg-yellow-500 text-yellow-900 font-bold hover:bg-yellow-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isSigning ? "A processar..." : "✍️ Assinar e Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>
          LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Meus Documentos</span>
        </h1>
        <Link href="/painel" className="text-blue-200 hover:text-white font-semibold transition-colors">
          Voltar ao Painel
        </Link>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Histórico de Documentos</h2>
            <p className="text-gray-600 mt-1">Acompanhe o andamento das suas indicações e requerimentos.</p>
          </div>
          <Link 
            href="/painel/indicacao/nova"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm"
          >
            + Novo Documento
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500 animate-pulse">A carregar documentos...</div>
          ) : documentos.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-gray-500 font-medium">Nenhum documento encontrado.</p>
              <p className="text-sm text-gray-400 mt-1">Os documentos que criar aparecerão aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documentos.map((doc) => (
                <li key={doc.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-start">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-100">
                        {doc.protocolNum > 0 ? `${doc.type} Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : `${doc.type} (Sem Número)`}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(doc.status)}`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium line-clamp-2 mt-1">{doc.ementa}</p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
                      <span>Destino: {doc.secretariaDestino || 'N/A'}</span>
                      <span>•</span>
                      <span>Autor: {doc.author?.name}</span>
                      <span>•</span>
                      <span>Criado em: {new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>

                    {(doc.status === "REFAZER" || doc.status === "CANCELADO") && doc.feedbackSecretaria && (
                      <div className={`mt-3 p-3 rounded-lg text-sm border ${doc.status === "REFAZER" ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                        <strong className="flex items-center gap-1">
                          {doc.status === "REFAZER" ? "⚠️ Motivo da Devolução:" : "❌ Motivo do Cancelamento:"}
                        </strong> 
                        <span className="block mt-1">{doc.feedbackSecretaria}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 sm:mt-0 mt-2">
                    {doc.status === "RASCUNHO" || doc.status === "REFAZER" || (doc.status === "AGUARDANDO_ASSINATURA" && user.role === "ASSESSOR") ? (
                      <Link href={`/painel/documentos/${doc.id}`} className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors text-center">
                        Continuar Edição
                      </Link>
                    ) : (
                      <Link href={`/painel/documentos/${doc.id}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors text-center">
                        Visualizar
                      </Link>
                    )}

                    {doc.status === "AGUARDANDO_ASSINATURA" && user.role === "VEREADOR" && (
                      <button 
                        onClick={() => setDocToSign(doc.id)} 
                        className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600 font-bold text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        ✍️ Assinar e Enviar
                      </button>
                    )}

                    {doc.status === "APROVADO" && (
                      <a href={`/painel/documentos/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white hover:bg-green-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                        🖨️ PDF Oficial
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}