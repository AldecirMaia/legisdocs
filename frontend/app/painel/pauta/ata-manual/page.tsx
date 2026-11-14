"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Vote, FileText,
  Send, Users, ThumbsUp, ThumbsDown, MinusCircle, UserX, CheckSquare
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

interface Vereador {
  id: string;
  name: string;
  partido?: string;
}

interface PautaItemAta {
  id: string;
  type: string;
  numero: string;
  ementa: string;
  propositor: string;
  tramitacao: "LEITURA" | "VOTAÇÃO";
  turnoVotacao?: string;
  // Novos campos manuais para a Ata
  teveVotacao: boolean;
  resultado: "APROVADO" | "REPROVADO" | "ADIADO" | "APENAS_LEITURA";
  votosFavor: string[];    // Nomes dos vereadores a favor
  votosContra: string[];   // Nomes dos vereadores contra
  abstencoes: string[];    // Nomes das abstenções
  ausentes: string[];      // Nomes dos ausentes
  observacaoAta: string;
}

interface RascunhoPauta {
  nomeSessao: string;
  numeroSessao: string;
  tipoSessao: string;
  periodoSessao: string;
  legislatura: string;
  dataSessao: string;
  horarioSessao: string;
  itens: Omit<PautaItemAta, "teveVotacao" | "resultado" | "votosFavor" | "votosContra" | "abstencoes" | "ausentes" | "observacaoAta">[];
}

export default function LancamentoAtaManual() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [vereadores, setVereadores] = useState<Vereador[]>([]);
  const [rascunho, setRascunho] = useState<RascunhoPauta | null>(null);
  const [itensAta, setItensAta] = useState<PautaItemAta[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "warning";
    redirect?: boolean;
  }>({ show: false, message: "", type: "success" });

  useEffect(() => {
    const iniciar = async () => {
      const storedUser = localStorage.getItem("legisdocs_user");
      if (!storedUser) return router.push("/");
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "SECRETARIA" && parsedUser.role !== "SUPER_ADMIN") {
        return router.push("/painel");
      }
      setUser(parsedUser);

      const rawPauta = sessionStorage.getItem("legisdocs_pauta_para_ata");
      if (!rawPauta) {
        return router.push("/painel/pauta");
      }

      const dadosPauta: RascunhoPauta = JSON.parse(rawPauta);
      setRascunho(dadosPauta);

      // Inicializa os itens com defaults inteligentes
      const itensIniciais: PautaItemAta[] = dadosPauta.itens.map((item) => {
        const isVotacao = item.tramitacao === "VOTAÇÃO";
        return {
          ...item,
          teveVotacao: isVotacao,
          resultado: isVotacao ? "APROVADO" : "APENAS_LEITURA",
          votosFavor: [],
          votosContra: [],
          abstencoes: [],
          ausentes: [],
          observacaoAta: "",
        };
      });
      setItensAta(itensIniciais);

      // Busca os vereadores ativos do Tenant para facilitar o preenchimento nominal
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/tenant/${parsedUser.tenantId}`);
        if (res.ok) {
          const users = await res.json();
          const listaVereadores = (Array.isArray(users) ? users : []).filter(
            (u: any) => u.role === "VEREADOR" && u.isActive !== false
          );
          setVereadores(listaVereadores);
        }
      } catch (err) {
        console.error("Erro ao carregar vereadores:", err);
      }
    };

    iniciar();
  }, [router]);

  const atualizarItem = (id: string, patch: Partial<PautaItemAta>) => {
    setItensAta((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  // Alterna o voto de um vereador específico em um item (remove das outras listas automaticamente)
  const registrarVotoVereador = (
    itemId: string,
    nomeVereador: string,
    opcao: "FAVOR" | "CONTRA" | "ABSTENCAO" | "AUSENTE"
  ) => {
    setItensAta((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const favor = item.votosFavor.filter((n) => n !== nomeVereador);
        const contra = item.votosContra.filter((n) => n !== nomeVereador);
        const abst = item.abstencoes.filter((n) => n !== nomeVereador);
        const aus = item.ausentes.filter((n) => n !== nomeVereador);

        // Se clicar no mesmo status já selecionado, apenas desmarca
        const jaEstava =
          (opcao === "FAVOR" && item.votosFavor.includes(nomeVereador)) ||
          (opcao === "CONTRA" && item.votosContra.includes(nomeVereador)) ||
          (opcao === "ABSTENCAO" && item.abstencoes.includes(nomeVereador)) ||
          (opcao === "AUSENTE" && item.ausentes.includes(nomeVereador));

        if (!jaEstava) {
          if (opcao === "FAVOR") favor.push(nomeVereador);
          if (opcao === "CONTRA") contra.push(nomeVereador);
          if (opcao === "ABSTENCAO") abst.push(nomeVereador);
          if (opcao === "AUSENTE") aus.push(nomeVereador);
        }

        // Sugere automaticamente o resultado com base no placar
        const resultadoAuto =
          favor.length > contra.length
            ? "APROVADO"
            : contra.length > favor.length
            ? "REPROVADO"
            : item.resultado;

        return {
          ...item,
          votosFavor: favor,
          votosContra: contra,
          abstencoes: abst,
          ausentes: aus,
          resultado: resultadoAuto,
        };
      })
    );
  };

  // Atalho: Aprovar por Unanimidade (coloca todos os vereadores como A Favor)
  const marcarUnanimidade = (itemId: string) => {
    const todosNomes = vereadores.map((v) => v.name);
    atualizarItem(itemId, {
      teveVotacao: true,
      resultado: "APROVADO",
      votosFavor: todosNomes,
      votosContra: [],
      abstencoes: [],
      ausentes: [],
    });
  };

  const enviarParaAta = async () => {
    if (!rascunho || !user) return;

    // Validação: se teve votação e não é adiado, exigir pelo menos o resultado definido
    for (const item of itensAta) {
      if (item.teveVotacao && item.resultado === "APENAS_LEITURA") {
        return setAlertConfig({
          show: true,
          type: "warning",
          message: `Defina o resultado (Aprovado/Reprovado) do item ${item.type} ${item.numero}.`,
        });
      }
    }

    setEnviando(true);
    try {
      const payloadItens = itensAta.map((item) => ({
        ...item,
        placar: item.teveVotacao
          ? `${item.votosFavor.length} Favor x ${item.votosContra.length} Contra`
          : "Sem votação (Leitura)",
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pauta/enviar-ata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: user.tenantId,
          nomeSessao: rascunho.nomeSessao,
          dataSessao: rascunho.dataSessao,
          horarioSessao: rascunho.horarioSessao,
          itens: payloadItens,
        }),
      });

      if (res.ok) {
        sessionStorage.removeItem("legisdocs_pauta_para_ata");
        setAlertConfig({
          show: true,
          type: "success",
          message: "Pauta e resultados de votação registrados! Os documentos avançaram e já estão disponíveis na Ata.",
          redirect: true,
        });
      } else {
        throw new Error();
      }
    } catch (error) {
      console.error(error);
      setAlertConfig({
        show: true,
        type: "error",
        message: "Erro ao enviar pauta para a Ata. Verifique a conexão.",
      });
    } finally {
      setEnviando(false);
    }
  };

  if (!user || !rascunho) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando dados da pauta...</div>;
  }

  return (
    <div lang="pt-BR" className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {alertConfig.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            {alertConfig.type === "success" && <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />}
            {alertConfig.type === "warning" && <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />}
            {alertConfig.type === "error" && <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {alertConfig.type === "success" ? "Registrado!" : alertConfig.type === "warning" ? "Atenção" : "Erro"}
            </h3>
            <p className="text-gray-600 mb-6 text-sm">{alertConfig.message}</p>
            <button
              onClick={() => {
                setAlertConfig({ ...alertConfig, show: false });
                if (alertConfig.redirect) router.push("/painel/ata");
              }}
              className="w-full font-bold py-3 rounded-xl bg-gray-900 text-white"
            >
              {alertConfig.redirect ? "Ir para a Ata" : "OK"}
            </button>
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div>
                <Link
                  href="/painel/pauta"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Construtor de Pauta
                </Link>
                <h1 className="text-xl font-bold text-gray-900">Registro Manual de Deliberações para Ata</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {rascunho.nomeSessao} • Data: <strong>{rascunho.dataSessao}</strong>
                </p>
              </div>

              <button
                onClick={enviarParaAta}
                disabled={enviando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {enviando ? "Processando..." : "Concluir e Enviar p/ Ata"}
              </button>
            </div>

            {/* Lista de Itens da Pauta para Preenchimento */}
            <div className="space-y-5">
              {itensAta.map((item, idx) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Topo do Card */}
                  <div className="bg-slate-50 border-b border-gray-200 px-5 py-3 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {item.type} Nº {item.numero}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {item.tramitacao === "LEITURA" ? "Expediente" : item.turnoVotacao || "Ordem do Dia"}
                      </span>
                    </div>

                    {/* Switch: Teve Votação? */}
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        checked={item.teveVotacao}
                        onChange={(e) => {
                          const votou = e.target.checked;
                          atualizarItem(item.id, {
                            teveVotacao: votou,
                            resultado: votou ? "APROVADO" : "APENAS_LEITURA",
                          });
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-gray-700">Houve Votação neste item</span>
                    </label>
                  </div>

                  {/* Ementa e Propositor */}
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-sm text-gray-700">{item.ementa}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Propositor: <strong className="text-gray-700">{item.propositor}</strong>
                      </p>
                    </div>

                    {/* Bloco de Votação (aparece se teveVotacao === true) */}
                    {item.teveVotacao ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          {/* Resultado Final */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600 uppercase">Resultado:</span>
                            {(["APROVADO", "REPROVADO", "ADIADO"] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => atualizarItem(item.id, { resultado: status })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  item.resultado === status
                                    ? status === "APROVADO"
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : status === "REPROVADO"
                                      ? "bg-red-600 text-white border-red-600"
                                      : "bg-amber-500 text-white border-amber-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>

                          {/* Botão rápido de Unanimidade */}
                          {vereadores.length > 0 && (
                            <button
                              type="button"
                              onClick={() => marcarUnanimidade(item.id)}
                              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                            >
                              <CheckSquare className="w-3.5 h-3.5" /> Aprovado por Unanimidade ({vereadores.length} votos)
                            </button>
                          )}
                        </div>

                        {/* Matriz Nominal de Vereadores */}
                        {vereadores.length > 0 && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" /> Registro Nominal de Votos:
                              </span>
                              <span className="text-xs font-semibold text-gray-500">
                                Favor: <strong className="text-emerald-600">{item.votosFavor.length}</strong> | Contra:{" "}
                                <strong className="text-red-600">{item.votosContra.length}</strong> | Abst.:{" "}
                                <strong>{item.abstencoes.length}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {vereadores.map((v) => {
                                const isFavor = item.votosFavor.includes(v.name);
                                const isContra = item.votosContra.includes(v.name);
                                const isAbst = item.abstencoes.includes(v.name);
                                const isAus = item.ausentes.includes(v.name);

                                return (
                                  <div
                                    key={v.id}
                                    className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs"
                                  >
                                    <span className="font-semibold text-gray-800 truncate pr-2">{v.name}</span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button
                                        type="button"
                                        title="A Favor"
                                        onClick={() => registrarVotoVereador(item.id, v.name, "FAVOR")}
                                        className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${
                                          isFavor ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-emerald-50"
                                        }`}
                                      >
                                        <ThumbsUp className="w-3 h-3" /> Sim
                                      </button>
                                      <button
                                        type="button"
                                        title="Contra"
                                        onClick={() => registrarVotoVereador(item.id, v.name, "CONTRA")}
                                        className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${
                                          isContra ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-50"
                                        }`}
                                      >
                                        <ThumbsDown className="w-3 h-3" /> Não
                                      </button>
                                      <button
                                        type="button"
                                        title="Abstenção"
                                        onClick={() => registrarVotoVereador(item.id, v.name, "ABSTENCAO")}
                                        className={`px-2 py-1 rounded font-bold ${
                                          isAbst ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        Abst.
                                      </button>
                                      <button
                                        type="button"
                                        title="Ausente"
                                        onClick={() => registrarVotoVereador(item.id, v.name, "AUSENTE")}
                                        className={`px-2 py-1 rounded font-bold ${
                                          isAus ? "bg-slate-600 text-white" : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        Aus.
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-600 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Constará na Ata apenas como <strong>Lido no Expediente / Sem Votação</strong>.</span>
                      </div>
                    )}

                    {/* Campo livre de observação para o texto da Ata */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                        Observação / Detalhes para constar na Ata (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Aprovado com emenda modificativa do Vereador João; Pedido de vista concedido..."
                        value={item.observacaoAta}
                        onChange={(e) => atualizarItem(item.id, { observacaoAta: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}