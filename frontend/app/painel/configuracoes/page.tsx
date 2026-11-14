"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, User, Plus, Trash2, Save, 
  Menu, Bell, ChevronDown, LogOut, Search, Settings, FileImage, Type, MapPin
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface Secretaria {
  id: string;
  nome: string;
  titular: string;
  isActive: boolean;
}

export default function ConfiguracoesCamara() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados do Formulário
  const [form, setForm] = useState({
    estadoNome: "", cidadeEstado: "", 
    prefeitoNome: "", palacioNome: "", salaSessoesNome: "", 
    artigoIndicacao: "", artigoProjetoLei: "",
    logoCabecalho: "", marcaDagua: "",
    enderecoRodape: "", contatoRodape: "", 
  });

  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [novaSecNome, setNovaSecNome] = useState("");
  const [novaSecTitular, setNovaSecTitular] = useState("");

  // Estados da Prévia ao Vivo
  const [destacarVariaveis, setDestacarVariaveis] = useState(true);
  const [modeloPrevia, setModeloPrevia] = useState("INDICAÇÃO");

  const carregarConfiguracoes = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${tenantId}`);
      if (!res.ok) throw new Error("Erro ao carregar configurações");
      const data = await res.json();
      setForm({
        estadoNome: data.estadoNome || "",
        cidadeEstado: data.cidadeEstado || "",
        prefeitoNome: data.prefeitoNome || "",
        palacioNome: data.palacioNome || "",
        salaSessoesNome: data.salaSessoesNome || "",
        artigoIndicacao: data.artigoIndicacao || "",
        artigoProjetoLei: data.artigoProjetoLei || "",
        logoCabecalho: data.logoCabecalho || "",
        marcaDagua: data.marcaDagua || "",
        enderecoRodape: data.enderecoRodape || "", 
        contatoRodape: data.contatoRodape || "",   
      });

      const resSec = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/secretaria-destino/list/active/${tenantId}`);
      if (resSec.ok) {
        setSecretarias(await resSec.json());
      }
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const iniciarSessao = () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      const parsedUser = JSON.parse(storedUser);
      
      if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
      
      setUser(parsedUser);
      carregarConfiguracoes(parsedUser.tenantId);
    };

    iniciarSessao();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logoCabecalho" | "marcaDagua") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return showToast("A imagem é demasiado grande. Escolha uma até 2MB.", "error");
      const reader = new FileReader();
      reader.onloadend = () => setForm((prev) => ({ ...prev, [field]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${user.tenantId}/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Falha");
      showToast("Configurações atualizadas com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao guardar as configurações.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAdicionarSecretaria = async () => {
    if (!novaSecNome.trim() || !novaSecTitular.trim()) return showToast("Preencha o nome e o titular.", "error");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/secretaria-destino/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novaSecNome, titular: novaSecTitular, tenantId: user.tenantId }),
      });
      if (res.ok) {
        showToast("Secretaria adicionada!", "success");
        setNovaSecNome(""); setNovaSecTitular("");
        carregarConfiguracoes(user.tenantId);
      }
    } catch (error) { showToast("Erro de conexão.", "error"); }
  };

  const handleRemoverSecretaria = async (id: string) => {
    if (!confirm("Remover esta secretaria?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/secretaria-destino/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }), 
      });
      if (res.ok) {
        showToast("Removida.", "success");
        carregarConfiguracoes(user.tenantId);
      }
    } catch (error) { showToast("Erro.", "error"); }
  };

  // Componente Auxiliar para as Variáveis na Prévia
  const Var = ({ valor, placeholder }: { valor: string, placeholder: string }) => {
    const texto = valor || `[${placeholder}]`;
    if (!destacarVariaveis) return <span>{texto}</span>;
    return <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-0.5 rounded font-medium">{texto}</span>;
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div lang="pt-BR" className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-blue-600"><Menu className="w-6 h-6" /></button>
            <div className="hidden sm:flex items-center w-full max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar no sistema..." className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm outline-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 ml-4">
            <button className="text-gray-500 hover:text-blue-600"><Bell className="w-5 h-5" /></button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700">{user?.name}</span>
                <span className="text-[11px] font-black text-blue-600 uppercase">{user?.role?.replace('_', ' ')}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">{user?.name?.charAt(0)}</div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-[1400px] mx-auto pb-10">
            
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" /> Parâmetros do Legislativo
              </h2>
              <p className="text-gray-500 mt-1 text-sm font-medium">Configure as variáveis e visualize em tempo real a aplicação no documento.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* COLUNA ESQUERDA: FORMULÁRIO */}
              <div className="lg:col-span-7 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* IDENTIDADE VISUAL */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                      <FileImage className="w-5 h-5 text-gray-500" />
                      <h3 className="font-bold text-gray-800">Identidade Visual</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Logo / Brasão (Cabeçalho)</label>
                        <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, "logoCabecalho")} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Marca D'Água / Fundo</label>
                        <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, "marcaDagua")} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  {/* VARIÁVEIS DE TEXTO */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                      <Type className="w-5 h-5 text-gray-500" />
                      <h3 className="font-bold text-gray-800">Variáveis de Texto</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Estado (Cabeçalho)</label>
                          <input type="text" value={form.estadoNome} onChange={(e) => setForm({ ...form, estadoNome: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Estado do Rio Grande do Norte" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Cidade</label>
                          <input type="text" value={form.cidadeEstado} onChange={(e) => setForm({ ...form, cidadeEstado: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Baraúna - RN" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Palácio (Sede do Executivo)</label>
                          <input type="text" value={form.palacioNome} onChange={(e) => setForm({ ...form, palacioNome: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Manoel Alves Bezerra" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Sala das Sessões (Legislativo)</label>
                          <input type="text" value={form.salaSessoesNome} onChange={(e) => setForm({ ...form, salaSessoesNome: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Vereador José Fernandes de Queiroz" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Nome do(a) Prefeito(a)</label>
                          <input type="text" value={form.prefeitoNome} onChange={(e) => setForm({ ...form, prefeitoNome: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Maria Divanize..." />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Artigo do Regimento (Indicações)</label>
                          <input type="text" value={form.artigoIndicacao} onChange={(e) => setForm({ ...form, artigoIndicacao: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: art. 152" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Fundamentação Legal (Projetos de Lei)</label>
                        <input
                          type="text"
                          value={form.artigoProjetoLei}
                          onChange={(e) => setForm({ ...form, artigoProjetoLei: e.target.value })}
                          className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: art. 14, I, da LOM (Lei Orgânica Municipal) c/c art. 52, IV e art. 97, II"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RODAPÉ */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <h3 className="font-bold text-gray-800">Rodapé (Contatos oficiais)</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Endereço Completo</label>
                        <input type="text" value={form.enderecoRodape} onChange={(e) => setForm({ ...form, enderecoRodape: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Rua do Horto Florestal, 506..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Site e E-mail Institucional</label>
                        <input type="text" value={form.contatoRodape} onChange={(e) => setForm({ ...form, contatoRodape: e.target.value })} className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> {saving ? "A Guardar..." : "Guardar Configurações"}
                  </button>
                </form>

                {/* GESTÃO DE SECRETARIAS */}
                <div className="mt-10 mb-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" /> Órgãos de Destino
                  </h3>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-10">
                  <div className="p-5 bg-gray-50/50 border-b border-gray-200 flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nome do Órgão</label>
                      <input type="text" value={novaSecNome} onChange={(e) => setNovaSecNome(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Titular</label>
                      <input type="text" value={novaSecTitular} onChange={(e) => setNovaSecTitular(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={handleAdicionarSecretaria} className="bg-gray-900 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-gray-800 transition-all"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {secretarias.map((sec) => (
                      <div key={sec.id} className="p-3 rounded-lg border border-gray-200 bg-white flex justify-between items-center group">
                        <div>
                          <p className="font-bold text-sm text-slate-800">{sec.nome}</p>
                          <p className="text-xs text-slate-500"><User className="w-3 h-3 inline" /> {sec.titular}</p>
                        </div>
                        <button onClick={() => handleRemoverSecretaria(sec.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* COLUNA DIREITA: PRÉVIA AO VIVO */}
              <div className="lg:col-span-5 relative">
                <div className="sticky top-6">
                  
                  {/* BARRA DE CONTROLO DA PRÉVIA */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-bold text-sm text-gray-800">Prévia ao vivo</span>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <select 
                        value={modeloPrevia} 
                        onChange={(e) => setModeloPrevia(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                      >
                        <option value="INDICAÇÃO">Indicação</option>
                        <option value="REQUERIMENTO">Requerimento</option>
                        <option value="PROJETO_LEI">Projeto de Lei</option>
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" checked={destacarVariaveis} onChange={() => setDestacarVariaveis(!destacarVariaveis)} className="sr-only" />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${destacarVariaveis ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${destacarVariaveis ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 hidden sm:block">Destacar</span>
                      </label>
                    </div>
                  </div>

                  {/* FOLHA A4 DIGITAL */}
                  <div className="bg-white shadow-2xl rounded-sm border border-gray-300 w-full aspect-[1/1.414] overflow-hidden relative flex flex-col mx-auto max-w-[500px]">
                    
                    {/* MARCA D'ÁGUA NO FUNDO */}
                    {form.marcaDagua && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                        <img src={form.marcaDagua} alt="Fundo" className="w-[60%] opacity-[0.07] grayscale" />
                      </div>
                    )}

                    {/* CONTEÚDO DO PDF */}
                    <div className="relative z-10 flex flex-col h-full px-8 py-10">
                      
                      {/* CABEÇALHO */}
                      <div className="flex flex-col items-center justify-center border-b-2 border-gray-800 pb-4 mb-8">
                        {form.logoCabecalho ? (
                          <img src={form.logoCabecalho} alt="Logo" className="h-12 object-contain mb-3" />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded-full mb-3 flex items-center justify-center text-gray-400 text-xs">Logo</div>
                        )}
                        <p className="text-[10px] text-gray-600 tracking-widest uppercase font-semibold text-center leading-tight">
                          <Var valor={form.estadoNome} placeholder="ESTADO (EX: ESTADO DO RN)" />
                        </p>
                        <h1 className="text-[13px] font-black uppercase text-gray-900 text-center leading-tight">
                          Câmara Municipal de <Var valor={form.cidadeEstado?.split('-')[0]?.trim()} placeholder="Cidade" />
                        </h1>
                      </div>

                      {/* CORPO DO TEXTO */}
                      <div className="flex-1 text-[11px] text-gray-800 leading-relaxed text-justify">
                        
                        {modeloPrevia === "INDICAÇÃO" && (
                          <>
                            <p className="text-center font-bold mb-6 text-[12px]">INDICAÇÃO Nº 124/2026</p>
                            <p className="mb-4">Senhor Presidente,</p>
                            <p className="mb-4 indent-8">
                              O Vereador que esta subscreve, no uso de suas atribuições e com fundamento nos <Var valor={form.artigoIndicacao} placeholder="Artigo" /> do Regimento Interno desta Casa, vem respeitosamente <strong>INDICAR</strong> à Excelentíssima Senhora Prefeita, <Var valor={form.prefeitoNome} placeholder="Prefeito" />, que determine à <strong>Secretaria Municipal de Obras</strong> a pavimentação asfáltica da Rua das Acácias.
                            </p>
                            <p className="mb-8 indent-8">
                              A medida atende a reiteradas solicitações dos moradores, que convivem com lama no período chuvoso e poeira no verão.
                            </p>
                            <div className="text-center mt-auto mb-10">
                              <p>Sala das Sessões <Var valor={form.salaSessoesNome} placeholder="Sala" />,</p>
                              <p>Palácio <Var valor={form.palacioNome} placeholder="Palácio" />,</p>
                              <p><Var valor={form.cidadeEstado?.split('-')[0]?.trim()} placeholder="Cidade" />, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                            </div>
                          </>
                        )}

                        {modeloPrevia === "REQUERIMENTO" && (
                          <>
                            <p className="text-center font-bold mb-6 text-[12px]">REQUERIMENTO Nº 045/2026</p>
                            <p className="mb-4">Senhor Presidente,</p>
                            <p className="mb-4 indent-8">
                              Requeiro à Mesa Diretora, ouvido o soberano Plenário, que seja enviado ofício à Excelentíssima Prefeita Municipal, senhora <Var valor={form.prefeitoNome} placeholder="Prefeito" />, solicitando informações detalhadas sobre a licitação de medicamentos.
                            </p>
                            <div className="text-center mt-auto mb-10 pt-8">
                              <p>Sala das Sessões <Var valor={form.salaSessoesNome} placeholder="Sala" />,</p>
                              <p>Palácio <Var valor={form.palacioNome} placeholder="Palácio" />,</p>
                              <p><Var valor={form.cidadeEstado?.split('-')[0]?.trim()} placeholder="Cidade" />, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                            </div>
                          </>
                        )}

                        {modeloPrevia === "PROJETO_LEI" && (
                          <>
                            <p className="text-left font-bold mb-5 text-[12px]">PROJETO LEI LEGISLATIVO Nº 001/2026</p>
                            <div className="flex justify-end mb-6">
                              <p className="w-[58%] text-[10px] text-justify">
                                Dispõe sobre a política municipal de incentivo à leitura nas escolas e dá outras providências.
                              </p>
                            </div>
                            <p className="mb-8 indent-6 text-[10.5px] leading-relaxed">
                              Eu, <strong>Nome do Vereador</strong>, Vereador(a), apresento nos termos do <Var valor={form.artigoProjetoLei} placeholder="art. 14, I, da LOM c/c art. 52, IV e art. 97, II" />, ambos do Regimento Interno desta Casa, proposição de projeto de lei que dispõe sobre a política municipal de incentivo à leitura nas escolas e dá outras providências.
                            </p>
                            <div className="text-center mt-8 mb-10">
                              <p>Sala das Sessões <Var valor={form.salaSessoesNome} placeholder="Sala" />,</p>
                              <p>Palácio <Var valor={form.palacioNome} placeholder="Palácio" />,</p>
                              <p><Var valor={form.cidadeEstado?.split('-')[0]?.trim()} placeholder="Cidade" />, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                            </div>
                          </>
                        )}

                        {/* ASSINATURA FICTÍCIA */}
                        <div className="flex flex-col items-center justify-center mt-6">
                          <div className="w-40 border-t border-gray-800 mb-1"></div>
                          <p className="font-bold text-[10px]">NOME DO VEREADOR</p>
                          <p className="text-[9px] text-gray-600">Vereador(a) - PARTIDO</p>
                        </div>
                      </div>

                      {/* RODAPÉ DO PDF */}
                      <div className="mt-6 border-t-2 border-yellow-500 pt-2 text-center">
                        <p className="text-[8px] text-yellow-700 font-bold leading-tight">
                          <Var valor={form.enderecoRodape} placeholder="Endereço e CEP" /><br/>
                          <Var valor={form.contatoRodape} placeholder="Site e E-mail" />
                        </p>
                      </div>

                    </div>
                  </div>
                  {/* FIM DA FOLHA A4 */}

                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}