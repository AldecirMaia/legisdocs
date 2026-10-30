"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Plus, Trash2, Save } from "lucide-react";

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

  const [form, setForm] = useState({
    prefeitoNome: "", palacioNome: "", salaSessoesNome: "", 
    cidadeEstado: "", artigoIndicacao: "",
    logoCabecalho: "", marcaDagua: "",
    enderecoRodape: "", contatoRodape: "", 
  });

  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [novaSecNome, setNovaSecNome] = useState("");
  const [novaSecTitular, setNovaSecTitular] = useState("");

  const carregarConfiguracoes = async (tenantId: string) => {
    try {
      // 1. Carregar Configurações Gerais
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${tenantId}`);
      if (!res.ok) throw new Error("Erro ao carregar configurações");
      const data = await res.json();
      setForm({
        prefeitoNome: data.prefeitoNome || "",
        palacioNome: data.palacioNome || "",
        salaSessoesNome: data.salaSessoesNome || "",
        cidadeEstado: data.cidadeEstado || "",
        artigoIndicacao: data.artigoIndicacao || "",
        logoCabecalho: data.logoCabecalho || "",
        marcaDagua: data.marcaDagua || "",
        enderecoRodape: data.enderecoRodape || "", 
        contatoRodape: data.contatoRodape || "",   
      });

      // 2. Carregar Secretarias Ativas
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

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logoCabecalho" | "marcaDagua") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        return showToast("A imagem é demasiado grande. Escolha uma até 2MB.", "error");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${user.tenantId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Falha ao atualizar parâmetros");
      showToast("Configurações atualizadas com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao guardar as configurações no servidor.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAdicionarSecretaria = async () => {
    if (!novaSecNome.trim() || !novaSecTitular.trim()) {
      return showToast("Preencha o nome da secretaria e do titular.", "error");
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/secretaria-destino/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaSecNome,
          titular: novaSecTitular,
          tenantId: user.tenantId,
        }),
      });

      if (res.ok) {
        showToast("Secretaria adicionada com sucesso!", "success");
        setNovaSecNome("");
        setNovaSecTitular("");
        carregarConfiguracoes(user.tenantId);
      } else {
        showToast("Erro ao adicionar secretaria.", "error");
      }
    } catch (error) {
      showToast("Erro de conexão.", "error");
    }
  };

  const handleRemoverSecretaria = async (id: string) => {
    if (!confirm("Tem a certeza que deseja remover esta secretaria da lista?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/secretaria-destino/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }), 
      });
      if (res.ok) {
        showToast("Secretaria removida.", "success");
        carregarConfiguracoes(user.tenantId);
      }
    } catch (error) {
      showToast("Erro ao remover.", "error");
    }
  };

  if (loading || !user) return <div className="p-10 text-gray-500 animate-pulse">A carregar configurações...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10 relative">
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-50 flex items-center gap-3 animate-in slide-in-from-bottom-8 duration-300 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span> {toast.msg}
        </div>
      )}

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Configurações Globais</span></h1>
        <button onClick={() => router.push("/painel")} className="text-blue-200 hover:text-white font-semibold transition-colors">Voltar</button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-8">
        
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Parâmetros do Legislativo</h2>
          <p className="text-gray-600">Configure as variáveis e a identidade visual que aparecerão nos documentos oficiais (PDFs) desta Câmara.</p>
        </div>

        {/* PARTE 1: CONFIGURAÇÕES GERAIS */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">
          
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">Identidade Visual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Cabeçalho Oficial (Imagem)</label>
                <input 
                  type="file" accept="image/png, image/jpeg"
                  onChange={(e) => handleImageUpload(e, "logoCabecalho")}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {form.logoCabecalho && <img src={form.logoCabecalho} alt="Preview Cabeçalho" className="mt-4 max-h-20 object-contain border border-gray-300 p-1 bg-white rounded" />}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Marca de Água / Fundo (Imagem)</label>
                <input 
                  type="file" accept="image/png, image/jpeg"
                  onChange={(e) => handleImageUpload(e, "marcaDagua")}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {form.marcaDagua && <img src={form.marcaDagua} alt="Preview Fundo" className="mt-4 max-h-20 object-contain border border-gray-300 p-1 bg-white rounded opacity-50" />}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">Informações do Rodapé Oficial</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Endereço e CEP (Rodapé)</label>
                <input 
                  type="text" 
                  value={form.enderecoRodape} 
                  onChange={(e) => setForm({ ...form, enderecoRodape: e.target.value })} 
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ex: Rua do Horto Florestal, 506 Centro, Baraúna-RN // CEP: 59.695-000" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Site e E-mail (Rodapé)</label>
                <input 
                  type="text" 
                  value={form.contatoRodape} 
                  onChange={(e) => setForm({ ...form, contatoRodape: e.target.value })} 
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ex: http://barauna.rn.leg.br/ // cmb.barauna@gmail.com" 
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">Variáveis de Texto</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome do(a) Prefeito(a) Atual</label>
                <input type="text" required value={form.prefeitoNome} onChange={(e) => setForm({ ...form, prefeitoNome: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Maria Divanize..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Palácio (Sede)</label>
                  <input type="text" required value={form.palacioNome} onChange={(e) => setForm({ ...form, palacioNome: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Manoel Alves Bezerra" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Sala das Sessões</label>
                  <input type="text" required value={form.salaSessoesNome} onChange={(e) => setForm({ ...form, salaSessoesNome: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cidade - Estado</label>
                  <input type="text" required value={form.cidadeEstado} onChange={(e) => setForm({ ...form, cidadeEstado: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Regimento Interno (Indicações)</label>
                  <input type="text" required value={form.artigoIndicacao} onChange={(e) => setForm({ ...form, artigoIndicacao: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-lg shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-5 h-5" /> {saving ? "A Guardar..." : "Guardar Configurações e Imagens"}
          </button>
        </form>

        {/* PARTE 2: GESTÃO DE SECRETARIAS (NOVO) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6 border-t-4 border-t-blue-800 mt-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Gestão de Secretarias e Destinos</h3>
            <p className="text-sm text-gray-500 mt-1">Registe os órgãos e os respetivos titulares. Estes dados ficarão disponíveis para os gabinetes na criação de ofícios e indicações.</p>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><Building2 className="w-4 h-4" /> Nome do Órgão / Secretaria</label>
              <input 
                type="text" 
                placeholder="Ex: Secretaria Mun. de Obras" 
                value={novaSecNome} 
                onChange={(e) => setNovaSecNome(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><User className="w-4 h-4" /> Nome do Titular / Secretário(a)</label>
              <input 
                type="text" 
                placeholder="Ex: João Silva" 
                value={novaSecTitular} 
                onChange={(e) => setNovaSecTitular(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
              />
            </div>
            <button onClick={handleAdicionarSecretaria} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-5 h-5" /> Adicionar
            </button>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3">Órgãos Disponíveis no Sistema ({secretarias.length})</h4>
            {secretarias.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">Nenhuma secretaria registada ainda.</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {secretarias.map((sec) => (
                  <li key={sec.id} className="p-4 hover:bg-gray-50 flex justify-between items-center group transition-colors">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{sec.nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Titular: {sec.titular}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoverSecretaria(sec.id)} 
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all"
                      title="Desativar Secretaria"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}