"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("`${process.env.NEXT_PUBLIC_API_URL}/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
      }

      const data = await response.json();
      
      // Guarda o passaporte (Token) e os dados do utilizador na memória do navegador
      localStorage.setItem("legisdocs_token", data.access_token);
      localStorage.setItem("legisdocs_user", JSON.stringify(data.user));

      // Redireciona para o painel
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
        
        {/* Lado Esquerdo - Branding */}
        <div className="bg-blue-700 md:w-1/2 p-8 text-white flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl font-bold mb-4">LegisDocs</h1>
          <p className="text-blue-100 text-lg">
            Sistema Integrado de Gestão de Documentos Legislativos
          </p>
          <div className="mt-8 space-y-2 text-sm text-blue-200">
            <p>✓ Acesso Gabinete Parlamentar</p>
            <p>✓ Administração da Secretaria</p>
            <p>✓ Gestão Geral do Sistema</p>
          </div>
        </div>

        {/* Lado Direito - Formulário */}
        <div className="md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso ao Sistema</h2>
          <p className="text-gray-500 mb-8">Introduza as suas credenciais para continuar.</p>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gabinete@camara.gov.br"
                required
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4 disabled:opacity-70"
            >
              {loading ? "A Autenticar..." : "Entrar"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}