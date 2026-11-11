"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Menu, Bell, ChevronDown, LogOut, Search, Plus, 
  Building, Users, Edit, ShieldAlert, Key, ShieldCheck, 
  CheckCircle, XCircle, Settings 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  moduloPlenario?: boolean; 
  moduloAtas?: boolean; 
  moduloComissoes?: boolean;
  _count?: { gabinetes: number; users: number };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  gabinete?: { name: string } | null;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  const [updatingModule, setUpdatingModule] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ id: string; isActive: boolean; name: string } | null>(null);
  
  // Estados para Gestão de Utilizadores
  const [usersModalTenant, setUsersModalTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<UserData[]>([]);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  const [createForm, setCreateForm] = useState({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "" });
  const [editForm, setEditForm] = useState({ name: "", slug: "" });

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
    setUser(parsedUser);
    carregarTenants();
  }, [router]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const carregarTenants = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/tenants`);
      if (res.ok) setTenants(await res.json());
    } catch (error) {
      showToast("Erro ao carregar câmaras", "error");
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuariosDoTenant = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/tenants/${tenantId}/users`);
      if (res.ok) setTenantUsers(await res.json());
    } catch (error) {
      showToast("Erro ao carregar utilizadores", "error");
    }
  };

  const abrirModalUsuarios = (tenant: Tenant) => {
    setUsersModalTenant(tenant);
    carregarUsuariosDoTenant(tenant.id);
  };

  const toggleModulo = async (tenantId: string, modulo: 'moduloPlenario' | 'moduloAtas' | 'moduloComissoes', valorAtual: boolean) => {
    setUpdatingModule(`${tenantId}-${modulo}`);
    try {
      const novoValor = !valorAtual;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/tenants/${tenantId}/modulos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [modulo]: novoValor })
      });

      if (res.ok) {
        showToast("Módulo atualizado com sucesso!", "success");
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, [modulo]: novoValor } : t));
      } else {
        showToast("Erro ao atualizar o módulo.", "error");
      }
    } catch (error) {
      showToast("Falha na comunicação com o servidor.", "error");
    } finally {
      setUpdatingModule(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/tenants`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error();
      showToast("Câmara criada com sucesso!", "success");
      setShowCreateModal(false);
      setCreateForm({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "" });
      carregarTenants();
    } catch (err) { showToast("Erro ao criar Câmara. Verifique os dados.", "error"); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTenant) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/tenants/${editTenant.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      showToast("Informações atualizadas!", "success");
      setEditTenant(null);
      carregarTenants();
    } catch (err) { showToast("Erro ao atualizar", "error"); }
  };

  const executeToggleStatus = async () => {
    if (!confirmStatus) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/tenants/${confirmStatus.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !confirmStatus.isActive }),
      });
      if (!res.ok) throw new Error();
      showToast(`Câmara ${confirmStatus.isActive ? 'bloqueada' : 'liberada'}!`, "success");
      setConfirmStatus(null);
      carregarTenants();
    } catch (err) { showToast("Erro ao alterar status", "error"); }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Deseja ${currentStatus ? 'BLOQUEAR' : 'LIBERAR'} este utilizador?`)) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/users/${userId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error();
      showToast("Status do utilizador atualizado!", "success");
      if (usersModalTenant) carregarUsuariosDoTenant(usersModalTenant.id);
    } catch (err) { showToast("Erro ao alterar status", "error"); }
  };

  const handleChangeUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/super-admin/users/${passwordUser.id}/password`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error();
      showToast("Senha alterada com sucesso!", "success");
      setPasswordUser(null);
      setNewPassword("");
    } catch (err) { showToast("Erro ao alterar senha", "error"); }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">A carregar painel mestre...</p>
        </div>
      </div>
    );
  }

  return (
    <div lang="pt-BR" className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      
      {/* SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />} 
          {toast.msg}
        </div>
      )}

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-blue-600">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center w-full max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar câmaras..." className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 ml-4">
            <button className="text-gray-500 hover:text-blue-600 transition-colors"><Bell className="w-5 h-5" /></button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user?.name}</span>
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                {user?.name?.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden z-50">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLL DO CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6 pb-10">
            
            {/* TÍTULO E BOTAO CRIAR */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <Settings className="w-8 h-8 text-blue-600" />
                  Gestão de Câmaras <span className="text-gray-400 font-normal hidden md:inline">/ Tenants</span>
                </h2>
                <p className="text-gray-500 mt-1 text-sm font-medium">Controle todas as instâncias municipais registadas na plataforma.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Nova Câmara
              </button>
            </div>

            {/* TABELA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="p-4 font-bold">Instituição</th>
                      <th className="p-4 font-bold text-center">Plenário</th>
                      <th className="p-4 font-bold text-center">Atas</th>
                      <th className="p-4 font-bold text-center">Comissões</th>
                      <th className="p-4 font-bold text-center">Estatísticas</th>
                      <th className="p-4 font-bold text-center">Status</th>
                      <th className="p-4 font-bold text-right pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                              <Building className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-[15px]">{t.name}</div>
                              <div className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono inline-block mt-1">
                                {t.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* TOGGLE MÓDULOS */}
                        <td className="p-4 text-center align-middle">
                          <button
                            onClick={() => toggleModulo(t.id, 'moduloPlenario', t.moduloPlenario || false)}
                            disabled={updatingModule === `${t.id}-moduloPlenario`}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-inner disabled:opacity-50 ${t.moduloPlenario ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${t.moduloPlenario ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>

                        <td className="p-4 text-center align-middle">
                          <button
                            onClick={() => toggleModulo(t.id, 'moduloAtas', t.moduloAtas || false)}
                            disabled={updatingModule === `${t.id}-moduloAtas`}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-inner disabled:opacity-50 ${t.moduloAtas ? 'bg-indigo-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${t.moduloAtas ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>

                        <td className="p-4 text-center align-middle">
                          <button
                            onClick={() => toggleModulo(t.id, 'moduloComissoes', t.moduloComissoes || false)}
                            disabled={updatingModule === `${t.id}-moduloComissoes`}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-inner disabled:opacity-50 ${t.moduloComissoes ? 'bg-amber-500' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${t.moduloComissoes ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>

                        {/* ESTATÍSTICAS */}
                        <td className="p-4 align-middle">
                          <div className="flex flex-col items-center gap-1 text-[11px] font-bold text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded w-24 text-center">🏛️ {t._count?.gabinetes || 0} Gabs</span>
                            <span className="bg-gray-100 px-2 py-1 rounded w-24 text-center">👥 {t._count?.users || 0} Users</span>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="p-4 text-center align-middle">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 uppercase rounded-full border ${t.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {t.isActive ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            {t.isActive ? 'ATIVO' : 'BLOQUEADO'}
                          </span>
                        </td>

                        {/* AÇÕES */}
                        <td className="p-4 align-middle text-right pr-6">
                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => abrirModalUsuarios(t)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 hover:text-purple-700 transition-colors" title="Ver Utilizadores">
                              <Users className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditTenant(t); setEditForm({ name: t.name, slug: t.slug }); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors" title="Editar Câmara">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setConfirmStatus({ id: t.id, isActive: t.isActive, name: t.name })} 
                              className={`p-2 rounded-lg transition-colors ${t.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} 
                              title={t.isActive ? 'Bloquear Câmara' : 'Liberar Câmara'}
                            >
                              {t.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                    {tenants.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-gray-500 font-medium">Nenhuma câmara registada no sistema.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: USUÁRIOS */}
      {usersModalTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  Usuários de {usersModalTenant.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Gestão de acessos da Secretaria e Gabinetes</p>
              </div>
              <button onClick={() => setUsersModalTenant(null)} className="p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto border border-gray-200 rounded-xl flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-bold">Nome / Email</th>
                    <th className="p-4 font-bold">Cargo</th>
                    <th className="p-4 font-bold">Gabinete / Lotação</th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 font-bold text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tenantUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-black uppercase tracking-wider border border-blue-100">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-600">{u.gabinete?.name || '-'}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {u.isActive ? 'ATIVO' : 'BLOQ.'}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setPasswordUser(u)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" title="Mudar Senha">
                            <Key className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(u.id, u.isActive)} 
                            className={`p-2 rounded-lg transition-colors ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} 
                            title={u.isActive ? 'Bloquear Utilizador' : 'Liberar Utilizador'}
                          >
                            {u.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tenantUsers.length === 0 && (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-500">Nenhum utilizador encontrado nesta câmara.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR SENHA */}
      {passwordUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <form onSubmit={handleChangeUserPassword} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">Redefinir Senha</h3>
            <p className="text-sm text-slate-500 mb-6">Digite a nova senha de acesso para <strong>{passwordUser.name}</strong></p>
            <input 
              required type="password" placeholder="Nova Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} 
              className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all mb-6" 
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setPasswordUser(null); setNewPassword(""); }} className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95">Salvar Senha</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CONFIRMAR STATUS */}
      {confirmStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm text-center animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${confirmStatus.isActive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Confirma a ação?</h3>
            <p className="text-sm text-slate-500 mb-8">
              Tem a certeza que deseja <strong>{confirmStatus.isActive ? 'BLOQUEAR' : 'LIBERAR'}</strong> o acesso à câmara <strong>{confirmStatus.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmStatus(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={executeToggleStatus} className={`flex-1 py-3 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 ${confirmStatus.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                Sim, {confirmStatus.isActive ? 'Bloquear' : 'Liberar'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL: CRIAR CÂMARA */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Nova Câmara</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Instituição</label>
                <input required placeholder="Câmara Municipal de..." value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug (Identificador na URL)</label>
                <input required placeholder="ex: cm-barauna" value={createForm.slug} onChange={e => setCreateForm({...createForm, slug: e.target.value.toLowerCase()})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              
              <div className="pt-2 pb-2">
                <hr className="border-gray-200"/>
              </div>
              
              <h4 className="font-black text-sm text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" /> Conta de Administrador
              </h4>
              
              <div>
                <input required placeholder="Nome do Responsável" value={createForm.adminName} onChange={e => setCreateForm({...createForm, adminName: e.target.value})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input required type="email" placeholder="Email do Admin" value={createForm.adminEmail} onChange={e => setCreateForm({...createForm, adminEmail: e.target.value})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                <input required type="password" placeholder="Senha Provisória" value={createForm.adminPassword} onChange={e => setCreateForm({...createForm, adminPassword: e.target.value})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95">Registar Câmara</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDITAR CÂMARA */}
      {editTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEdit} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Edit className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Editar Câmara</h3>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Instituição</label>
                <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug Identificador</label>
                <input required value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value.toLowerCase()})} className="w-full border border-gray-300 bg-gray-50 p-3 rounded-xl text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditTenant(null)} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}