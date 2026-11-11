"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, Plus, Edit, Trash2, Shield, X, Save, AlertCircle, 
  Search, Bell, ChevronDown, Menu, LogOut 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

export default function GestaoComissoes() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [vereadores, setVereadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [membros, setMembros] = useState<{ userId: string; cargo: string }[]>([]);

  const cargosDisponiveis = ["PRESIDENTE", "VICE_PRESIDENTE", "RELATOR", "MEMBRO", "SUPLENTE"];

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    carregarDados(parsedUser.tenantId);
  }, [router]);

  const carregarDados = async (tenantId: string) => {
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // 1. Carrega as Comissões
      const resCom = await fetch(`${apiEnv}/comissoes/list/${tenantId}`);
      const dataCom = await resCom.json();
      setComissoes(Array.isArray(dataCom) ? dataCom : []);

      // 2. Carrega os Vereadores (Buscando dos gabinetes)
      const resGab = await fetch(`${apiEnv}/gabinete/list/${tenantId}`);
      if (resGab.ok) {
        const gabinetes = await resGab.json();
        let listaVereadores: any[] = [];
        gabinetes.forEach((g: any) => {
          const ver = g.users?.filter((u: any) => u.role === "VEREADOR") || [];
          listaVereadores = [...listaVereadores, ...ver];
        });
        setVereadores(listaVereadores);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setEditId(null);
    setNome("");
    setSigla("");
    setMembros([]);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (comissao: any) => {
    setEditId(comissao.id);
    setNome(comissao.nome);
    setSigla(comissao.sigla || "");
    const membrosFormatados = comissao.membros?.map((m: any) => ({
      userId: m.userId,
      cargo: m.cargo
    })) || [];
    setMembros(membrosFormatados);
    setIsModalOpen(true);
  };

  const adicionarMembro = () => {
    setMembros([...membros, { userId: "", cargo: "MEMBRO" }]);
  };

  const removerMembro = (index: number) => {
    const novosMembros = [...membros];
    novosMembros.splice(index, 1);
    setMembros(novosMembros);
  };

  const atualizarMembro = (index: number, campo: "userId" | "cargo", valor: string) => {
    const novosMembros = [...membros];
    novosMembros[index][campo] = valor;
    setMembros(novosMembros);
  };

  const salvarComissao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const membrosValidos = membros.filter(m => m.userId !== "");

    const payload = {
      tenantId: user.tenantId,
      nome,
      sigla,
      membros: membrosValidos
    };

    try {
      if (editId) {
        await fetch(`${apiEnv}/comissoes/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${apiEnv}/comissoes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      carregarDados(user.tenantId);
    } catch (error) {
      console.error("Erro ao salvar comissão:", error);
      alert("Erro ao salvar a comissão.");
    }
  };

  const excluirComissao = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta comissão? Os projetos voltarão a ficar sem comissão atribuída.")) return;
    
    const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    try {
      await fetch(`${apiEnv}/comissoes/${id}`, { method: "DELETE" });
      if (user) carregarDados(user.tenantId);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500 font-medium">A carregar gestão de comissões...</div>;
  }

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
                  placeholder="Buscar comissões ou membros..." 
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
                <span className="text-xs text-gray-500 font-medium capitalize">{user.role?.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {user.name?.charAt(0)}
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
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Breadcrumbs e Título com Botão de Ação */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link href="/painel" className="hover:text-blue-600 transition-colors">Início</Link>
                  <span>/</span>
                  <Link href="/painel/comissoes" className="hover:text-blue-600 transition-colors">Comissões</Link>
                  <span>/</span>
                  <span className="font-semibold text-gray-700">Gestão</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  Gestão de Comissões
                </h2>
                <p className="text-gray-600 mt-1 text-sm">Crie grupos de trabalho permanentes ou temporários e defina os vereadores participantes.</p>
              </div>

              <button 
                onClick={abrirModalNovo}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm shrink-0"
              >
                <Plus className="w-4 h-4" /> Nova Comissão
              </button>
            </div>

            {/* Grid de Comissões */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comissoes.map((comissao) => (
                <div key={comissao.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border border-blue-100 mb-2 inline-block">
                          {comissao.sigla}
                        </span>
                        <h3 className="font-bold text-lg text-gray-900 leading-snug">{comissao.nome}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => abrirModalEditar(comissao)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar comissão">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => excluirComissao(comissao.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Excluir comissão">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-2 overflow-y-auto max-h-48">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-gray-400" /> Composição ({comissao.membros?.length || 0})
                      </h4>
                      <div className="flex flex-col gap-2">
                        {(!comissao.membros || comissao.membros.length === 0) && (
                          <span className="text-xs text-gray-400 italic">Nenhum membro vinculado.</span>
                        )}
                        {comissao.membros?.map((m: any) => (
                          <div key={m.id} className="flex justify-between items-center text-xs bg-white border border-gray-100 p-2 rounded-md shadow-2xs">
                            <span className="font-semibold text-gray-800">{m.user?.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              m.cargo === 'PRESIDENTE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              m.cargo === 'RELATOR' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {m.cargo.replace("_", " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {comissoes.length === 0 && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white shadow-2xs">
                  <Users className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-base font-bold text-gray-600">Nenhuma comissão cadastrada.</p>
                  <p className="text-xs text-gray-500 mt-1">Clique no botão "Nova Comissão" para cadastrar o primeiro grupo.</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editId ? "Editar Comissão" : "Nova Comissão"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="form-comissao" onSubmit={salvarComissao} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sigla</label>
                    <input 
                      required 
                      type="text" 
                      value={sigla} 
                      onChange={(e) => setSigla(e.target.value)} 
                      placeholder="Ex: CCJR" 
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none uppercase font-bold text-sm transition-all" 
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome da Comissão</label>
                    <input 
                      required 
                      type="text" 
                      value={nome} 
                      onChange={(e) => setNome(e.target.value)} 
                      placeholder="Ex: Comissão de Constituição, Justiça e Redação" 
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm transition-all" 
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Membros da Comissão</label>
                    <button 
                      type="button" 
                      onClick={adicionarMembro} 
                      className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Vereador
                    </button>
                  </div>
                  
                  {membros.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center flex flex-col items-center justify-center text-gray-500">
                      <AlertCircle className="w-7 h-7 mb-2 opacity-40 text-gray-400" />
                      <p className="text-xs font-bold text-gray-600">Nenhum membro adicionado.</p>
                      <p className="text-xs text-gray-400 mt-0.5">Adicione os vereadores e defina suas funções na comissão.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {membros.map((membro, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <select 
                            required 
                            value={membro.userId} 
                            onChange={(e) => atualizarMembro(index, "userId", e.target.value)} 
                            className="flex-1 p-2 rounded-lg border border-gray-200 outline-none bg-white font-medium text-gray-700 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          >
                            <option value="">-- Selecione o Vereador --</option>
                            {vereadores.map(v => (
                              <option key={v.id} value={v.id} disabled={membros.some(m => m.userId === v.id && m.userId !== membro.userId)}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                          
                          <select 
                            required 
                            value={membro.cargo} 
                            onChange={(e) => atualizarMembro(index, "cargo", e.target.value)} 
                            className="w-full sm:w-44 p-2 rounded-lg border border-gray-200 outline-none bg-white font-bold text-gray-700 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          >
                            {cargosDisponiveis.map(cargo => (
                              <option key={cargo} value={cargo}>{cargo.replace("_", " ")}</option>
                            ))}
                          </select>

                          <button 
                            type="button" 
                            onClick={() => removerMembro(index)} 
                            className="p-2 bg-white border border-gray-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Remover membro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button 
                form="form-comissao" 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm font-bold"
              >
                <Save className="w-4 h-4" /> Salvar Comissão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}