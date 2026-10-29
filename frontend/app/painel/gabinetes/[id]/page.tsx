'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { Suspense } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center">A carregar gestão de equipa...</div>}>
      <GestaoEquipaGabinete params={params} />
    </Suspense>
  );
}

function GestaoEquipaGabinete({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const gabineteId = resolvedParams.id;
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('VEREADOR');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("legisdocs_token");
      const res = await fetch(`${API_URL}/user/gabinete/${gabineteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
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

  if (loading) return <div className="p-8 text-center">A carregar equipa...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">LegisDocs <span className="text-sm font-normal text-blue-200">/ Membros do Gabinete</span></h1>
        <button onClick={() => router.push('/painel/gabinetes')} className="font-semibold hover:text-blue-200">
          Voltar aos Gabinetes
        </button>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-slate-800 mb-8">Gestão de Equipa</h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="font-bold text-gray-700 mb-4">Registar Novo Membro</h3>
          <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} required className="flex-1 border border-gray-300 rounded-lg p-2" />
            <input type="email" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="flex-1 border border-gray-300 rounded-lg p-2" />
            <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="flex-1 border border-gray-300 rounded-lg p-2" />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="border border-gray-300 rounded-lg p-2 bg-white">
              <option value="VEREADOR">Vereador (Titular)</option>
              <option value="ASSESSOR">Assessor</option>
            </select>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Adicionar
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-gray-200 p-4">
            <h3 className="font-bold text-slate-700">Membros Ativos</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {users.map(u => (
              <li key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-gray-800">{u.name}</p>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">{u.role}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(u)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" title="Editar utilizador">
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Editar Membro</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 bg-white">
                  <option value="VEREADOR">Vereador (Titular)</option>
                  <option value="ASSESSOR">Assessor</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg mt-2">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}