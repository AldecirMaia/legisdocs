"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import { 
  Eye, Download, FileText, Building2, MonitorPlay, Vote, Lock, Users, 
  Search, Bell, ChevronDown, LayoutDashboard, FileClock, Calendar, 
  Settings, LogOut, AlertCircle, FileCheck, Menu, Plus, FileEdit,
  AlertTriangle, XCircle
} from 'lucide-react';

interface UserAuth {
  name: string;
  role: string;
  tenantId: string;
  gabineteId?: string;
  [key: string]: unknown;
}

interface Documento {
  id: string;
  type: string;
  year: number;
  protocolNum: number;
  ementa?: string;
  status: string;
  arquivoPdfUrl?: string;
  secretariaDestino?: string;
  feedbackSecretaria?: string;
  author?: { name: string };
  gabinete?: { name: string; };
  createdAt: string;
}

export default function Painel() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    const token = localStorage.getItem("legisdocs_token");
    
    if (!storedUser || !token) {
      router.push("/");
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    
    if (parsedUser.role === "SUPER_ADMIN") {
      router.push("/super-admin");
      return; 
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar o painel...</div>;

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div lang="pt-BR" className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0 shadow-sm">
          
          <div className="flex-1 max-w-xl flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-blue-600 p-1">
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative w-full hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar documentos, gabinetes, sessões..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 ml-2">
            <button className="relative text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            
            <div 
              className="relative cursor-pointer flex items-center gap-2 sm:gap-3" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{user.role.toLowerCase()}</span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center font-bold">
                {user.name.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
              
              <div className={`absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 transition-all z-50 ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
                  className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-xl"
                >
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8" onClick={() => setIsDropdownOpen(false)}>
          <div className="max-w-[1200px] mx-auto space-y-8">
            <div className="capitalize text-sm font-medium text-gray-500 mb-2">
              {hoje}
            </div>
            
            {user.role === "SECRETARIA" && <SecretariaDashboard user={user} />}
            {(user.role === "VEREADOR" || user.role === "ASSESSOR") && <GabineteDashboard user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
   DASHBOARD DA SECRETARIA
   ========================================================================= */
function SecretariaDashboard({ user }: { user: UserAuth }) {
  const tenantId = user.tenantId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const [pendentesCount, setPendentesCount] = useState(0);
  const [documentosAprovados, setDocumentosAprovados] = useState<Documento[]>([]);
  const [gabinetesCount, setGabinetesCount] = useState(0);
  const [proximaSessao, setProximaSessao] = useState<any>(null);
  const [modulosAtivos, setModulosAtivos] = useState({ plenario: true, atas: true, comissoes: false });
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  useEffect(() => {
    let isMounted = true;
    const fetchDadosReais = async () => {
      try {
        const token = localStorage.getItem("legisdocs_token");
        const headers = { 'Authorization': `Bearer ${token}` };

        const resTenant = await fetch(`${API_URL}/tenant/${tenantId}`, { headers });
        if (resTenant.ok && isMounted) {
          const data = await resTenant.json();
          setModulosAtivos({ 
            plenario: data.moduloPlenario ?? true, 
            atas: data.moduloAtas ?? true, 
            comissoes: data.moduloComissoes ?? false 
          });
        }

        const resFila = await fetch(`${API_URL}/document/fila/${tenantId}`, { headers });
        if (resFila.ok && isMounted) setPendentesCount((await resFila.json()).length || 0);

        const resDocs = await fetch(`${API_URL}/document/aprovados/${tenantId}`, { headers });
        if (resDocs.ok && isMounted) {
          const docs: Documento[] = await resDocs.json();
          docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setDocumentosAprovados(docs);
        }

        const resGab = await fetch(`${API_URL}/gabinete/list/${tenantId}`, { headers });
        if (resGab.ok && isMounted) setGabinetesCount((await resGab.json()).length || 0);

        const resSessao = await fetch(`${API_URL}/sessoes/tenant/${tenantId}`, { headers });
        if (resSessao.ok && isMounted) {
          const sessoes = await resSessao.json();
          const agendadas = sessoes.filter((s: any) => s.status === 'AGENDADA' || s.status === 'RASCUNHO');
          if (agendadas.length > 0) {
            agendadas.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
            setProximaSessao(agendadas[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do painel:", error);
      } finally {
        if (isMounted) setLoadingDocs(false);
      }
    };
    fetchDadosReais();
    return () => { isMounted = false; };
  }, [tenantId, API_URL]);

  const anoAtual = new Date().getFullYear();
  const aprovadosNesteAno = documentosAprovados.filter(doc => new Date(doc.createdAt).getFullYear() === anoAtual || doc.year === anoAtual).length;
  const formatarDataSessao = (dataISO: string) => new Date(dataISO).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.,', '');

  const documentosFiltrados = documentosAprovados.filter(doc => {
    const matchBusca = (
      doc.protocolNum?.toString().includes(busca) || 
      doc.ementa?.toLowerCase().includes(busca.toLowerCase()) || 
      doc.gabinete?.name.toLowerCase().includes(busca.toLowerCase())
    );
    return matchBusca && (filtroTipo === "Todos" || doc.type === filtroTipo);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Bom dia, {user.name.split(' ')[0]}</h2>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">Aqui está o que precisa da sua atenção hoje.</p>
      </div>

      {pendentesCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-4">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600 flex-shrink-0"><AlertCircle className="w-6 h-6" /></div>
            <div>
              <h3 className="text-orange-900 font-bold text-base sm:text-lg">{pendentesCount} documentos aguardam a sua análise</h3>
              <p className="text-orange-700 text-xs sm:text-sm">Verifique a fila e aprove ou mande refazer as indicações.</p>
            </div>
          </div>
          <Link href="/painel/analise" className="bg-orange-600 text-white font-bold py-2 sm:py-2.5 px-6 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap text-center text-sm sm:text-base">
            Revisar agora
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Na fila de análise</p>
          <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{pendentesCount}</span></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Aprovados em {anoAtual}</p>
          <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{aprovadosNesteAno}</span></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Próxima Sessão</p>
          <div className="mt-2">
            {proximaSessao ? (
              <>
                <span className="text-base sm:text-lg font-bold text-gray-900 capitalize">{formatarDataSessao(proximaSessao.data || proximaSessao.dataInicio)}</span>
                <p className="text-xs text-yellow-600 font-bold mt-1">Status: {proximaSessao.status}</p>
              </>
            ) : <span className="text-lg font-bold text-gray-400">Não agendada</span>}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Gabinetes Ativos</p>
          <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{gabinetesCount}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden mt-8">
        <div className="p-4 sm:p-5 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Biblioteca de documentos avaliados</h3>
              <p className="text-xs sm:text-sm text-gray-500">Pesquise, filtre e abra documentos já votados no plenário.</p>
            </div>
            <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Exportar lista
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar por nº de protocolo, ementa..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none" />
            </div>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500">
              <option value="Todos">Todos os tipos</option>
              <option value="INDICAÇÃO">Indicação</option>
              <option value="REQUERIMENTO">Requerimento</option>
              <option value="PROJETO_LEI">Projeto de Lei</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 font-bold w-48">Documento</th>
                <th className="p-4 font-bold min-w-[300px]">Ementa</th>
                <th className="p-4 font-bold">Gabinete / Entrada</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loadingDocs ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">A carregar documentos...</td></tr>
              ) : documentosFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum documento encontrado com estes filtros.</td></tr>
              ) : (
                documentosFiltrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/50 group transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-bold text-gray-900">{doc.type.replace('_', ' ')}</div>
                      <div className="text-gray-500 mt-0.5">Nº {doc.protocolNum}/{doc.year}</div>
                    </td>
                    <td className="p-4 align-top"><p className="text-gray-700 line-clamp-2 pr-4">{doc.ementa || <span className="text-gray-400 italic">Sem ementa</span>}</p></td>
                    <td className="p-4 align-top">
                      <div className="font-medium text-gray-800">{doc.gabinete?.name || '-'}</div>
                      <div className="text-gray-500 text-xs mt-1">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="p-4 align-top text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${doc.status.includes('APROVADO') ? 'bg-green-100 text-green-700' : doc.status.includes('REJEITADO') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {doc.status.includes('APROVADO') ? 'Aprovado' : doc.status.includes('REJEITADO') ? 'Rejeitado' : doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 align-top text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => window.open(doc.arquivoPdfUrl || `/painel/documentos/${doc.id}/pdf`, '_blank')} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Ver PDF"><Eye className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
    DASHBOARD DO GABINETE (LIMPO)
   ========================================================================= */
function GabineteDashboard({ user }: { user: UserAuth }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const [meusDocumentos, setMeusDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMeusDocumentos = async () => {
      if (!user.gabineteId) { setLoading(false); return; }
      try {
        const token = localStorage.getItem("legisdocs_token");
        const res = await fetch(`${API_URL}/document/gabinete/${user.gabineteId}`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok && isMounted) {
          const docs = await res.json();
          docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMeusDocumentos(docs);
        }
      } catch (error) { console.error(error); } finally { if (isMounted) setLoading(false); }
    };
    fetchMeusDocumentos();
    return () => { isMounted = false; };
  }, [user.gabineteId, API_URL]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      RASCUNHO: "bg-gray-100 text-gray-700", AGUARDANDO_ASSINATURA: "bg-yellow-100 text-yellow-800",
      ENVIADO: "bg-blue-100 text-blue-700", REFAZER: "bg-orange-100 text-orange-700",
      CANCELADO: "bg-red-100 text-red-700", APROVADO: "bg-green-100 text-green-700",
    };
    return badges[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800">Meu Gabinete</h2>
        <p className="text-gray-500 mt-1 text-sm sm:text-base font-medium">Acompanhe a produção legislativa e os status dos seus documentos.</p>
      </div>
      
      {/* LISTA DE PRODUÇÃO RECENTE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <FileClock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Produção Recente do Gabinete</h3>
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-gray-500 animate-pulse">A carregar documentos...</div>
        ) : meusDocumentos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhum documento registado.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {meusDocumentos.slice(0, 5).map((doc) => (
              <li key={doc.id} className="p-5 hover:bg-slate-50 flex flex-col lg:flex-row gap-5 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded text-xs">
                      {doc.protocolNum > 0 ? `${doc.type.replace('_', ' ')} Nº ${doc.protocolNum}/${doc.year}` : `Sem Número`}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${getStatusBadge(doc.status)}`}>{doc.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-slate-800 font-medium line-clamp-2 text-sm mb-2">{doc.ementa || "Sem ementa."}</p>
                </div>
                <div className="flex gap-2 items-center">
                   <Link href={`/painel/documentos/${doc.id}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs px-4 py-2 rounded-lg">Abrir</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}