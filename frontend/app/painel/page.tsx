"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Download, FileText, Folder, FolderOpen, Building2, MonitorPlay, Vote, Lock, Users } from 'lucide-react';

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
  gabinete?: {
    name: string;
  };
  createdAt: string;
}

type AgrupamentoDocs = Record<string, Record<number, Record<string, Documento[]>>>;

export default function Painel() {
  const router = useRouter();
  const [user, setUser] = useState<UserAuth | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    const token = localStorage.getItem("legisdocs_token");

    if (!storedUser || !token) {
      router.push("/");
      return;
    }

    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center">A carregar...</div>;

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  return (
    <div lang="pt-BR" className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">LegisDocs</h1>
          <span className="bg-blue-600 text-xs px-2 py-1 rounded-full uppercase tracking-wider ml-4">
            {user.role}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Olá, {user.name}</span>
          <button onClick={handleLogout} className="bg-blue-700 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full">
        {user.role === "SUPER_ADMIN" && <SuperAdminDashboard />}
        {user.role === "SECRETARIA" && <SecretariaDashboard user={user} />}
        {(user.role === "VEREADOR" || user.role === "ASSESSOR") && <GabineteDashboard user={user} />}
      </main>
    </div>
  );
}

function SuperAdminDashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Administração Geral</h2>
      <p className="text-gray-600 mb-8">Área reservada para criar e bloquear Câmaras (Tenants) e contas Master.</p>
      <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold">Painel de Controlo SaaS</h3>
          <p className="text-purple-200 text-sm mt-1">Gerencie todas as Câmaras Municipais, adicione novos tenants e monitore o sistema.</p>
        </div>
        <Link href="/super-admin" className="bg-white text-purple-900 font-bold px-6 py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-sm whitespace-nowrap">
          👑 Abrir Gestão de Câmaras
        </Link>
      </div>
    </div>
  );
}

function SecretariaDashboard({ user }: { user: UserAuth }) {
  const tenantId = user.tenantId;
  const [pendentesCount, setPendentesCount] = useState(0);
  const [documentosAgrupados, setDocumentosAgrupados] = useState<AgrupamentoDocs>({});
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  const [modulosAtivos, setModulosAtivos] = useState({ plenario: false, atas: false, comissoes: false });
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let isMounted = true;

    const fetchModulos = async () => {
      try {
        const token = localStorage.getItem("legisdocs_token");
const res = await fetch(`${API_URL}/tenant/${tenantId}`, {
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  }
});
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setModulosAtivos({ 
              plenario: data.moduloPlenario || false, 
              atas: data.moduloAtas || false,
              comissoes: data.moduloComissoes || false
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar permissões de módulos:", error);
      }
    };

    const fetchFila = async () => {
      try {
        const res = await fetch(`${API_URL}/document/fila/${tenantId}`);
        const data = await res.json();
        if (isMounted) setPendentesCount(data.length || 0);
      } catch (error) {
        console.error("Erro ao carregar quantidade da fila:", error);
      }
    };

    const fetchDocumentosAprovados = async () => {
      try {
        const token = localStorage.getItem("legisdocs_token");
        const response = await fetch(`${API_URL}/document/aprovados/${tenantId}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) throw new Error('Erro ao buscar documentos do backend.');
        
        const data: Documento[] = await response.json();

        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

        if (isMounted) {
          setDocumentosAgrupados(agrupados);
        }
      } catch (error) {
        console.error("Erro ao agrupar documentos:", error);
      } finally {
        if (isMounted) {
          setLoadingDocs(false);
        }
      }
    };

    if (tenantId) {
      fetchModulos();
      fetchFila();
      fetchDocumentosAprovados();
    }

    return () => {
      isMounted = false;
    };
  }, [tenantId, API_URL]);

  const handleVisualizar = (id: string, url?: string) => {
    const pdfUrl = url || `/painel/documentos/${id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  const handleBaixarPdf = (id: string, tipo: string, num: number, ano: number, url?: string) => {
    const pdfUrl = url || `/painel/documentos/${id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'APROVADO_PLENARIO' || status === 'APROVADO') {
      return <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ml-2 shadow-sm">Aprovado no Plenário</span>;
    }
    if (status === 'REJEITADO_PLENARIO' || status === 'CANCELADO') {
      return <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ml-2 shadow-sm">Rejeitado no Plenário</span>;
    }
    return null;
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Painel da Secretaria</h2>
      <p className="text-gray-600 mb-8">Faça a gestão da Câmara, gabinetes e pauta de sessões.</p>
      
      {/* ================= CARDS DA SECRETARIA ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 mb-12">
        
        {/* 1. Gestão de Gabinetes */}
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-blue-600">
            Gestão de Gabinetes
          </h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Crie novos gabinetes, registe vereadores e liberte acessos.</p>
          <Link href="/painel/gabinetes" className="block text-center w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg font-semibold transition-colors">
            Gerir Gabinetes
          </Link>
        </div>

        {/* 2. Fila de Análise */}
        <div className="relative group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-yellow-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
          {pendentesCount > 0 && (
            <div className="absolute -top-3 -right-3 flex items-center justify-center bg-red-500 text-white text-sm font-black w-8 h-8 rounded-full shadow-lg animate-bounce border-2 border-white z-10">
              {pendentesCount}
            </div>
          )}
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-yellow-600">
            Fila de Análise
          </h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Aprove ou mande refazer as indicações e requerimentos recebidos.</p>
          <Link href="/painel/analise" className="block text-center w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-700 py-2.5 rounded-lg font-semibold transition-colors">
            Ver Documentos
          </Link>
        </div>

        {/* 3. Pauta da Semana */}
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-green-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-green-600">
            Pauta da Semana
          </h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Organize os documentos aprovados e feche a pauta para a sessão.</p>
          <Link href="/painel/pauta" className="block text-center w-full bg-green-50 hover:bg-green-100 text-green-700 py-2.5 rounded-lg font-semibold transition-colors">
            Gerir Pauta
          </Link>
        </div>

        {/* 4. Central das Comissões (Kanban) */}
        {modulosAtivos.comissoes ? (
          <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-cyan-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-cyan-600">
              Central das Comissões
            </h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">Acompanhe pelo Kanban o andamento e os prazos dos projetos nas comissões.</p>
            <Link href="/painel/comissoes" className="block text-center w-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 py-2.5 rounded-lg font-semibold transition-colors">
              Abrir Kanban
            </Link>
          </div>
        ) : (
          <div className="group bg-slate-50 p-6 rounded-xl border border-slate-200 border-t-4 border-t-slate-300 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-slate-200 p-2 rounded-full"><Lock className="w-4 h-4 text-slate-500" /></div>
            <h3 className="font-bold text-xl mb-2 text-slate-500 flex items-center gap-2">Central das Comissões</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Acompanhe pelo Kanban o andamento e os prazos dos projetos nas comissões.</p>
            <a href="https://wa.me/5584999422487" target="_blank" rel="noreferrer" className="block text-center w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider">
              Desbloquear Módulo
            </a>
          </div>
        )}

        {/* 5. Gestão de Comissões */}
        {modulosAtivos.comissoes ? (
          <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-pink-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-pink-600">
              Gestão de Comissões
            </h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">Crie as comissões da Câmara e defina relatores, presidentes e membros.</p>
            <Link href="/painel/secretaria/comissoes" className="block text-center w-full bg-pink-50 hover:bg-pink-100 text-pink-700 py-2.5 rounded-lg font-semibold transition-colors">
              Gerir Comissões
            </Link>
          </div>
        ) : (
          <div className="group bg-slate-50 p-6 rounded-xl border border-slate-200 border-t-4 border-t-slate-300 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-slate-200 p-2 rounded-full"><Lock className="w-4 h-4 text-slate-500" /></div>
            <h3 className="font-bold text-xl mb-2 text-slate-500 flex items-center gap-2">Gestão de Comissões</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Crie as comissões da Câmara e defina relatores, presidentes e membros.</p>
            <a href="https://wa.me/5584999422487" target="_blank" rel="noreferrer" className="block text-center w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider">
              Desbloquear Módulo
            </a>
          </div>
        )}

        {/* 6. Plenário ao Vivo */}
        {modulosAtivos.plenario ? (
          <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-red-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-red-600 flex items-center gap-2">
              Plenário ao Vivo
            </h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">Controle a sessão e coloque documentos em votação no telão.</p>
            <Link href="/painel/sessao" className="block text-center w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition-colors shadow-sm">
              Abrir Controlo
            </Link>
          </div>
        ) : (
          <div className="group bg-slate-50 p-6 rounded-xl border border-slate-200 border-t-4 border-t-slate-300 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-slate-200 p-2 rounded-full"><Lock className="w-4 h-4 text-slate-500" /></div>
            <h3 className="font-bold text-xl mb-2 text-slate-500 flex items-center gap-2">Plenário ao Vivo</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Painel eletrónico, cronômetro e votações em tempo real no telão.</p>
            <a href="https://wa.me/5584999422487" target="_blank" rel="noreferrer" className="block text-center w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider">
              Desbloquear Módulo
            </a>
          </div>
        )}

        {/* 7. Atas e Relatórios */}
        {modulosAtivos.atas ? (
          <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-indigo-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-indigo-600">
              Atas e Relatórios
            </h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">Prepare e edite a Ata Oficial com o histórico de votações da sessão de hoje.</p>
            <Link href="/painel/ata" className="block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold transition-colors shadow-sm">
              Preparar Ata da Sessão
            </Link>
          </div>
        ) : (
          <div className="group bg-slate-50 p-6 rounded-xl border border-slate-200 border-t-4 border-t-slate-300 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-slate-200 p-2 rounded-full"><Lock className="w-4 h-4 text-slate-500" /></div>
            <h3 className="font-bold text-xl mb-2 text-slate-500 flex items-center gap-2">Atas e Relatórios</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Geração automática de Atas em PDF com histórico de votações.</p>
            <a href="https://wa.me/5584999422487" target="_blank" rel="noreferrer" className="block text-center w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider">
              Desbloquear Módulo
            </a>
          </div>
        )}

        {/* 8. Configurações */}
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-purple-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-purple-600">
            Configurações
          </h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Defina o nome da Prefeita, Palácio e regras para gerar PDFs.</p>
          <Link href="/painel/configuracoes" className="block text-center w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-2.5 rounded-lg font-semibold transition-colors">
            Ajustar Parâmetros
          </Link>
        </div>

      </div>

      <hr className="my-10 border-gray-200" />

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Biblioteca de Documentos Aprovados</h2>
        <p className="text-gray-600 mb-8">Navegue pelas pastas para ler ou descarregar documentos já avaliados.</p>

        {loadingDocs ? (
          <div className="p-8 text-center text-gray-600">A carregar pastas...</div>
        ) : Object.keys(documentosAgrupados).length === 0 ? (
          <p className="text-gray-500 text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            Nenhum documento aprovado encontrado no sistema.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(documentosAgrupados).map(([gabinete, anos]) => (
              <details key={gabinete} className="group/gabinete bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden [&_summary::-webkit-details-marker]:hidden open:shadow-md transition-all">
                <summary className="bg-slate-50 p-4 cursor-pointer list-none flex items-center justify-between hover:bg-slate-100 transition-colors group-open/gabinete:border-b border-gray-200">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-700" /> 
                    {gabinete}
                  </h2>
                  <div className="flex gap-2">
                    <span className="text-sm font-semibold bg-blue-100 text-blue-700 py-1.5 px-4 rounded-lg group-open/gabinete:hidden">
                      Abrir Pastas
                    </span>
                    <span className="text-sm font-semibold bg-gray-200 text-gray-700 py-1.5 px-4 rounded-lg hidden group-open/gabinete:block">
                      Recolher
                    </span>
                  </div>
                </summary>
                
                <div className="p-6 space-y-4 bg-white">
                  {Object.entries(anos).map(([ano, tipos]) => (
                    <details key={ano} className="group bg-gray-50 rounded-lg border border-gray-200 open:bg-white open:shadow-md transition-all">
                      <summary className="flex items-center gap-3 p-3 font-semibold cursor-pointer list-none text-gray-700 hover:text-blue-700 [&::-webkit-details-marker]:hidden">
                        <Folder className="w-6 h-6 text-yellow-500 group-open:hidden" />
                        <FolderOpen className="w-6 h-6 text-yellow-500 hidden group-open:block" />
                        Ano {ano}
                      </summary>
                      
                      <div className="p-4 pt-2 space-y-4 ml-4">
                        {Object.entries(tipos).map(([tipo, documentos]) => (
                          <details key={tipo} className="group/tipo bg-white rounded border border-gray-100 open:border-blue-100">
                            <summary className="flex items-center gap-2 p-2 font-medium cursor-pointer list-none text-gray-600 hover:text-blue-600 [&::-webkit-details-marker]:hidden">
                              <Folder className="w-5 h-5 text-blue-400 group-open/tipo:hidden" />
                              <FolderOpen className="w-5 h-5 text-blue-400 hidden group-open/tipo:block" />
                              {tipo} <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full ml-2">{documentos.length}</span>
                            </summary>
                            
                            <ul className="divide-y divide-gray-100 border-l-2 border-blue-50 ml-4 mt-2">
                              {documentos.map((doc) => (
                                <li key={doc.id} className="p-4 pl-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 gap-4">
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-800 flex items-center flex-wrap gap-1">
                                      <FileText className="w-4 h-4 text-gray-400" />
                                      <span className="mr-1">{doc.type.replace('_', ' ')} Nº {doc.protocolNum}/{doc.year}</span>
                                      {renderStatusBadge(doc.status)}
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
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GabineteDashboard({ user }: { user: UserAuth }) {
  const role = user.role;
  const tenantId = user.tenantId;
  const [moduloComissoes, setModuloComissoes] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchModulos = async () => {
      try {
        const res = await fetch(`${API_URL}/tenant/${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setModuloComissoes(data.moduloComissoes || false);
        }
      } catch (error) {
        console.error("Erro ao carregar permissões de módulos:", error);
      }
    };
    if (tenantId) fetchModulos();
  }, [tenantId, API_URL]);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Meu Gabinete</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {role === "VEREADOR" && (
          <div className="group bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 border-t-4 border-t-green-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-white group-hover:text-green-400 flex items-center gap-2">
              <Vote className="w-5 h-5" /> Painel de Votação
            </h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Terminal exclusivo para cravar o seu voto nas sessões plenárias.</p>
            <Link href="/painel/terminal" className="block text-center w-full bg-green-600 text-white hover:bg-green-500 py-2.5 rounded-lg font-bold transition-colors">Entrar na Sessão</Link>
          </div>
        )}

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-blue-700">Documentos</h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Redija e estruture um novo pedido ao executivo municipal.</p>
          <Link href="/painel/indicacao/nova" className="block text-center w-full bg-blue-50 text-blue-700 py-2.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors">Criar Documento</Link>
        </div>

        {/* MINHAS COMISSÕES (COM TRAVA DE UPSSELL) */}
        {moduloComissoes ? (
          <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-cyan-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col relative">
            <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-cyan-600 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" /> Comissões
            </h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">Acompanhe projetos, emita pareceres e assine deliberações conjuntas.</p>
            <Link href="/painel/comissoes" className="block text-center w-full bg-cyan-50 text-cyan-700 py-2.5 rounded-lg font-semibold hover:bg-cyan-100 transition-colors">Acessar Kanban</Link>
          </div>
        ) : (
          <div className="group bg-slate-50 p-6 rounded-xl border border-slate-200 border-t-4 border-t-slate-300 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-slate-200 p-2 rounded-full"><Lock className="w-4 h-4 text-slate-500" /></div>
            <h3 className="font-bold text-xl mb-2 text-slate-500 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" /> Comissões
            </h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">Acompanhe projetos, emita pareceres e assine deliberações conjuntas.</p>
            <a href="https://wa.me/5584999422487" target="_blank" rel="noreferrer" className="block text-center w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider">
              Desbloquear Módulo
            </a>
          </div>
        )}

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-gray-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col">
          <h3 className="font-bold text-xl mb-2 text-gray-800">Histórico</h3>
          <p className="text-sm text-gray-500 mb-6 flex-1">Documentos em andamento, enviados e aprovados pela Secretaria.</p>
          <Link href="/painel/documentos" className="block text-center w-full bg-gray-50 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Ver Histórico</Link>
        </div>
      </div>
    </div>
  );
}