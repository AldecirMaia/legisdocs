"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MeusDocumentos() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    carregarDocumentos(parsedUser.gabineteId);
  }, [router]);

  const carregarDocumentos = async (gabineteId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/document/gabinete/${gabineteId}`);
      const data = await res.json();
      setDocumentos(data);
    } catch (error) {
      console.error("Erro ao carregar documentos", error);
    } finally {
      setLoading(false);
    }
  };

  // UX: Define as cores das etiquetas com base no status do documento
  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      RASCUNHO: "bg-gray-100 text-gray-700 border-gray-300",
      ENVIADO: "bg-blue-100 text-blue-700 border-blue-300",
      REFAZER: "bg-orange-100 text-orange-700 border-orange-300",
      CANCELADO: "bg-red-100 text-red-700 border-red-300",
      APROVADO: "bg-green-100 text-green-700 border-green-300",
    };
    return badges[status] || "bg-gray-100 text-gray-700";
  };

  if (!user) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>
          LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Meus Documentos</span>
        </h1>
        <button onClick={() => router.push("/painel")} className="text-blue-200 hover:text-white font-semibold transition-colors">
          Voltar ao Painel
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Histórico de Documentos</h2>
            <p className="text-gray-600 mt-1">Acompanhe o andamento das suas indicações e requerimentos.</p>
          </div>
          <button 
            onClick={() => router.push("/painel/indicacao/nova")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm"
          >
            + Novo Documento
          </button>
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
                <li key={doc.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-100">
                        {doc.type} Nº {String(doc.protocolNum).padStart(3, '0')}/{doc.year}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium line-clamp-2">{doc.ementa}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
                      <span>Destino: {doc.secretariaDestino || 'N/A'}</span>
                      <span>•</span>
                      <span>Autor: {doc.author?.name}</span>
                      <span>•</span>
                      <span>Criado em: {new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {doc.status === "RASCUNHO" || doc.status === "REFAZER" ? (
                      <a href={`/painel/documentos/${doc.id}`} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm px-4 py-2 rounded-lg transition-colors block text-center">
                        Continuar Edição
                      </a>
                    ) : (
                      <a href={`/painel/documentos/${doc.id}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors block text-center">
                        Visualizar
                      </a>
                    )}

                    {/* Botão de PDF Oficial: visível apenas se o documento estiver APROVADO */}
                    {doc.status === "APROVADO" && (
                      <a href={`/painel/documentos/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white hover:bg-green-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
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