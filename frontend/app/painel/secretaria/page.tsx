'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Eye, Download, FileText, Folder, FolderOpen, Building2, 
  Library, Search, Bell, ChevronDown, Menu, LogOut 
} from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';

interface Documento {
  id: string;
  type: string;
  year: number;
  protocolNum: number;
  ementa?: string;
  status: string;
  fileUrl?: string; // Propriedade correta vinda do backend
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
  const [user, setUser] = useState<any>(null);
  const [documentosAgrupados, setDocumentosAgrupados] = useState<AgrupamentoDocs>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        const response = await fetch(`${API_URL}/document/aprovados-secretaria/${parsedUser.tenantId}`, {
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

  // Lógica corrigida para Visualizar
  const handleVisualizar = (doc: Documento) => {
    // Se não houver URL de ficheiro anexado, usa a rota dinâmica do frontend
    const pdfUrl = doc.fileUrl || doc.arquivoPdfUrl || `/painel/documentos/${doc.id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  // Lógica corrigida para Download
  const handleBaixarPdf = (doc: Documento) => {
    const pdfUrl = doc.fileUrl || doc.arquivoPdfUrl || `/painel/documentos/${doc.id}/pdf`;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${doc.type}_${doc.protocolNum}_${doc.year}.pdf`;
    link.target = '_blank'; // Abre num novo separador caso o navegador bloqueie o download direto de rotas internas
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500 font-medium">
        A carregar biblioteca de documentos...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-red-600 font-bold mb-4">{errorMessage}</p>
        <button onClick={() => router.push("/")} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
          Ir para o Login
        </button>
      </div>
    );
  }

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* 1. COMPONENTE SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 2. ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* CABEÇALHO SUPERIOR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-800">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex max-w-xl items-center w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar documentos na biblioteca..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-4">
            <button className="relative text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
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
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Breadcrumbs e Título */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link href="/painel" className="hover:text-blue-600 transition-colors">Início</Link>
                <span>/</span>
                <span className="font-semibold text-gray-700">Biblioteca da Secretaria</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Biblioteca da Secretaria</h2>
              <p className="text-gray-600 mt-1 text-sm">Navegue pelas pastas organizadas por Gabinete, Ano e Tipo de Documento para visualizar ou descarregar os ficheiros aprovados.</p>
            </div>

            {Object.keys(documentosAgrupados).length === 0 ? (
              <div className="text-gray-500 text-center bg-white p-12 rounded-xl shadow-sm border border-gray-200">
                <Library className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-bold text-gray-700">Nenhum documento aprovado encontrado.</p>
                <p className="text-xs text-gray-400 mt-1">Os documentos aprovados pela Secretaria serão listados aqui automaticamente.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* NÍVEL 1: GABINETES */}
                {Object.entries(documentosAgrupados).map(([gabinete, anos]) => (
                  <div key={gabinete} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-gray-200 p-4 sm:p-5">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-700" /> 
                        {gabinete}
                      </h3>
                    </div>
                    
                    <div className="p-4 sm:p-6 space-y-4">
                      {/* NÍVEL 2: ANOS */}
                      {Object.entries(anos).map(([ano, tipos]) => (
                        <details key={ano} className="group bg-gray-50 rounded-xl border border-gray-200 open:bg-white open:shadow-sm transition-all">
                          <summary className="flex items-center gap-3 p-4 font-semibold cursor-pointer list-none text-gray-800 hover:text-blue-700 [&::-webkit-details-marker]:hidden">
                            <Folder className="w-5 h-5 text-amber-500 group-open:hidden" />
                            <FolderOpen className="w-5 h-5 text-amber-500 hidden group-open:block" />
                            <span>Ano {ano}</span>
                          </summary>
                          
                          <div className="p-4 pt-1 space-y-4 sm:ml-4">
                            {/* NÍVEL 3: TIPO DE DOCUMENTO */}
                            {Object.entries(tipos).map(([tipo, documentos]) => (
                              <details key={tipo} className="group/tipo bg-white rounded-lg border border-gray-200 open:border-blue-200">
                                <summary className="flex items-center gap-2.5 p-3 font-semibold cursor-pointer list-none text-gray-700 hover:text-blue-600 [&::-webkit-details-marker]:hidden text-sm">
                                  <Folder className="w-4 h-4 text-blue-500 group-open/tipo:hidden" />
                                  <FolderOpen className="w-4 h-4 text-blue-500 hidden group-open/tipo:block" />
                                  <span>{tipo}</span>
                                  <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full border border-gray-200 ml-1">
                                    {documentos.length}
                                  </span>
                                </summary>
                                
                                {/* NÍVEL 4: LISTA DE DOCUMENTOS */}
                                <ul className="divide-y divide-gray-100 border-l-2 border-blue-100 ml-3 sm:ml-4 my-2">
                                  {documentos.map((doc) => (
                                    <li key={doc.id} className="p-4 pl-5 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 gap-4 transition-colors">
                                      <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                          {doc.type} Nº {doc.protocolNum}/{doc.year}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2" title={doc.ementa}>
                                          {doc.ementa || 'Sem ementa registada.'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-2 font-medium">
                                          Data de Entrada: {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                          onClick={() => handleVisualizar(doc)} 
                                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> Ver PDF
                                        </button>
                                        <button 
                                          onClick={() => handleBaixarPdf(doc)} 
                                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Download className="w-3.5 h-3.5" /> Baixar
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
        </main>
      </div>
    </div>
  );
}