'use client';

import { useEffect, useState } from 'react';
import { Eye, Download, FileText, Folder, FolderOpen, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Documento {
  id: string;
  type: string;
  year: number;
  protocolNum: number;
  ementa?: string;
  status: string;
  arquivoPdfUrl?: string;
  gabinete?: {
    name: string;
  };
  createdAt: string;
}

// Tipo para estruturar a árvore de dados: Gabinete -> Ano -> Tipo -> Lista de Docs
type AgrupamentoDocs = Record<string, Record<number, Record<string, Documento[]>>>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function DocumentosSecretaria() {
  const router = useRouter();
  const [documentosAgrupados, setDocumentosAgrupados] = useState<AgrupamentoDocs>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchDocumentosAprovados() {
      try {
        const storedUser = localStorage.getItem("legisdocs_user");
        const token = localStorage.getItem("legisdocs_token");

        if (!storedUser || !token) {
          setErrorMessage("Sessão expirada ou utilizador não autenticado.");
          setLoading(false);
          return;
        }

        const user = JSON.parse(storedUser);
        
        const response = await fetch(`${API_URL}/document/aprovados-secretaria/${user.tenantId}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) throw new Error('Erro ao buscar documentos');
        
        const data: Documento[] = await response.json();

        // Lógica para agrupar em três níveis: Gabinete -> Ano -> Tipo
        const agrupados = data.reduce((acc, doc) => {
          const nomeGabinete = doc.gabinete?.name || 'Gabinete Não Identificado';
          const ano = doc.year || new Date(doc.createdAt).getFullYear();
          const tipo = doc.type || 'OUTROS';

          if (!acc[nomeGabinete]) acc[nomeGabinete] = {};
          if (!acc[nomeGabinete][ano]) acc[nomeGabinete][ano] = {};
          if (!acc[nomeGabinete][ano][tipo]) acc[nomeGabinete][ano][tipo] = [];

          acc[nomeGabinete][ano][tipo].push(doc);
          return acc;
        }, {} as AgrupamentoDocs);

        setDocumentosAgrupados(agrupados);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocumentosAprovados();
  }, []);

  const handleVisualizar = (id: string, url?: string) => {
    const pdfUrl = url || `${API_URL}/document/view/${id}`;
    window.open(pdfUrl, '_blank');
  };

  const handleBaixarPdf = (id: string, tipo: string, num: number, ano: number, url?: string) => {
    const downloadUrl = url || `${API_URL}/document/download/${id}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${tipo}_${num}_${ano}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">A carregar biblioteca de documentos...</div>;
  }

  if (errorMessage) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium mb-4">{errorMessage}</p>
        <button onClick={() => router.push("/")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
          Ir para o Login
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Biblioteca da Secretaria</h1>
          <p className="text-gray-500 mt-1">Navegue pelas pastas para ler ou baixar documentos aprovados.</p>
        </div>
        <button onClick={() => router.push("/painel")} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">
          Voltar ao Painel
        </button>
      </div>

      {Object.keys(documentosAgrupados).length === 0 ? (
        <p className="text-gray-500 text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          Nenhum documento aprovado.
        </p>
      ) : (
        <div className="space-y-6">
          {/* NÍVEL 1: GABINETES */}
          {Object.entries(documentosAgrupados).map(([gabinete, anos]) => (
            <div key={gabinete} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-gray-200 p-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-blue-700" /> 
                  {gabinete}
                </h2>
              </div>
              
              <div className="p-4 space-y-4">
                {/* NÍVEL 2: ANOS */}
                {Object.entries(anos).map(([ano, tipos]) => (
                  <details key={ano} className="group bg-gray-50 rounded-lg border border-gray-200 open:bg-white open:shadow-md transition-all">
                    <summary className="flex items-center gap-3 p-3 font-semibold cursor-pointer list-none text-gray-700 hover:text-blue-700 [&::-webkit-details-marker]:hidden">
                      <Folder className="w-6 h-6 text-yellow-500 group-open:hidden" />
                      <FolderOpen className="w-6 h-6 text-yellow-500 hidden group-open:block" />
                      Ano {ano}
                    </summary>
                    
                    <div className="p-4 pt-2 space-y-4 ml-4">
                      {/* NÍVEL 3: TIPO DE DOCUMENTO */}
                      {Object.entries(tipos).map(([tipo, documentos]) => (
                        <details key={tipo} className="group/tipo bg-white rounded border border-gray-100 open:border-blue-100">
                          <summary className="flex items-center gap-2 p-2 font-medium cursor-pointer list-none text-gray-600 hover:text-blue-600 [&::-webkit-details-marker]:hidden">
                            <Folder className="w-5 h-5 text-blue-400 group-open/tipo:hidden" />
                            <FolderOpen className="w-5 h-5 text-blue-400 hidden group-open/tipo:block" />
                            {tipo} <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full ml-2">{documentos.length}</span>
                          </summary>
                          
                          {/* NÍVEL 4: LISTA DE DOCUMENTOS */}
                          <ul className="divide-y divide-gray-100 border-l-2 border-blue-50 ml-4 mt-2">
                            {documentos.map((doc) => (
                              <li key={doc.id} className="p-4 pl-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 gap-4">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    {doc.type} Nº {doc.protocolNum}/{doc.year}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2" title={doc.ementa}>
                                    {doc.ementa || 'Sem ementa registada.'}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    Data de Entrada: {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => handleVisualizar(doc.id, doc.arquivoPdfUrl)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Eye className="w-4 h-4" /> Ver PDF
                                  </button>
                                  <button onClick={() => handleBaixarPdf(doc.id, doc.type, doc.protocolNum, doc.year, doc.arquivoPdfUrl)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                    <Download className="w-4 h-4" /> Baixar
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}