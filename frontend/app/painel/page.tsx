"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import { 
  Eye, Download, FileText, Building2, MonitorPlay, Vote, Lock, Users, 
  Search, Bell, ChevronDown, LayoutDashboard, FileClock, Calendar, 
  Settings, LogOut, AlertCircle, FileCheck
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
  gabinete?: { name: string; };
  createdAt: string;
}

export default function Painel() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);

useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    
    // BLOQUEIO DE SEGURANÇA: Kicka vereadores e assessores de volta para o painel principal
    if (parsedUser.role === "VEREADOR" || parsedUser.role === "ASSESSOR") {
      router.push("/painel");
      return; // Interrompe a execução
    }

    setUser(parsedUser);
    // ... restante do seu código (carregar dados, etc)
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar o painel...</div>;

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      <Sidebar isOpen={true} onClose={() => {}} />

      {/* ================= ÁREA PRINCIPAL ================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex-1 max-w-xl flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar documentos, gabinetes, sessões..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-5 ml-4">
            <button className="relative text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{user.role.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {user.name.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Saudação Data */}
<div className="capitalize text-sm font-medium text-gray-500 mb-2">
  {hoje}
</div>
            {user.role === "SUPER_ADMIN" && <div className="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200">Visão do Super Admin (Ajuste conforme necessidade)</div>}
            {user.role === "SECRETARIA" && <SecretariaDashboard user={user} />}
            {(user.role === "VEREADOR" || user.role === "ASSESSOR") && <GabineteDashboard user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
   DASHBOARD DA SECRETARIA (DADOS REAIS APLICADOS)
   ========================================================================= */
function SecretariaDashboard({ user }: { user: UserAuth }) {
  const tenantId = user.tenantId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  // Estados Reais
  const [pendentesCount, setPendentesCount] = useState(0);
  const [documentosAprovados, setDocumentosAprovados] = useState<Documento[]>([]);
  const [gabinetesCount, setGabinetesCount] = useState(0);
  const [proximaSessao, setProximaSessao] = useState<any>(null);
  const [modulosAtivos, setModulosAtivos] = useState({ plenario: true, atas: true, comissoes: false });
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Filtros da Tabela
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  useEffect(() => {
    let isMounted = true;
    const fetchDadosReais = async () => {
      try {
        const token = localStorage.getItem("legisdocs_token");
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Busca Permissões (Modulos do Tenant)
        const resTenant = await fetch(`${API_URL}/tenant/${tenantId}`, { headers });
        if (resTenant.ok && isMounted) {
          const data = await resTenant.json();
          setModulosAtivos({ 
            plenario: data.moduloPlenario ?? true, 
            atas: data.moduloAtas ?? true, 
            comissoes: data.moduloComissoes ?? false 
          });
        }

        // 2. Busca Fila de Análise (Pendentes)
        const resFila = await fetch(`${API_URL}/document/fila/${tenantId}`, { headers });
        if (resFila.ok && isMounted) {
          const dataFila = await resFila.json();
          setPendentesCount(dataFila.length || 0);
        }

        // 3. Busca Documentos Aprovados
        const resDocs = await fetch(`${API_URL}/document/aprovados/${tenantId}`, { headers });
        if (resDocs.ok && isMounted) {
          const docs: Documento[] = await resDocs.json();
          docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setDocumentosAprovados(docs);
        }

        // 4. Busca Gabinetes Ativos (AJUSTE A ROTA CONFORME SEU CONTROLLER DE GABINETES)
        const resGab = await fetch(`${API_URL}/gabinete/list/${tenantId}`, { headers }); // ou /gabinete/tenant/...
        if (resGab.ok && isMounted) {
          const dataGab = await resGab.json();
          setGabinetesCount(dataGab.length || 0);
        }

        // 5. Busca Próxima Sessão Plenária (AJUSTE A ROTA CONFORME SEU CONTROLLER DE SESSÃO)
        const resSessao = await fetch(`${API_URL}/sessoes/tenant/${tenantId}`, { headers }); // ou /sessao/list/...
        if (resSessao.ok && isMounted) {
          const sessoes = await resSessao.json();
          // Pega a primeira que estiver AGENDADA ou RASCUNHO (Ajuste o status se necessário)
          const agendadas = sessoes.filter((s: any) => s.status === 'AGENDADA' || s.status === 'RASCUNHO');
          if (agendadas.length > 0) {
            // Ordena pela mais próxima
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

  // Cálculos Automáticos de KPIs
  const anoAtual = new Date().getFullYear();
  const aprovadosNesteAno = documentosAprovados.filter(doc => 
    new Date(doc.createdAt).getFullYear() === anoAtual || doc.year === anoAtual
  ).length;

  const formatarDataSessao = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', { 
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).replace('.,', '');
  };

  // Filtra os documentos baseados na busca
  const documentosFiltrados = documentosAprovados.filter(doc => {
    const matchBusca = (
      doc.protocolNum?.toString().includes(busca) || 
      doc.ementa?.toLowerCase().includes(busca.toLowerCase()) || 
      doc.gabinete?.name.toLowerCase().includes(busca.toLowerCase())
    );
    const matchTipo = filtroTipo === "Todos" || doc.type === filtroTipo;
    return matchBusca && matchTipo;
  });

  return (
    <div className="space-y-6">
      
      {/* SAUDAÇÃO */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Bom dia, {user.name.split(' ')[0]}</h2>
        <p className="text-gray-500 mt-1">Aqui está o que precisa da sua atenção hoje.</p>
      </div>

      {pendentesCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-4">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-orange-900 font-bold text-lg">{pendentesCount} documentos aguardam a sua análise</h3>
              <p className="text-orange-700 text-sm">Verifique a fila e aprove ou mande refazer as indicações.</p>
            </div>
          </div>
          <Link href="/painel/analise" className="bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap text-center">
            Revisar agora
          </Link>
        </div>
      )}

      {/* OS 4 INDICADORES REAIS (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Na fila de análise</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{pendentesCount}</span>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Aprovados em {anoAtual}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{aprovadosNesteAno}</span>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Próxima Sessão</p>
          <div className="mt-2">
            {proximaSessao ? (
              <>
                <span className="text-lg font-bold text-gray-900 capitalize">
                  {formatarDataSessao(proximaSessao.data || proximaSessao.dataInicio)}
                </span>
                <p className="text-xs text-yellow-600 font-bold mt-1">Status: {proximaSessao.status}</p>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-400">Não agendada</span>
            )}
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Gabinetes Ativos</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{gabinetesCount}</span>
          </div>
        </div>
      </div>

      {/* UPSELL MÓDULO DE COMISSÕES */}
      {!modulosAtivos.comissoes && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 shadow-md border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Módulo Adicional</span>
              <h3 className="font-bold text-xl flex items-center gap-2">Comissões <Lock className="w-4 h-4 text-slate-400" /></h3>
            </div>
            <p className="text-slate-300 text-sm mb-4 max-w-2xl">Leve a tramitação dos projetos para as comissões de forma digital. Elimine planilhas e integre pareceres, relatores e assinaturas conjuntas diretamente no sistema.</p>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1">✓ Kanban e Prazos</span>
              <span className="flex items-center gap-1">✓ Pareceres Digitais</span>
              <span className="flex items-center gap-1">✓ Assinatura Conjunta</span>
            </div>
          </div>
          <a href="https://wa.me/5584999422487" target="_blank" rel="noreferrer" className="bg-white text-slate-900 font-bold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap shadow-sm">
            Falar com um consultor
          </a>
        </div>
      )}

      {/* BIBLIOTECA EM TABELA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Biblioteca de documentos avaliados</h3>
              <p className="text-sm text-gray-500">Pesquise, filtre e abra documentos já votados no plenário.</p>
            </div>
            <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Exportar lista
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por nº de protocolo, ementa ou gabinete..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <select 
              value={filtroTipo} 
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            >
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
                    <td className="p-4 align-top">
                      <p className="text-gray-700 line-clamp-2 pr-4" title={doc.ementa}>
                        {doc.ementa || <span className="text-gray-400 italic">Sem ementa registrada</span>}
                      </p>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-medium text-gray-800">{doc.gabinete?.name || '-'}</div>
                      <div className="text-gray-500 text-xs mt-1">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="p-4 align-top text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider 
                        ${doc.status.includes('APROVADO') ? 'bg-green-100 text-green-700' : 
                          doc.status.includes('REJEITADO') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {doc.status.includes('APROVADO') ? 'Aprovado' : doc.status.includes('REJEITADO') ? 'Rejeitado' : doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 align-top text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => window.open(doc.arquivoPdfUrl || `/painel/documentos/${doc.id}/pdf`, '_blank')} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Ver PDF">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="text-gray-500 hover:bg-gray-200 p-2 rounded-lg transition-colors" title="Baixar">
                          <Download className="w-5 h-5" />
                        </button>
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
   DASHBOARD DO GABINETE
   ========================================================================= */
function GabineteDashboard({ user }: { user: UserAuth }) {
  const role = user.role;
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Meu Gabinete</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {role === "VEREADOR" && (
          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 border-t-4 border-t-green-500 flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-white flex items-center gap-2"><Vote className="w-5 h-5" /> Painel de Votação</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Terminal exclusivo para cravar o seu voto nas sessões plenárias.</p>
            <Link href="/painel/terminal" className="text-center w-full bg-green-600 text-white hover:bg-green-500 py-2.5 rounded-lg font-bold transition-colors">Entrar na Sessão</Link>
          </div>
        )}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-600 flex flex-col">
          <h3 className="font-bold text-xl mb-2 text-gray-800 flex items-center gap-2"><FileText className="w-5 h-5" /> Documentos</h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Redija e estruture um novo pedido ao executivo municipal.</p>
          <Link href="/painel/indicacao/nova" className="text-center w-full bg-blue-50 text-blue-700 py-2.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors">Criar Documento</Link>
        </div>
      </div>
    </div>
  );
}