"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GestaoGabinetes() {
  const router = useRouter();
  const [gabinetes, setGabinetes] = useState<any[]>([]);
  const [nomeGabinete, setNomeGabinete] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    carregarGabinetes(parsedUser.tenantId);
  }, [router]);

  const carregarGabinetes = async (tenantId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/list/${tenantId}`);
      const data = await res.json();
      setGabinetes(data);
    } catch (error) {
      console.error("Erro ao carregar gabinetes", error);
    }
  };

  const handleCriarGabinete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeGabinete.trim() || !user) return;
    setLoading(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nomeGabinete, tenantId: user.tenantId }),
      });
      setNomeGabinete("");
      carregarGabinetes(user.tenantId);
    } catch (error) {
      console.error("Erro ao criar gabinete", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para Inativar/Reativar
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gabinete/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      carregarGabinetes(user.tenantId); // Atualiza a lista para refletir a mudança
    } catch (error) {
      console.error("Erro ao alterar status", error);
    }
  };

  if (!user) return <div className="p-10">A carregar...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight cursor-pointer" onClick={() => router.push("/painel")}>
          LegisDocs <span className="text-sm font-normal text-blue-300 ml-2">/ Gabinetes</span>
        </h1>
        <button onClick={() => router.push("/painel")} className="text-blue-200 hover:text-white font-semibold">
          Voltar ao Painel
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestão de Gabinetes</h2>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h3 className="font-bold text-lg mb-4 text-gray-700">Registrar Novo Gabinete</h3>
          <form onSubmit={handleCriarGabinete} className="flex gap-4">
            <input
              type="text"
              value={nomeGabinete}
              onChange={(e) => setNomeGabinete(e.target.value)}
              placeholder="Ex: Gabinete da Vereadora Maria"
              required
              className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50">
              {loading ? "A Salvar..." : "Criar Gabinete"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-700">Gabinetes Registrados</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {gabinetes.length === 0 ? (
              <li className="p-6 text-gray-500 text-center">Nenhum gabinete encontrado.</li>
            ) : (
              gabinetes.map((gab) => (
                <li key={gab.id} className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors ${!gab.isActive ? 'opacity-60' : ''}`}>
                  <div className="mb-4 sm:mb-0">
                    <div className="flex items-center gap-3">
                      <p className={`font-bold text-lg ${gab.isActive ? 'text-gray-800' : 'text-gray-500 line-through'}`}>{gab.name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${gab.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {gab.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Membros vinculados: {gab.users?.length || 0}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleToggleStatus(gab.id, gab.isActive)}
                      className={`font-semibold text-sm px-3 py-1.5 rounded-md transition-colors ${gab.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                    >
                      {gab.isActive ? 'Inativar' : 'Reativar'}
                    </button>
                    <a href={`/painel/gabinetes/${gab.id}`} className={`font-semibold text-sm px-3 py-1.5 rounded-md transition-colors ${gab.isActive ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'pointer-events-none text-gray-400 bg-gray-100'}`}>
                      Ver Membros
                    </a>
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