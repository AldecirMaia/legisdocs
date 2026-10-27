"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Download, FileText, Folder, FolderOpen, Building2 } from 'lucide-react';

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
        {user.role === "SECRETARIA" && <SecretariaDashboard tenantId={user.tenantId} />}
        {(user.role === "VEREADOR" || user.role === "ASSESSOR") && <GabineteDashboard />}
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

function SecretariaDashboard({ tenantId }: { tenantId: string }) {
  const [pendentesCount, setPendentesCount] = useState(0);
  const [documentosAgrupados, setDocumentosAgrupados] = useState<AgrupamentoDocs>({});
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let isMounted = true;

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

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Painel da Secretaria</h2>
      <p className="text-gray-600 mb-8">Faça a gestão da Câmara, gabinetes e pauta de sessões.</p>
      
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-blue-700">Gestão de Gabinetes</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Crie novos gabinetes, registe vereadores e liberte acessos.</p>
          <Link href="/painel/gabinetes" className="block text-center w-full bg-blue-50 text-blue-700 py-2.5 rounded-lg font-semibold">Gerir Gabinetes</Link>
        </div>

        <div className="relative group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-yellow-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          {pendentesCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-white text-xs font-bold items-center justify-center border-2 border-white shadow-sm">{pendentesCount}</span>
            </span>
          )}
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-yellow-600">Fila de Análise</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Aprove ou mande refazer as indicações e requerimentos recebidos.</p>
          <Link href="/painel/analise" className="block text-center w-full bg-yellow-50 text-yellow-700 py-2.5 rounded-lg font-semibold">Ver Documentos</Link>
        </div>

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-green-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-green-600">Pauta da Semana</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Organize os documentos aprovados e feche a pauta para a sessão.</p>
          <Link href="/painel/pauta" className="block text-center w-full bg-green-50 text-green-700 py-2.5 rounded-lg font-semibold">Gerar Pauta</Link>
        </div>

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-purple-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-purple-700">Configurações</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Defina o nome da Prefeita, Palácio e regras para gerar PDFs.</p>
          <Link href="/painel/configuracoes" className="block text-center w-full bg-purple-50 text-purple-700 py-2.5 rounded-lg font-semibold">Ajustar Parâmetros</Link>
        </div>
      </div>

      <hr className="my-10 border-gray-200" />

      {/* Seção da Biblioteca de Documentos */}
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
            {/* NÍVEL 1: GABINETES (Fechado por Padrão) */}
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
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GabineteDashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Meu Gabinete</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-blue-700">Documentos</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Redija e estruture um novo pedido ao executivo municipal.</p>
          <Link href="/painel/indicacao/nova" className="block text-center w-full bg-blue-50 text-blue-700 py-2.5 rounded-lg font-semibold">Criar Documento</Link>
        </div>
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-gray-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h3 className="font-bold text-xl mb-2 text-gray-800">Rascunhos e Histórico</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Documentos em andamento, enviados e aprovados pela Secretaria.</p>
          <Link href="/painel/documentos" className="block text-center w-full bg-gray-50 text-gray-700 py-2.5 rounded-lg font-semibold">Ver Histórico</Link>
        </div>
      </div>
    </div>
  );
}