'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, UserPlus, Pencil, X, Search, Bell, ChevronDown, Menu, LogOut, Shield, Mail 
} from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar gestão de equipa...</div>}>
      <GestaoEquipaGabinete params={params} />
    </Suspense>
  );
}

function GestaoEquipaGabinete({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const gabineteId = resolvedParams.id;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('VEREADOR');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    setCurrentUser(JSON.parse(storedUser));
  }, [router]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("legisdocs_token");
      const res = await fetch(`${API_URL}/user/gabinete/${gabineteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [gabineteId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("legisdocs_token");
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newName, 
          email: newEmail, 
          password: newPassword, 
          role: newRole, 
          gabineteId 
        }),
      });

      if (res.ok) {
        setNewName(''); setNewEmail(''); setNewPassword('');
        fetchUsers();
      } else {
        alert("Erro ao registar utilizador.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const token = localStorage.getItem("legisdocs_token");
      const res = await fetch(`${API_URL}/user/edit/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert("Erro ao atualizar utilizador.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  if (loading || !currentUser) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar equipa...</div>;

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
                  placeholder="Buscar membros..." 
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
                <span className="text-sm font-bold text-gray-700 leading-tight">{currentUser.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{currentUser.role.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {currentUser.name.charAt(0)}
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
                <Link href="/painel/gabinetes" className="hover:text-blue-600 transition-colors">Gabinetes</Link>
                <span>/</span>
                <span className="font-semibold text-gray-700">Membros do Gabinete</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Gestão de Equipa</h2>
              <p className="text-gray-600 mt-1">Gerencie os acessos, cargos e credenciais dos vereadores e assessores deste gabinete.</p>
            </div>

            {/* Form de Cadastro de Novo Membro */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Registar Novo Membro
              </h3>
              
              <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Carlos Andrade" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                  <input 
                    type="email" 
                    placeholder="carlos@camara.gov.br" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Palavra-passe</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cargo / Função</label>
                  <select 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value)} 
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-gray-800"
                  >
                    <option value="VEREADOR">Vereador (Titular)</option>
                    <option value="ASSESSOR">Assessor</option>
                  </select>
                </div>
                <div className="sm:col-span-2 md:col-span-4 flex justify-end">
                  <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" /> Adicionar Membro
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Membros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-gray-200 p-5 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" /> Membros Ativos
                </h3>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {users.length} utilizadores
                </span>
              </div>
              
              <ul className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <li className="p-8 text-center text-gray-500">Nenhum membro registado para este gabinete.</li>
                ) : (
                  users.map(u => (
                    <li key={u.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base border border-blue-200">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-gray-900">{u.name}</p>
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {u.role}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                            <Mail className="w-3.5 h-3.5 text-gray-400" /> {u.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEditModal(u)} 
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="Editar utilizador"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Editar Membro
            </h3>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  required 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)} 
                  required 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cargo / Função</label>
                <select 
                  value={editRole} 
                  onChange={e => setEditRole(e.target.value)} 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-gray-800"
                >
                  <option value="VEREADOR">Vereador (Titular)</option>
                  <option value="ASSESSOR">Assessor</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}