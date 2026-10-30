"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Verifica se o utilizador já está logado e manda direto para o painel
  useEffect(() => {
    const verificarSessaoAtiva = () => {
      const token = localStorage.getItem("legisdocs_token");
      const user = localStorage.getItem("legisdocs_user");
      if (token && user) {
        router.push("/painel");
      }
    };
    verificarSessaoAtiva();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
      }

      const data = await response.json();
      localStorage.setItem("legisdocs_token", data.access_token);
      localStorage.setItem("legisdocs_user", JSON.stringify(data.user));
      router.push("/painel");
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg flex flex-col md:flex-row w-full max-w-4xl overflow-hidden">
        <div className="bg-blue-700 md:w-1/2 p-8 text-white flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl font-bold mb-4">LegisDocs</h1>
          <p className="text-blue-100 text-lg">Sistema Integrado de Gestão de Documentos Legislativos</p>
        </div>
        <div className="md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso ao Sistema</h2>
          {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{errorMsg}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                // text-gray-900 adicionado para texto preto, e focus styles para melhor UX
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                // text-gray-900 adicionado para texto preto, e focus styles para melhor UX
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg mt-4 hover:bg-blue-700 transition-colors disabled:opacity-70">
              {loading ? "A Autenticar..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}