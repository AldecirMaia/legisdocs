"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    
    if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") return router.push("/painel");
    
    setUser(parsedUser);
    carregarConfiguracoes(parsedUser.tenantId);
  }, [router]);

  const carregarConfiguracoes = async (tenantId: string) => {
    try {
      const res = await fetch(${`process.env.NEXT_PUBLIC_API_URL}/tenant/${tenantId}`);
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
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

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
      const res = await fetch(${`process.env.NEXT_PUBLIC_API_URL}/tenant/${user.tenantId}/settings`, {
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

      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Parâmetros do Legislativo</h2>
        <p className="text-gray-600 mb-8">Configure as variáveis e a identidade visual que aparecerão nos documentos oficiais (PDFs) desta Câmara.</p>

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
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ex: Rua do Horto Florestal, 506 Centro, Baraúna-RN // CEP: 59.695-000" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Site e E-mail (Rodapé)</label>
                <input 
                  type="text" 
                  value={form.contatoRodape} 
                  onChange={(e) => setForm({ ...form, contatoRodape: e.target.value })} 
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" 
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
                <input type="text" required value={form.prefeitoNome} onChange={(e) => setForm({ ...form, prefeitoNome: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" placeholder="Ex: Maria Divanize..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Palácio (Sede)</label>
                  <input type="text" required value={form.palacioNome} onChange={(e) => setForm({ ...form, palacioNome: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" placeholder="Ex: Manoel Alves Bezerra" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Sala das Sessões</label>
                  <input type="text" required value={form.salaSessoesNome} onChange={(e) => setForm({ ...form, salaSessoesNome: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cidade - Estado</label>
                  <input type="text" required value={form.cidadeEstado} onChange={(e) => setForm({ ...form, cidadeEstado: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Regimento Interno (Indicações)</label>
                  <input type="text" required value={form.artigoIndicacao} onChange={(e) => setForm({ ...form, artigoIndicacao: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-lg shadow-md disabled:opacity-50">
            {saving ? "A Guardar..." : "💾 Guardar Configurações e Imagens"}
          </button>
        </form>
      </main>
    </div>
  );
}