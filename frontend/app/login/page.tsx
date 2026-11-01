"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Mail, Loader2, AlertCircle } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [ano, setAno] = useState("2026");

  useEffect(() => {
    setAno(new Date().getFullYear().toString());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiEnv}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Credenciais inválidas. Verifique o seu e-mail e palavra-passe.");
      }

      const data = await res.json();
      
      // LOG PARA DEBUG: Veja no console (F12) o que o backend realmente devolveu
      console.log("Resposta do Login:", data);

      // Extrai o utilizador dependendo do formato da sua API
      const userData = data.user ? data.user : data;
      
      // Guarda os dados de sessão corretamente
      localStorage.setItem("legisdocs_user", JSON.stringify(userData));
      
      // Se a API também devolver um token, é boa prática guardá-lo à parte
      if (data.access_token || data.token) {
        localStorage.setItem("legisdocs_token", data.access_token || data.token);
      }
      
      // Redireciona para o painel principal
      router.push("/painel");
    } catch (err: any) {
      setError(err.message || "Erro ao tentar iniciar sessão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Lado Esquerdo - Branding */}
      <div className="md:flex-1 bg-blue-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm font-semibold mb-12">
            <ArrowLeft className="w-4 h-4" /> Voltar ao site
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-black tracking-tight">LegisDocs</span>
          </div>
          <h1 className="text-4xl font-black mb-4 leading-tight">Gestão Legislativa<br/>Inteligente.</h1>
          <p className="text-blue-200 text-lg max-w-md leading-relaxed">
            Aceda ao portal restrito da sua Câmara Municipal para gerir pautas, conduzir sessões e gerar atas com validade jurídica.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-blue-300 font-medium hidden md:block">
          © {ano} Inova Soluções. Ambiente Seguro ICP-Brasil.
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="md:flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Iniciar Sessão</h2>
            <p className="text-slate-500">Introduza as suas credenciais para aceder ao sistema</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail Institucional</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="nome@camara.gov.br"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-bold text-slate-700">Palavra-passe</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> A Autenticar...</>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center md:hidden text-sm text-slate-400 font-medium">
            © {ano} Inova Soluções.
          </div>
        </div>
      </div>
    </div>
  );
}