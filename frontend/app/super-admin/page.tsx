"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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

  const carregarTenants = async () => {
    try {
      const res = await fetch(`http://localhost:4000/super-admin/tenants`);
      if (res.ok) setTenants(await res.json());
    } catch (error) {
      showToast("Erro ao carregar câmaras", "error");
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuariosDoTenant = async (tenantId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/super-admin/tenants/${tenantId}/users`);
      if (res.ok) setTenantUsers(await res.json());
    } catch (error) {
      showToast("Erro ao carregar utilizadores", "error");
    }
  };

  const abrirModalUsuarios = (tenant: Tenant) => {
    setUsersModalTenant(tenant);
    carregarUsuariosDoTenant(tenant.id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:4000/super-admin/tenants`, {
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
      const res = await fetch(`http://localhost:4000/super-admin/tenants/${editTenant.id}`, {
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
      const res = await fetch(`http://localhost:4000/super-admin/tenants/${confirmStatus.id}/status`, {
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
      const res = await fetch(`http://localhost:4000/super-admin/users/${userId}/status`, {
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
      const res = await fetch(`http://localhost:4000/super-admin/users/${passwordUser.id}/password`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error();
      showToast("Senha alterada com sucesso!", "success");
      setPasswordUser(null);
      setNewPassword("");
    } catch (err) { showToast("Erro ao alterar senha", "error"); }
  };

  if (loading || !user) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-xl text-white font-bold z-50 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-gray-900 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">LegisDocs <span className="text-sm font-normal text-gray-400 ml-2">/ Super Admin</span></h1>
        <Link href="/painel" className="text-gray-300 hover:text-white font-semibold transition-colors cursor-pointer">Voltar ao Painel</Link>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Gestão de Câmaras (Tenants)</h2>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors cursor-pointer">
            + Nova Câmara
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <th className="p-4 font-bold">Instituição</th>
                <th className="p-4 font-bold text-center">Gabinetes</th>
                <th className="p-4 font-bold text-center">Usuários</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{t.name}</div>
                    <div className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded font-mono inline-block mt-1">{t.slug}</div>
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600 text-lg">{t._count?.gabinetes || 0}</td>
                  <td className="p-4 text-center font-bold text-purple-600 text-lg">{t._count?.users || 0}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t.isActive ? 'ATIVO' : 'BLOQUEADO'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => abrirModalUsuarios(t)} className="text-purple-600 font-bold text-sm hover:underline cursor-pointer">Ver Usuários</button>
                    <button onClick={() => { setEditTenant(t); setEditForm({ name: t.name, slug: t.slug }); }} className="text-blue-600 font-bold text-sm hover:underline cursor-pointer">Editar</button>
                    <button onClick={() => setConfirmStatus({ id: t.id, isActive: t.isActive, name: t.name })} className={`${t.isActive ? 'text-red-600' : 'text-green-600'} font-bold text-sm hover:underline cursor-pointer`}>
                      {t.isActive ? 'Bloquear' : 'Liberar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL GESTÃO DE USUÁRIOS DO TENANT */}
      {usersModalTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Usuários de {usersModalTenant.name}</h3>
                <p className="text-sm text-gray-500">Gestão de acessos da Secretaria e Gabinetes</p>
              </div>
              <button onClick={() => setUsersModalTenant(null)} className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-bold cursor-pointer">Fechar</button>
            </div>
            
            <div className="overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr className="text-gray-700 text-sm border-b border-gray-200">
                    <th className="p-3 font-bold">Nome / Email</th>
                    <th className="p-3 font-bold">Cargo</th>
                    <th className="p-3 font-bold">Gabinete</th>
                    <th className="p-3 font-bold text-center">Status</th>
                    <th className="p-3 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenantUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">{u.role}</span>
                      </td>
                      <td className="p-3 text-sm text-gray-700">{u.gabinete?.name || '-'}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isActive ? 'ATIVO' : 'BLOQ.'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-3">
                        <button onClick={() => setPasswordUser(u)} className="text-purple-600 font-bold text-sm hover:underline cursor-pointer">Senha</button>
                        <button onClick={() => toggleUserStatus(u.id, u.isActive)} className={`${u.isActive ? 'text-red-600' : 'text-green-600'} font-bold text-sm hover:underline cursor-pointer`}>
                          {u.isActive ? 'Bloquear' : 'Liberar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tenantUsers.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">Nenhum utilizador encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SENHA USUÁRIO INDIVIDUAL */}
      {passwordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleChangeUserPassword} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Alterar Senha</h3>
            <p className="text-sm text-gray-600 mb-4">Nova senha para <strong>{passwordUser.name}</strong></p>
            <input required type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-gray-300 p-2.5 mb-5 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setPasswordUser(null); setNewPassword(""); }} className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-bold transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors cursor-pointer">Alterar</button>
            </div>
          </form>
        </div>
      )}

      {/* OS MODAIS ORIGINAIS (CRIAR, EDITAR, STATUS DO TENANT) MANTÊM-SE IGUAIS AO CÓDIGO ANTERIOR */}
      {/* MODAL STATUS TENANT */}
      {confirmStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Atenção</h3>
            <p className="text-sm text-gray-700 mb-6">Deseja {confirmStatus.isActive ? 'bloquear' : 'liberar'} o acesso de <strong>{confirmStatus.name}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmStatus(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 cursor-pointer">Cancelar</button>
              <button onClick={executeToggleStatus} className={`px-4 py-2 text-white rounded-lg font-bold cursor-pointer ${confirmStatus.isActive ? 'bg-red-600' : 'bg-green-600'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL CRIAR TENANT */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nova Câmara</h3>
            <input required placeholder="Nome da Câmara" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="w-full border border-gray-300 p-2.5 mb-3 rounded-lg text-gray-900 outline-none" />
            <input required placeholder="Slug (ex: barauna)" value={createForm.slug} onChange={e => setCreateForm({...createForm, slug: e.target.value.toLowerCase()})} className="w-full border border-gray-300 p-2.5 mb-3 rounded-lg text-gray-900 outline-none" />
            <hr className="my-4 border-gray-200"/>
            <h4 className="font-bold text-sm mb-3 text-gray-600">Dados do Admin</h4>
            <input required placeholder="Nome do Responsável" value={createForm.adminName} onChange={e => setCreateForm({...createForm, adminName: e.target.value})} className="w-full border border-gray-300 p-2.5 mb-3 rounded-lg text-gray-900 outline-none" />
            <input required type="email" placeholder="Email do Admin" value={createForm.adminEmail} onChange={e => setCreateForm({...createForm, adminEmail: e.target.value})} className="w-full border border-gray-300 p-2.5 mb-3 rounded-lg text-gray-900 outline-none" />
            <input required type="password" placeholder="Senha Provisória" value={createForm.adminPassword} onChange={e => setCreateForm({...createForm, adminPassword: e.target.value})} className="w-full border border-gray-300 p-2.5 mb-4 rounded-lg text-gray-900 outline-none" />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold cursor-pointer">Criar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDITAR TENANT */}
      {editTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEdit} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Câmara</h3>
            <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 p-2.5 mb-3 rounded-lg text-gray-900 outline-none" />
            <input required value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value.toLowerCase()})} className="w-full border border-gray-300 p-2.5 mb-5 rounded-lg text-gray-900 outline-none" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditTenant(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold cursor-pointer">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}