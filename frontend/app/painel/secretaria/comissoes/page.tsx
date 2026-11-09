"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Edit, Trash2, Shield, X, Save, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GestaoComissoes() {
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [vereadores, setVereadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [membros, setMembros] = useState<{ userId: string; cargo: string }[]>([]);

  const cargosDisponiveis = ["PRESIDENTE", "VICE_PRESIDENTE", "RELATOR", "MEMBRO", "SUPLENTE"];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("legisdocs_user") || "{}");
      if (!user.tenantId) return;
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // 1. Carrega as Comissões
      const resCom = await fetch(`${apiEnv}/comissoes/list/${user.tenantId}`);
      const dataCom = await resCom.json();
      setComissoes(Array.isArray(dataCom) ? dataCom : []);

      // 2. Carrega os Vereadores (Buscando dos gabinetes)
      const resGab = await fetch(`${apiEnv}/gabinete/list/${user.tenantId}`);
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
    const user = JSON.parse(localStorage.getItem("legisdocs_user") || "{}");
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
      carregarDados();
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
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold w-full">A carregar gestão de comissões...</div>;

  return (
    <div className="min-h-screen bg-slate-50 w-full flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 p-6 md:p-10 flex flex-col">
        
        {/* BREADCRUMB - Botão de Voltar */}
        <Link href="/painel" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors w-max">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </Link>

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
                <Users className="w-6 h-6" />
              </div>
              Gestão de Comissões
            </h1>
            <p className="text-slate-500 font-medium mt-2 text-sm">Crie grupos de trabalho e defina relatores, presidentes e membros.</p>
          </div>

          <button 
            onClick={abrirModalNovo}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nova Comissão
          </button>
        </div>

        {/* LISTAGEM DE COMISSÕES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comissoes.map((comissao) => (
            <div key={comissao.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="bg-slate-100 text-slate-600 text-xs font-black tracking-widest px-2.5 py-1 rounded border border-slate-200 mb-2 inline-block">
                    {comissao.sigla}
                  </span>
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">{comissao.nome}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirModalEditar(comissao)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => excluirComissao(comissao.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 mb-2 overflow-y-auto max-h-48">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Composição ({comissao.membros?.length || 0})
                </h4>
                <div className="flex flex-col gap-2">
                  {comissao.membros?.length === 0 && <span className="text-sm text-slate-400">Nenhum membro vinculado.</span>}
                  {comissao.membros?.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center text-sm bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                      <span className="font-semibold text-slate-700">{m.user?.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        m.cargo === 'PRESIDENTE' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        m.cargo === 'RELATOR' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {m.cargo.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {comissoes.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-sm">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-bold text-slate-600">Nenhuma comissão cadastrada.</p>
              <p className="text-sm mt-1">Crie a primeira comissão para começar a organizar as tramitações.</p>
            </div>
          )}
        </div>

        {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-8">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">
                  {editId ? "Editar Comissão" : "Nova Comissão"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form id="form-comissao" onSubmit={salvarComissao} className="flex flex-col gap-5">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Sigla</label>
                      <input required type="text" value={sigla} onChange={(e) => setSigla(e.target.value)} placeholder="Ex: CCJR" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Comissão</label>
                      <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Comissão de Constituição, Justiça e Redação" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-bold text-slate-700">Membros da Comissão</label>
                      <button type="button" onClick={adicionarMembro} className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                        <Plus className="w-4 h-4" /> Adicionar Vereador
                      </button>
                    </div>
                    
                    {membros.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center flex flex-col items-center justify-center text-slate-500">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum membro adicionado.</p>
                        <p className="text-xs mt-1">Adicione os vereadores e defina suas funções.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {membros.map((membro, index) => (
                          <div key={index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <select required value={membro.userId} onChange={(e) => atualizarMembro(index, "userId", e.target.value)} className="flex-1 p-2.5 rounded-lg border border-slate-300 outline-none bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500">
                              <option value="">-- Selecione o Vereador --</option>
                              {vereadores.map(v => (
                                <option key={v.id} value={v.id} disabled={membros.some(m => m.userId === v.id && m.userId !== membro.userId)}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                            
                            <select required value={membro.cargo} onChange={(e) => atualizarMembro(index, "cargo", e.target.value)} className="w-48 p-2.5 rounded-lg border border-slate-300 outline-none bg-white font-bold text-slate-600 text-sm focus:ring-2 focus:ring-indigo-500">
                              {cargosDisponiveis.map(cargo => (
                                <option key={cargo} value={cargo}>{cargo.replace("_", " ")}</option>
                              ))}
                            </select>

                            <button type="button" onClick={() => removerMembro(index)} className="p-2.5 bg-white border border-slate-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors shadow-sm">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50 rounded-b-3xl">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-3 rounded-xl font-bold transition-colors">
                  Cancelar
                </button>
                <button form="form-comissao" type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 font-bold">
                  <Save className="w-5 h-5" /> Salvar Comissão
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}