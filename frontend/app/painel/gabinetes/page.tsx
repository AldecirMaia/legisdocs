"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, Plus, Users, Search, Bell, ChevronDown, Menu, LogOut, Power, ArrowRight 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

export default function GestaoGabinetes() {
  const router = useRouter();
  const [gabinetes, setGabinetes] = useState<any[]>([]);
  const [nomeGabinete, setNomeGabinete] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    carregarGabinetes(parsedUser.tenantId);
  }, [router]);

  const carregarGabinetes = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/list/${tenantId}`);
      const data = await res.json();
      setGabinetes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar gabinetes", error);
    }
  };

  const handleCriarGabinete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeGabinete.trim() || !user) return;
    setLoading(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nomeGabinete, tenantId: user.tenantId }),
      });
      setNomeGabinete("");
      carregarGabinetes(user.tenantId);
    } catch (error) {
      console.error("Erro ao criar gabinete", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      carregarGabinetes(user.tenantId);
    } catch (error) {
      console.error("Erro ao alterar status", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar interface...</div>;

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
                  placeholder="Buscar gabinetes..." 
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

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Breadcrumbs e Título */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link href="/painel" className="hover:text-blue-600 transition-colors">Início</Link>
                <span>/</span>
                <span className="font-semibold text-gray-700">Gabinetes</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Gestão de Gabinetes</h2>
              <p className="text-gray-600 mt-1">Registe e gira os gabinetes parlamentares e a atribuição dos membros.</p>
            </div>

            {/* Formulário de Novo Gabinete */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Registrar Novo Gabinete
              </h3>
              <form onSubmit={handleCriarGabinete} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={nomeGabinete}
                  onChange={(e) => setNomeGabinete(e.target.value)}
                  placeholder="Ex: Gabinete do Vereador João Silva"
                  required
                  className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-800"
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? "A Salvar..." : "Criar Gabinete"}
                </button>
              </form>
            </div>

            {/* Lista de Gabinetes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-slate-50 p-5 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" /> Gabinetes Registados
                </h3>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {gabinetes.length} total
                </span>
              </div>
              
              <ul className="divide-y divide-gray-100">
                {gabinetes.length === 0 ? (
                  <li className="p-8 text-gray-500 text-center">Nenhum gabinete encontrado.</li>
                ) : (
                  gabinetes.map((gab) => (
                    <li key={gab.id} className={`p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-4 ${!gab.isActive ? 'opacity-60 bg-gray-50/50' : ''}`}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className={`font-bold text-base ${gab.isActive ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                            {gab.name}
                          </p>
                          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${gab.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {gab.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          Membros vinculados: <span className="font-bold text-gray-700">{gab.users?.length || 0}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button 
                          onClick={() => handleToggleStatus(gab.id, gab.isActive)}
                          className={`flex-1 sm:flex-none font-bold text-xs px-4 py-2 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${gab.isActive ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100' : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {gab.isActive ? 'Inativar' : 'Reativar'}
                        </button>
                        
                        <Link 
                          href={`/painel/gabinetes/${gab.id}`} 
                          className={`flex-1 sm:flex-none font-bold text-xs px-4 py-2 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${gab.isActive ? 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'pointer-events-none text-gray-400 bg-gray-100 border-gray-200'}`}
                        >
                          Ver Membros <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}