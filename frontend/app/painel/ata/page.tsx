"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowLeft, Download, Settings, Calendar, CheckCircle2, AlertCircle, History } from "lucide-react";

interface SessaoPautaInfo {
  id: string;
  nomeSessao: string;
  dataSessao: string;
  criadoEm: string;
  itens: any[];
}

export default function PrepararAta() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pautaAtiva, setPautaAtiva] = useState<SessaoPautaInfo | null>(null);
  const [historicoPautas, setHistoricoPautas] = useState<SessaoPautaInfo[]>([]);

  // Campos limpos para preenchimento com placeholders dinâmicos
  const [formData, setFormData] = useState({
    numeroSessao: "",
    anoLegislativo: "",
    periodoLegislativo: "",
    legislatura: "",
    dataExtenso: "",
    horarioInicio: "",
    presidente: "",
    vereadorBiblia: "",
    primeiroSecretario: "",
    secretariaGeral: "",
    textoFechamento: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setTenantId(parsedUser.tenantId);

    carregarDadosPauta(parsedUser.tenantId);
  }, [router]);

  const carregarDadosPauta = async (tId: string) => {
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const resAtiva = await fetch(`${apiEnv}/pauta/ativa/${tId}`);
      if (resAtiva.ok) {
        const textAtiva = await resAtiva.text();
        if (textAtiva && textAtiva.trim() !== "") {
          const dataAtiva = JSON.parse(textAtiva);
          if (dataAtiva) setPautaAtiva(dataAtiva);
        }
      }

      const resHistorico = await fetch(`${apiEnv}/pauta/historico/${tId}`);
      if (resHistorico.ok) {
        const dataHist = await resHistorico.json();
        if (Array.isArray(dataHist)) setHistoricoPautas(dataHist);
      }
    } catch (error) {
      console.error("Erro ao carregar dados da pauta para ata:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const gerarAta = async () => {
    setLoading(true);
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiEnv}/votacao/ata/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...formData })
      });

      if (!res.ok) throw new Error("Erro ao gerar a Ata");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ata_Sessao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      alert("Falha ao gerar o PDF da Ata.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-300" />
          <h1 className="text-xl font-bold tracking-tight">Preparação de Ata da Sessão</h1>
        </div>
        <Link href="/painel" className="flex items-center gap-2 text-blue-200 hover:text-white font-semibold bg-blue-800 px-4 py-2 rounded-lg text-sm border border-blue-700">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </Link>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full mt-6 space-y-6">
        
        {/* AVISO DE IDENTIFICAÇÃO DA PAUTA DO DIA */}
        <div className={`rounded-xl p-5 border shadow-sm flex items-start gap-4 ${
          pautaAtiva ? 'bg-green-50 border-green-200 text-green-900' : 'bg-yellow-50 border-yellow-200 text-yellow-900'
        }`}>
          {pautaAtiva ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-1">
              {pautaAtiva ? "Pauta Oficial Carregada para esta Ata" : "Atenção: Nenhuma Pauta Oficial Enviada Hoje"}
            </h3>
            {pautaAtiva ? (
              <div className="text-sm space-y-1">
                <p><strong>Sessão:</strong> {pautaAtiva.nomeSessao}</p>
                <p><strong>Data Registada:</strong> {pautaAtiva.dataSessao} | <strong>Total de Itens na Pauta:</strong> {Array.isArray(pautaAtiva.itens) ? pautaAtiva.itens.length : 0}</p>
              </div>
            ) : (
              <p className="text-sm">
                Ainda não enviou a pauta do dia através do "Construtor de Pauta". A ata usará os registos gerais disponíveis, mas recomenda-se enviar a pauta primeiro para garantir precisão total.
              </p>
            )}
          </div>
        </div>

        {/* FORMULÁRIO DE PARÂMETROS COM PLACEHOLDERS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
            <Settings className="w-5 h-5 text-gray-400" /> Parâmetros do Documento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nº da Sessão Ordinária</label>
              <input type="text" name="numeroSessao" value={formData.numeroSessao} onChange={handleChange} placeholder="Ex: 20ª" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ano Legislativo</label>
              <input type="text" name="anoLegislativo" value={formData.anoLegislativo} onChange={handleChange} placeholder="Ex: 2º" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Data por Extenso (Cabeçalho)</label>
              <input type="text" name="dataExtenso" value={formData.dataExtenso} onChange={handleChange} placeholder="Ex: sexto dia do mês de outubro..." className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horário de Início</label>
              <input type="text" name="horarioInicio" value={formData.horarioInicio} onChange={handleChange} placeholder="Ex: 09:00 horas" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Presidente da Sessão</label>
              <input type="text" name="presidente" value={formData.presidente} onChange={handleChange} placeholder="Ex: Nome do Presidente" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Vereador (Mensagem Bíblica)</label>
              <input type="text" name="vereadorBiblia" value={formData.vereadorBiblia} onChange={handleChange} placeholder="Ex: Nome do Vereador" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">1º Secretário (Fez a Chamada)</label>
              <input type="text" name="primeiroSecretario" value={formData.primeiroSecretario} onChange={handleChange} placeholder="Ex: Nome do Primeiro Secretário" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Secretária Geral (Lavrou a Ata)</label>
              <input type="text" name="secretariaGeral" value={formData.secretariaGeral} onChange={handleChange} placeholder="Ex: Nome do Secretário(a)" className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-1">Texto de Encerramento</label>
            <textarea name="textoFechamento" value={formData.textoFechamento} onChange={handleChange} rows={4} placeholder="Ex: Encerrada a ordem do dia. Em ato contínuo..." className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white"></textarea>
          </div>

          <button 
            onClick={gerarAta}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 rounded-xl shadow-md flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
          >
            {loading ? "A GERAR DOCUMENTO..." : <><Download className="w-6 h-6" /> GERAR ATA EM PDF</>}
          </button>
        </div>

        {/* HISTÓRICO DE ATAS E PAUTAS ANTERIORES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-4">
            <History className="w-5 h-5 text-gray-400" /> Histórico de Sessões Registadas
          </h2>

          {historicoPautas.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">Nenhum histórico de sessão anterior encontrado no sistema.</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {historicoPautas.map((p) => (
                <div key={p.id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{p.nomeSessao}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" /> Data: {p.dataSessao} | {Array.isArray(p.itens) ? p.itens.length : 0} itens tramitados
                    </p>
                  </div>
                  <button 
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                        const res = await fetch(`${apiEnv}/votacao/ata/sessao/${p.id}`);
                        
                        if (!res.ok) {
                          throw new Error(`Erro do servidor: ${res.status}`);
                        }

                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Ata_${p.nomeSessao.replace(/\s+/g, '_')}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } catch (error) {
                        console.error("Erro no download da ata:", error);
                        alert("Erro de conexão ao tentar descarregar a ata. Verifique se o servidor backend está ativo.");
                      }
                    }}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar Ata PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}