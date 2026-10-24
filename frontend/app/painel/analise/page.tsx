"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FilaDeAnalise() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    
    // Proteção de Rota: Apenas a Secretaria pode aceder a esta página
    if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") {
      router.push("/painel");
      return;
    }
    
    setUser(parsedUser);
    carregarFila(parsedUser.tenantId);
  }, [router]);

  const carregarFila = async (tenantId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/document/fila/${tenantId}`);
      const data = await res.json();
      setDocumentos(data);
    } catch (error) {
      console.error("Erro ao carregar a fila de análise", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>
          LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Fila de Análise</span>
        </h1>
        <button onClick={() => router.push("/painel")} className="text-blue-200 hover:text-white font-semibold transition-colors">
          Voltar ao Painel
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Fila de Análise</h2>
          {!loading && documentos.length > 0 && (
            <span className="bg-yellow-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">
              {documentos.length} pendente(s)
            </span>
          )}
        </div>
        <p className="text-gray-600 mb-8">Documentos enviados pelos gabinetes que aguardam aprovação para entrar na pauta.</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500 animate-pulse">A carregar documentos...</div>
          ) : documentos.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center bg-gray-50">
              <span className="text-5xl mb-4 grayscale opacity-50">🎉</span>
              <p className="text-gray-600 font-bold text-lg">Fila limpa!</p>
              <p className="text-sm text-gray-400 mt-1">Não há nenhum documento a aguardar análise neste momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documentos.map((doc) => (
                <li key={doc.id} className="p-5 hover:bg-blue-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-center group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded text-sm border border-blue-200">
                        {doc.type} Nº {doc.protocolNum}/{doc.year}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        {doc.gabinete?.name}
                      </span>
                    </div>
                    <p className="text-gray-800 font-semibold mb-1 line-clamp-2">{doc.ementa}</p>
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                      <span>Destino: {doc.secretariaDestino || 'N/A'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>Enviado em: {new Date(doc.createdAt).toLocaleDateString('pt-BR')} às {new Date(doc.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                  
                  <div className="flex shrink-0">
                    <a href={`/painel/analise/${doc.id}`} className="block text-center bg-yellow-100 text-yellow-800 hover:bg-yellow-500 hover:text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-sm group-hover:shadow-md">
  Analisar Documento
</a>
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