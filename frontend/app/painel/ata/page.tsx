"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Download, Settings, Calendar, CheckCircle2, AlertCircle, 
  History, Search, Bell, ChevronDown, Menu, LogOut, Edit3, X, RefreshCw 
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface ParametrosAta {
  numeroSessao?: string;
  anoLegislativo?: string;
  periodoLegislativo?: string;
  legislatura?: string;
  dataExtenso?: string;
  horarioInicio?: string;
  presidente?: string;
  vereadorBiblia?: string;
  primeiroSecretario?: string;
  secretariaGeral?: string;
  textoFechamento?: string;
}

interface SessaoPautaInfo {
  id: string;
  nomeSessao: string;
  dataSessao: string;
  criadoEm: string;
  itens: any[];
  // Caso o backend já retorne os parâmetros salvos daquela sessão:
  parametrosAta?: ParametrosAta;
}

const FORM_INICIAL = {
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
};

export default function PrepararAta() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [pautaAtiva, setPautaAtiva] = useState<SessaoPautaInfo | null>(null);
  const [historicoPautas, setHistoricoPautas] = useState<SessaoPautaInfo[]>([]);

  // Controla se estamos editando uma ata do histórico
  const [sessaoEmEdicao, setSessaoEmEdicao] = useState<SessaoPautaInfo | null>(null);

  const [formData, setFormData] = useState(FORM_INICIAL);

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (!storedUser) return router.push("/");
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
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

  // Opção 1 do Histórico: Baixar PDF como está no servidor
  const baixarAtaComoEsta = async (pauta: SessaoPautaInfo) => {
    setDownloadingId(pauta.id);
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiEnv}/votacao/ata/sessao/${pauta.id}`);
      
      if (!res.ok) {
        throw new Error(`Erro do servidor: ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ata_${pauta.nomeSessao.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro no download da ata:", error);
      alert("Erro de conexão ao tentar descarregar a ata. Verifique se o servidor backend está ativo.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Opção 2 do Histórico: Carregar dados da sessão antiga no formulário para edição
  const iniciarEdicaoAtaAntiga = async (pauta: SessaoPautaInfo) => {
    setSessaoEmEdicao(pauta);

    // Tenta buscar detalhes/parâmetros salvos da sessão no backend (caso não venham na listagem)
    let paramsSalvos: ParametrosAta = pauta.parametrosAta || {};
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const resDetalhes = await fetch(`${apiEnv}/votacao/ata/sessao/${pauta.id}/dados`);
      if (resDetalhes.ok) {
        const detalhes = await resDetalhes.json();
        if (detalhes?.parametrosAta) {
          paramsSalvos = detalhes.parametrosAta;
        }
      }
    } catch {
      // Fallback silencioso: usa os dados básicos da pauta se a rota de detalhes ainda não existir
    }

    // Extrai número da sessão do nome (ex: "20ª Sessão Ordinária" -> "20ª") se não houver parâmetro salvo
    const matchNumero = pauta.nomeSessao.match(/^(\d+[ªº]?)/);

    setFormData({
      numeroSessao: paramsSalvos.numeroSessao || (matchNumero ? matchNumero[1] : ""),
      anoLegislativo: paramsSalvos.anoLegislativo || "",
      periodoLegislativo: paramsSalvos.periodoLegislativo || "",
      legislatura: paramsSalvos.legislatura || "",
      dataExtenso: paramsSalvos.dataExtenso || "",
      horarioInicio: paramsSalvos.horarioInicio || "",
      presidente: paramsSalvos.presidente || "",
      vereadorBiblia: paramsSalvos.vereadorBiblia || "",
      primeiroSecretario: paramsSalvos.primeiroSecretario || "",
      secretariaGeral: paramsSalvos.secretariaGeral || "",
      textoFechamento: paramsSalvos.textoFechamento || ""
    });

    // Rola suavemente até o formulário de parâmetros
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicaoAtaAntiga = () => {
    setSessaoEmEdicao(null);
    setFormData(FORM_INICIAL);
  };

  // Gera ata nova (sessão atual) OU regera ata antiga editada
  const gerarAta = async () => {
    setLoading(true);
    try {
      const apiEnv = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const isEdicaoHistorica = Boolean(sessaoEmEdicao);

      // Se for sessão atual, pega quórum do localStorage; se for histórica, o backend usa a pauta/quórum do sessaoId
      const presencasSalvas = localStorage.getItem("legisdocs_presencas_sessao");
      const presencas = !isEdicaoHistorica && presencasSalvas ? JSON.parse(presencasSalvas) : undefined;
      const dataSessao = isEdicaoHistorica
        ? sessaoEmEdicao!.dataSessao
        : localStorage.getItem("legisdocs_data_sessao") || new Date().toISOString();

      const res = await fetch(`${apiEnv}/votacao/ata/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tenantId,
          sessaoId: sessaoEmEdicao?.id, // Envia o ID da sessão antiga quando estiver editando
          presencas,
          dataSessao,
          ...formData 
        })
      });

      if (!res.ok) throw new Error("Erro ao gerar a Ata");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nomeArquivo = isEdicaoHistorica
        ? `Ata_${sessaoEmEdicao!.nomeSessao.replace(/\s+/g, '_')}_Editada.pdf`
        : `Ata_Sessao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (!isEdicaoHistorica) {
        localStorage.removeItem("legisdocs_presencas_sessao");
        localStorage.removeItem("legisdocs_data_sessao");
      } else {
        // Recarrega o histórico caso o backend tenha atualizado os parâmetros salvos
        carregarDadosPauta(tenantId);
      }

    } catch (error) {
      console.error(error);
      alert("Falha ao gerar o PDF da Ata.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("legisdocs_token");
    localStorage.removeItem("legisdocs_user");
    router.push("/");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">A carregar interface...</div>;

  return (
    <div lang="pt-BR" className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* 1. SIDEBAR COMPONENT */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 2. ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* CABEÇALHO SUPERIOR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-800">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex max-w-xl items-center w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar documentos..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-4">
            <button className="relative text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="group relative cursor-pointer flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-700 leading-tight">{user.name}</span>
                <span className="text-xs text-gray-500 font-medium capitalize">{user.role.toLowerCase()}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {user.name.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
              
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Breadcrumbs e Título */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link href="/painel" className="hover:text-blue-600 transition-colors">Início</Link>
                <span>/</span>
                <span className="font-semibold text-gray-700">Atas e Relatórios</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Gerador de Ata Oficial</h2>
              <p className="text-gray-600 mt-1">Preencha os parâmetros e dados da sessão para gerar o documento oficial em PDF com quórum e votos computados.</p>
            </div>

            {/* Banner Contextual: Modo Edição de Ata Histórica vs Status da Pauta Atual */}
            {sessaoEmEdicao ? (
              <div className="rounded-xl p-5 border shadow-sm bg-amber-50 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Edit3 className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded mb-1">
                      Modo de Edição de Ata Anterior
                    </span>
                    <h3 className="font-bold text-base">{sessaoEmEdicao.nomeSessao}</h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Data: <strong>{sessaoEmEdicao.dataSessao}</strong> • {Array.isArray(sessaoEmEdicao.itens) ? sessaoEmEdicao.itens.length : 0} itens na pauta. Altere os campos abaixo e clique em <strong>Salvar e Regerar Ata PDF</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelarEdicaoAtaAntiga}
                  className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shrink-0 self-start sm:self-center transition-colors"
                >
                  <X className="w-4 h-4" /> Cancelar Edição
                </button>
              </div>
            ) : (
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
                      Ainda não enviou a pauta do dia através do "Construtor de Pauta". A ata usará os registos gerais disponíveis, ou selecione uma sessão no histórico abaixo para editar/baixar.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Form de Parâmetros */}
            <div
              ref={formRef}
              className={`bg-white rounded-xl shadow-sm border p-6 sm:p-8 transition-colors ${
                sessaoEmEdicao ? "border-amber-300 ring-2 ring-amber-100" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Settings className={`w-5 h-5 ${sessaoEmEdicao ? "text-amber-600" : "text-blue-600"}`} />
                  {sessaoEmEdicao ? `Editando Parâmetros — ${sessaoEmEdicao.nomeSessao}` : "Parâmetros do Documento"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº da Sessão Ordinária</label>
                  <input type="text" name="numeroSessao" value={formData.numeroSessao} onChange={handleChange} placeholder="Ex: 20ª" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ano Legislativo</label>
                  <input type="text" name="anoLegislativo" value={formData.anoLegislativo} onChange={handleChange} placeholder="Ex: 2º" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Período Legislativo</label>
                  <input type="text" name="periodoLegislativo" value={formData.periodoLegislativo} onChange={handleChange} placeholder="Ex: 1º Período" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Legislatura</label>
                  <input type="text" name="legislatura" value={formData.legislatura} onChange={handleChange} placeholder="Ex: 2025/2028" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data por Extenso (Cabeçalho)</label>
                  <input type="text" name="dataExtenso" value={formData.dataExtenso} onChange={handleChange} placeholder="Ex: sexto dia do mês de outubro..." className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Horário de Início</label>
                  <input type="text" name="horarioInicio" value={formData.horarioInicio} onChange={handleChange} placeholder="Ex: 09:00 horas" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Presidente da Sessão</label>
                  <input type="text" name="presidente" value={formData.presidente} onChange={handleChange} placeholder="Ex: Nome do Presidente" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vereador (Mensagem Bíblica)</label>
                  <input type="text" name="vereadorBiblia" value={formData.vereadorBiblia} onChange={handleChange} placeholder="Ex: Nome do Vereador" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">1º Secretário (Fez a Chamada)</label>
                  <input type="text" name="primeiroSecretario" value={formData.primeiroSecretario} onChange={handleChange} placeholder="Ex: Nome do Primeiro Secretário" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Secretária Geral (Lavrou a Ata)</label>
                  <input type="text" name="secretariaGeral" value={formData.secretariaGeral} onChange={handleChange} placeholder="Ex: Nome do Secretário(a)" className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Texto de Encerramento</label>
                <textarea name="textoFechamento" value={formData.textoFechamento} onChange={handleChange} rows={4} placeholder="Ex: Encerrada a ordem do dia. Em ato contínuo..." className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"></textarea>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {sessaoEmEdicao && (
                  <button
                    type="button"
                    onClick={cancelarEdicaoAtaAntiga}
                    className="sm:w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm py-4 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  onClick={gerarAta}
                  disabled={loading}
                  className={`flex-1 text-white font-black text-base py-4 rounded-xl shadow-sm hover:shadow flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 ${
                    sessaoEmEdicao ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    "A GERAR DOCUMENTO..."
                  ) : sessaoEmEdicao ? (
                    <><RefreshCw className="w-5 h-5" /> SALVAR E REGERAR ATA PDF</>
                  ) : (
                    <><Download className="w-5 h-5" /> GERAR ATA EM PDF</>
                  )}
                </button>
              </div>
            </div>

            {/* Histórico de Sessões */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
                <History className="w-5 h-5 text-gray-400" /> Histórico de Sessões Registadas
              </h3>

              {historicoPautas.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">Nenhum histórico de sessão anterior encontrado no sistema.</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {historicoPautas.map((p) => {
                    const estaEditandoEsta = sessaoEmEdicao?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`py-3.5 px-2 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors ${
                          estaEditandoEsta ? "bg-amber-50/70" : "hover:bg-gray-50/70"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-800">{p.nomeSessao}</p>
                            {estaEditandoEsta && (
                              <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                                Em edição
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" /> Data: {p.dataSessao} | {Array.isArray(p.itens) ? p.itens.length : 0} itens tramitados
                          </p>
                        </div>

                        {/* Duas opções: Editar Parâmetros ou Baixar como está */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoAtaAntiga(p)}
                            className="flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar Dados
                          </button>

                          <button
                            type="button"
                            disabled={downloadingId === p.id}
                            onClick={() => baixarAtaComoEsta(p)}
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {downloadingId === p.id ? "Baixando..." : "Baixar como está"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}