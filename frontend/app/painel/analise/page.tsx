"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Bell, ChevronDown, Menu, LogOut, ArrowRight, ClipboardCheck, FileText } from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

export default function FilaDeAnalise() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    
    if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") {
      router.push("/painel");
      return;
    }
    
    setUser(parsedUser);
    carregarFila(parsedUser.tenantId);
  }, [router]);

  const carregarFila = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/fila/${tenantId}`);
      const data = await res.json();
      setDocumentos(data);
    } catch (error) {
      console.error("Erro ao carregar a fila de análise", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  // Filtragem local
  const documentosFiltrados = documentos.filter(doc => {
    const termoBusca = busca.toLowerCase();
    return (
      doc.ementa?.toLowerCase().includes(termoBusca) ||
      doc.gabinete?.name?.toLowerCase().includes(termoBusca) ||
      String(doc.protocolNum).includes(termoBusca) ||
      doc.type.toLowerCase().replace('_', ' ').includes(termoBusca)
    );
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500 font-medium">
        A carregar fila de análise...
      </div>
    );
  }

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
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
                  placeholder="Pesquisar documentos em toda a câmara..." 
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
                <span className="text-sm font-bold text-gray-700 leading-tight">{user.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{user.role.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {user.name.charAt(0)}
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

        {/* ÁREA DE CONTEÚDO */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* TÍTULO E BREADCRUMBS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link href="/painel" className="hover:text-blue-600 transition-colors">Início</Link>
                  <span>/</span>
                  <span className="font-semibold text-gray-700">Fila de Análise</span>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold text-gray-900">Fila de Análise</h2>
                  {!loading && documentos.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full border border-amber-200">
                      {documentos.length} a aguardar
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-1.5 text-sm">
                  Reveja e aprove os documentos submetidos pelos gabinetes para que entrem na pauta da sessão.
                </p>
              </div>

              {/* BARRA DE PESQUISA LOCAL */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filtrar por gabinete, tipo, nº..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none shadow-sm"
                />
              </div>
            </div>

            {/* LISTAGEM DE DOCUMENTOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-16 text-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 font-medium">A carregar documentos pendentes...</p>
                </div>
              ) : documentosFiltrados.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center bg-gray-50">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <ClipboardCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">Fila limpa!</h3>
                  <p className="text-gray-500 text-sm">
                    {busca ? "Nenhum documento corresponde à sua pesquisa." : "Não há nenhum documento a aguardar análise neste momento."}
                  </p>
                  {busca && (
                    <button onClick={() => setBusca('')} className="mt-4 text-blue-600 font-medium text-sm hover:underline">
                      Limpar filtro
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                        <th className="p-4 font-bold">Tipo / Nº</th>
                        <th className="p-4 font-bold min-w-[300px]">Ementa</th>
                        <th className="p-4 font-bold">Origem</th>
                        <th className="p-4 font-bold">Submissão</th>
                        <th className="p-4 font-bold text-right pr-6">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {documentosFiltrados.map((doc) => (
                        <tr key={doc.id} className="hover:bg-amber-50/30 group transition-colors">
                          
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-slate-800 tracking-tight">
                                {doc.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-1 ml-6">
                              Nº {doc.protocolNum > 0 ? doc.protocolNum : "S/N"}/{doc.year}
                            </div>
                          </td>
                          
                          <td className="p-4 align-top">
                            <p className="text-gray-700 font-medium line-clamp-2 pr-4 leading-relaxed" title={doc.ementa}>
                              {doc.ementa || <span className="text-gray-400 italic">Sem ementa</span>}
                            </p>
                          </td>
                          
                          <td className="p-4 align-top">
                            <div className="font-bold text-gray-800 text-[13px] uppercase">
                              {doc.gabinete?.name || "Desconhecido"}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1.5 font-medium truncate max-w-[150px]" title={`Destino: ${doc.secretariaDestino || 'N/A'}`}>
                              Destino: {doc.secretariaDestino || 'N/A'}
                            </div>
                          </td>

                          <td className="p-4 align-top text-gray-600 font-medium">
                            <div className="whitespace-nowrap">
                              {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              às {new Date(doc.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          
                          <td className="p-4 align-top text-right pr-6">
                            <Link 
                              href={`/painel/analise/${doc.id}`} 
                              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm active:scale-95 whitespace-nowrap"
                            >
                              Analisar <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}