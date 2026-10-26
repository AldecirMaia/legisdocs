"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MembrosGabinete({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  const [gabineteId, setGabineteId] = useState<string>("");
  const [membros, setMembros] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "VEREADOR" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    params.then((res) => setGabineteId(res.id));
  }, [params]);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    setUser(JSON.parse(storedUser));
    
    if (gabineteId) {
      carregarMembros(gabineteId);
    }
  }, [router, gabineteId]);

  const carregarMembros = async (id: string) => {
    try {
      const res = await fetch(${`process.env.NEXT_PUBLIC_API_URL}/user/gabinete/${id}`);
      const data = await res.json();
      setMembros(data);
    } catch (error) {
      console.error("Erro ao carregar membros", error);
    }
  };

  const handleAdicionarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("`${process.env.NEXT_PUBLIC_API_URL}/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          tenantId: user.tenantId,
          gabineteId: gabineteId
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao criar membro.");
      }

      setFormData({ name: "", email: "", password: "", role: "VEREADOR" });
      carregarMembros(gabineteId); // Recarrega a lista
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !gabineteId) return <div className="p-10 text-gray-500 animate-pulse">A carregar interface...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>
          LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Membros do Gabinete</span>
        </h1>
        <button onClick={() => router.push("/painel/gabinetes")} className="text-blue-200 hover:text-white font-semibold transition-colors">
          Voltar aos Gabinetes
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestão de Equipa</h2>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h3 className="font-bold text-lg mb-4 text-gray-700">Registar Novo Membro</h3>
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdicionarMembro} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input type="text" placeholder="Nome" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="lg:col-span-1 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" />
            <input type="email" placeholder="E-mail de acesso" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="lg:col-span-1 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" />
            <input type="password" placeholder="Palavra-passe" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="lg:col-span-1 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" />
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="lg:col-span-1 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black">
              <option value="VEREADOR">Vereador (Titular)</option>
              <option value="ASSESSOR">Assessor</option>
            </select>
            <button type="submit" disabled={loading} className="lg:col-span-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50">
              {loading ? "A Guardar..." : "Adicionar"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-700">Membros Ativos</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {membros.length === 0 ? (
              <li className="p-8 text-gray-500 text-center flex flex-col items-center">
                <span className="text-4xl mb-2">👥</span>
                Este gabinete ainda não tem membros vinculados.
              </li>
            ) : (
              membros.map((m) => (
                <li key={m.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-bold text-gray-800">{m.name} <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{m.role}</span></p>
                    <p className="text-sm text-gray-500">{m.email}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}