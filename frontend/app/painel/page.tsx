"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Criamos um tipo para o TypeScript parar de reclamar do "any"
interface UserAuth {
  name: string;
  role: string;
  tenantId: string;
  gabineteId?: string;
  [key: string]: unknown;
}

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
          <button 
            onClick={handleLogout} 
            className="bg-blue-700 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
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
      
      {/* Atalho direto para o painel global de Super Admin */}
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

  useEffect(() => {
    const fetchFila = async () => {
      try {
        const res = await fetch(${`process.env.NEXT_PUBLIC_API_URL}/document/fila/${tenantId}`);
        const data = await res.json();
        setPendentesCount(data.length || 0);
      } catch (error) {
        console.error("Erro ao carregar quantidade da fila:", error);
      }
    };
    
    if (tenantId) fetchFila();
  }, [tenantId]);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Painel da Secretaria</h2>
      <p className="text-gray-600 mb-8">Faça a gestão da Câmara, gabinetes e pauta de sessões.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-blue-700 transition-colors">Gestão de Gabinetes</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">
            Crie novos gabinetes, registe vereadores e liberte acessos para assessores.
          </p>
          <Link href="/painel/gabinetes" className="block text-center w-full bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white py-2.5 rounded-lg font-semibold transition-all">
            Gerir Gabinetes
          </Link>
        </div>

        <div className="relative group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-yellow-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          {pendentesCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-white text-xs font-bold items-center justify-center border-2 border-white shadow-sm">
                {pendentesCount}
              </span>
            </span>
          )}
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-yellow-600 transition-colors">Fila de Análise</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">
            Aprove, mande refazer ou cancele as indicações e requerimentos recebidos.
          </p>
          <Link href="/painel/analise" className="block text-center w-full bg-yellow-50 text-yellow-700 group-hover:bg-yellow-500 group-hover:text-white py-2.5 rounded-lg font-semibold transition-all">
            Ver Documentos
          </Link>
        </div>

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-green-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-green-600 transition-colors">Pauta da Semana</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">
            Organize os documentos aprovados e feche a pauta para a sessão.
          </p>
          <Link href="/painel/pauta" className="block text-center w-full bg-green-50 text-green-700 group-hover:bg-green-600 group-hover:text-white py-2.5 rounded-lg font-semibold transition-all">
            Gerar Pauta
          </Link>
        </div>

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-purple-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-purple-700 transition-colors">Configurações</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">
            Defina o nome da Prefeita, Palácio e regras para gerar os PDFs Oficiais.
          </p>
          <Link href="/painel/configuracoes" className="block text-center w-full bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white py-2.5 rounded-lg font-semibold transition-all">
            Ajustar Parâmetros
          </Link>
        </div>
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
          <h3 className="font-bold text-xl mb-2 text-gray-800 group-hover:text-blue-700 transition-colors">Documentos</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">
            Redija e estruture um novo pedido ao executivo municipal (Prefeitura).
          </p>
          <Link href="/painel/indicacao/nova" className="block text-center w-full bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white py-2.5 rounded-lg font-semibold transition-all">
            Criar Documento
          </Link>
        </div>

        <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-gray-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h3 className="font-bold text-xl mb-2 text-gray-800">Rascunhos e Histórico</h3>
          <p className="text-sm text-gray-500 mb-6 min-h-[40px]">
            Documentos em andamento, enviados e aprovados pela Secretaria.
          </p>
          <Link href="/painel/documentos" className="block text-center w-full bg-gray-50 text-gray-700 group-hover:bg-blue-600 group-hover:text-white py-2.5 rounded-lg font-semibold transition-all">
            Ver Rascunhos e Histórico
          </Link>
        </div>
      </div>
    </div>
  );
}