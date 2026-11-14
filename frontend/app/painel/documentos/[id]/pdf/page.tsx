"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, FileText, ShieldCheck } from "lucide-react";

interface DocumentoPdf {
  id: string;
  type: string;
  protocolNum: number;
  year: number;
  status: string;
  ementa: string;
  motivo?: string;
  texto?: string;
  artigos?: string;
  justificativa?: string;
  secretariaDestino?: string;
  nomeSecretario?: string;
  createdAt: string;
  updatedAt?: string;
  assinaturaHash?: string;
  author?: { name?: string; cargo?: string };
  gabinete?: { name?: string; vereadorName?: string; partido?: string };
}

interface TenantConfig {
  name?: string;
  estadoNome?: string;
  cidadeEstado?: string;
  prefeitoNome?: string;
  palacioNome?: string;
  salaSessoesNome?: string;
  artigoIndicacao?: string;
  artigoProjetoLei?: string;
  logoCabecalho?: string;
  marcaDagua?: string;
  enderecoRodape?: string;
  contatoRodape?: string;
}

function limparHtmlParaImpressao(html?: string): string {
  if (!html) return "";
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/white-space\s*:\s*nowrap\s*;?/gi, "")
    .replace(/width\s*:\s*[^;"]+;?/gi, "")
    .replace(/margin-left\s*:\s*[^;"]+;?/gi, "")
    .replace(/margin-right\s*:\s*[^;"]+;?/gi, "");
}

export default function DocumentoPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [docId, setDocId] = useState<string>("");
  const [doc, setDoc] = useState<DocumentoPdf | null>(null);
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((res) => setDocId(res.id));
  }, [params]);

 useEffect(() => {
    if (!docId) return;

    const carregarDadosPdf = async () => {
      try {
        const storedUser = localStorage.getItem("legisdocs_user");
        const token = localStorage.getItem("legisdocs_token");
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const apiEnv = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const resDoc = await fetch(`${apiEnv}/document/detalhe/${docId}`, { headers });
        if (resDoc.ok) {
          const docData = await resDoc.json();
          setDoc(docData);

          // Usa o tenantId do próprio documento (funciona inclusive para SUPER_ADMIN)
          const targetTenantId = docData.tenantId || parsedUser?.tenantId;
          if (targetTenantId) {
            const resTenant = await fetch(`${apiEnv}/tenant/${targetTenantId}`, { headers });
            if (resTenant.ok) {
              setTenant(await resTenant.json());
            }
          }
        }
      } catch (error) {
        console.error("Erro ao gerar visualização PDF:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDadosPdf();
  }, [docId]);

  useEffect(() => {
    if (!loading && doc) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, doc]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-600 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="font-semibold text-sm">Preparando documento oficial em PDF...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-700 gap-4 p-6">
        <FileText className="w-12 h-12 text-slate-400" />
        <p className="font-bold text-lg">Documento não encontrado.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold"
        >
          Voltar
        </button>
      </div>
    );
  }

  const tituloDocumento = doc.type.replace(/_/g, " ");
  const numeroFormatado =
    doc.protocolNum > 0
      ? `Nº ${String(doc.protocolNum).padStart(3, "0")}/${doc.year}`
      : `(Sem Numeração Oficial)`;
  const identificadorCompleto = `${tituloDocumento} ${numeroFormatado}`;

  const corpoArtigos = limparHtmlParaImpressao(doc.texto || doc.artigos || "");
  const corpoJustificativa = limparHtmlParaImpressao(doc.justificativa || "");
  const isProjetoOuEmenda = doc.type.includes("PROJETO") || doc.type.includes("EMENDA");

  const dataFormatada = new Date(doc.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const dataAssinaturaObj = new Date(doc.updatedAt || doc.createdAt);
  const dataHoraAssinatura = `${dataAssinaturaObj.toLocaleDateString("pt-BR")} às ${dataAssinaturaObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const estaAssinado =
    doc.status !== "RASCUNHO" && doc.status !== "AGUARDANDO_ASSINATURA";

  const codigoAutenticacao =
    doc.assinaturaHash ||
    doc.id.replace(/-/g, "").slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") ||
    "LEGIS-AUTH";

  // Extrai nome limpo e partido caso venha no formato "Nome - PARTIDO"
  const rawAutor =
    doc.gabinete?.vereadorName || doc.author?.name || doc.gabinete?.name || "Autoria Parlamentar";
  const partesAutor = rawAutor.split(" - ");
  const autorNome = partesAutor[0].trim();
  const partidoExtraido = doc.gabinete?.partido || (partesAutor[1] ? partesAutor[1].trim() : "");
  const assinaturaLinhaTitulo = partidoExtraido ? `${autorNome} - ${partidoExtraido}` : autorNome;

  const cidadeLimpa = tenant?.cidadeEstado?.split("-")[0]?.trim() || "";

  const fundamentacaoLegalProjeto =
    tenant?.artigoProjetoLei ||
    "art. 14, I, da LOM (Lei Orgânica Municipal) c/c art. 52, IV e art. 97, II, ambos do Regimento Interno desta Casa";

  const ementaMinuscula = doc.ementa
    ? doc.ementa.charAt(0).toLowerCase() + doc.ementa.slice(1)
    : "";

  // Bloco reutilizável: Local/Data centralizado + Selo de Assinatura Digital + Linha do Vereador
  const BlocoFechoEAssinatura = ({ espacoSuperior = "mt-10" }: { espacoSuperior?: string }) => (
    <div className={`${espacoSuperior} pt-2 break-inside-avoid`}>
      <div className="text-center text-sm leading-relaxed mb-7">
        <p>
          Sala das Sessões{tenant?.salaSessoesNome ? ` ${tenant.salaSessoesNome}` : ""},
        </p>
        {tenant?.palacioNome && (
          <p>
            Palácio {tenant.palacioNome},
          </p>
        )}
        <p>
          {cidadeLimpa || tenant?.cidadeEstado || ""}
          {cidadeLimpa || tenant?.cidadeEstado ? ", " : ""}
          {dataFormatada}.
        </p>
      </div>

      <div className="w-[275px] mx-auto text-center">
        {estaAssinado ? (
          <div className="mb-2 px-3 py-1.5 rounded-md border border-slate-300/90 bg-slate-50/75 text-left font-sans shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 pb-1 mb-1">
              <span className="flex items-center gap-1 text-[8.5px] font-extrabold uppercase tracking-wider text-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                Assinado Digitalmente
              </span>
              <span className="text-[8px] font-semibold text-slate-400">
                LegisDocs
              </span>
            </div>
            <p className="text-[9.5px] font-bold text-slate-800 leading-tight truncate">
              {autorNome}
            </p>
            <p className="text-[8px] text-slate-500 leading-tight mt-0.5">
              Data: {dataHoraAssinatura}
            </p>
            <p className="text-[7.5px] font-mono text-slate-400 leading-tight mt-0.5 tracking-tight">
              Cód: {codigoAutenticacao}
            </p>
          </div>
        ) : (
          <div className="h-8" />
        )}

        <div className="border-t border-slate-800 pt-1.5">
          <p className="font-bold text-sm uppercase leading-tight">{assinaturaLinhaTitulo}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {partidoExtraido ? `Vereador(a) - ${partidoExtraido}` : "Vereador(a) Proponente"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div lang="pt-BR" className="min-h-screen bg-slate-200 py-8 px-4 print:bg-white print:p-0 font-serif text-slate-900">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 18mm 20mm 18mm 25mm;
            }
            @media print {
              html, body {
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .folha-a4 {
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: auto !important;
                overflow: visible !important;
              }
              .marca-dagua-print {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 55% !important;
                max-width: 380px !important;
                opacity: 0.08 !important;
                z-index: 0 !important;
                pointer-events: none !important;
              }
              .quebra-pagina {
                break-after: page !important;
                page-break-after: always !important;
              }
            }

            /* Separador visual das páginas na prévia da tela */
            @media screen {
              .quebra-pagina td {
                border-bottom: 2px dashed #cbd5e1;
                padding-bottom: 2.5rem;
              }
              .inicio-nova-pagina td {
                padding-top: 2.5rem;
              }
            }

            .doc-html, .doc-html * {
              max-width: 100% !important;
              box-sizing: border-box !important;
              white-space: normal !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              word-break: normal !important;
            }
            .doc-html p, .doc-html div, .doc-html li {
              margin-bottom: 0.65rem;
              text-align: justify;
              line-height: 1.65;
              font-size: 12pt;
            }
            .doc-html p:last-child {
              text-align-last: left !important;
            }
            .doc-html ul, .doc-html ol {
              margin-left: 1.5rem;
              margin-bottom: 0.75rem;
            }
            .doc-html table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse;
              margin: 1rem 0;
            }
            .doc-html td, .doc-html th {
              border: 1px solid #334155;
              padding: 6px 8px;
              font-size: 10.5pt;
            }
          `,
        }}
      />

      {/* BARRA SUPERIOR DE AÇÃO (Oculta na impressão) */}
      <div className="no-print max-w-[210mm] mx-auto mb-5 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-lg flex items-center justify-between font-sans">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : window.close())}
          className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
          Visualização Oficial de Impressão / PDF
        </span>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors shadow"
        >
          <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* FOLHA TIMBRADA A4 */}
      <article className="folha-a4 relative max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl px-[22mm] py-[18mm] box-border overflow-hidden">
        
        {/* MARCA D'ÁGUA DE FUNDO */}
        {tenant?.marcaDagua && (
          <img
            src={tenant.marcaDagua}
            alt="Marca d'água"
            className="marca-dagua-print absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] max-w-[380px] opacity-[0.08] grayscale pointer-events-none select-none z-0"
          />
        )}

        <table className="relative z-10 w-full border-collapse">
          {/* CABEÇALHO INSTITUCIONAL (Repete automaticamente em todas as páginas) */}
          <thead>
            <tr>
              <th className="font-normal pb-6">
                <header className="flex flex-col items-center justify-center border-b-2 border-slate-800 pb-4 text-center">
                  {tenant?.logoCabecalho && (
                    <img
                      src={tenant.logoCabecalho}
                      alt="Brasão / Logo"
                      className="h-16 w-auto object-contain mb-2.5"
                    />
                  )}
                  <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-600 leading-tight">
                    {tenant?.estadoNome || "Estado do Rio Grande do Norte"}
                  </p>
                  <h1 className="text-base font-extrabold uppercase tracking-wide text-slate-900 mt-0.5 leading-tight">
                    {tenant?.name || (cidadeLimpa ? `Câmara Municipal de ${cidadeLimpa}` : "Câmara Municipal")}
                  </h1>
                </header>
              </th>
            </tr>
          </thead>

          {/* ================= FLUXO PARA PROJETO DE LEI / EMENDA (3 PÁGINAS) ================= */}
          {isProjetoOuEmenda ? (
            <>
              {/* PÁGINA 1: FOLHA DE APRESENTAÇÃO */}
              <tbody className="quebra-pagina">
                <tr>
                  <td className="align-top pt-2">
                    <h2 className="text-[15px] font-extrabold uppercase tracking-wide text-left mb-8">
                      {identificadorCompleto}
                    </h2>

                    {/* Ementa recuada à direita */}
                    {doc.ementa && (
                      <div className="flex justify-end mb-12">
                        <div className="w-[56%] text-[12pt] text-justify leading-relaxed text-slate-900">
                          {doc.ementa}
                        </div>
                      </div>
                    )}

                    {/* Texto de Apresentação Formal */}
                    <p className="text-[12pt] text-justify leading-[1.8] mb-12 indent-8">
                      Eu, <strong>{autorNome}</strong>, Vereador(a), apresento nos termos do{" "}
                      {fundamentacaoLegalProjeto}, proposição de{" "}
                      {tituloDocumento.toLowerCase()} que {ementaMinuscula}
                    </p>

                    <BlocoFechoEAssinatura espacoSuperior="mt-14" />
                  </td>
                </tr>
              </tbody>

              {/* PÁGINA 2: TEXTO DA LEI / ARTIGOS */}
              <tbody className={`${corpoJustificativa ? "quebra-pagina" : ""} inicio-nova-pagina`}>
                <tr>
                  <td className="align-top pt-2">
                    <div className="text-center mb-6">
                      <h2 className="text-[15px] font-extrabold uppercase tracking-wider underline decoration-slate-400 underline-offset-4">
                        {identificadorCompleto}
                      </h2>
                    </div>

                    {doc.ementa && (
                      <div className="flex justify-end mb-8">
                        <div className="w-[58%] text-xs italic text-justify leading-relaxed border-l-2 border-slate-300 pl-3 text-slate-800">
                          <strong>EMENTA:</strong> {doc.ementa}
                        </div>
                      </div>
                    )}

                    {corpoArtigos && (
                      <section className="mb-6 w-full">
                        <div
                          className="doc-html"
                          dangerouslySetInnerHTML={{ __html: corpoArtigos }}
                        />
                      </section>
                    )}

                    {/* Assinatura ao final dos artigos da lei */}
                    <BlocoFechoEAssinatura espacoSuperior="mt-10" />
                  </td>
                </tr>
              </tbody>

              {/* PÁGINA 3: JUSTIFICATIVA */}
              {corpoJustificativa && (
                <tbody className="inicio-nova-pagina">
                  <tr>
                    <td className="align-top pt-2">
                      <h2 className="text-[15px] font-extrabold uppercase tracking-wide text-left mb-3">
                        {identificadorCompleto}
                      </h2>

                      <h3 className="text-center font-bold uppercase tracking-wider text-sm border-b border-slate-300 pb-2 mb-6">
                        Justificativa
                      </h3>

                      <section className="mb-6 w-full">
                        <div
                          className="doc-html"
                          dangerouslySetInnerHTML={{ __html: corpoJustificativa }}
                        />
                      </section>

                      <BlocoFechoEAssinatura espacoSuperior="mt-10" />
                    </td>
                  </tr>
                </tbody>
              )}
            </>
          ) : (
            /* ================= FLUXO PADRÃO (INDICAÇÃO, REQUERIMENTO, OFÍCIO, MOÇÃO) ================= */
            <tbody>
              <tr>
                <td className="align-top pt-2">
                  <div className="text-center mb-7">
                    <h2 className="text-[15px] font-extrabold uppercase tracking-wider underline decoration-slate-400 underline-offset-4">
                      {identificadorCompleto}
                    </h2>
                    {doc.gabinete?.name && (
                      <p className="text-[11px] font-semibold text-slate-600 mt-1.5 uppercase">
                        Origem: {doc.gabinete.name}
                      </p>
                    )}
                  </div>

                  {(doc.type === "INDICACAO" || doc.type === "OFICIO") && doc.secretariaDestino && (
                    <div className="mb-6 text-sm leading-relaxed">
                      <p>Excelentíssimo(a) Senhor(a)</p>
                      {doc.nomeSecretario && <p className="font-bold">{doc.nomeSecretario}</p>}
                      <p className="font-semibold">{doc.secretariaDestino}</p>
                    </div>
                  )}

                  {doc.ementa && (
                    <div className="flex justify-end mb-8">
                      <div className="w-[62%] text-xs italic text-justify leading-relaxed border-l-2 border-slate-300 pl-3 text-slate-800">
                        <strong>EMENTA:</strong> {doc.ementa}
                      </div>
                    </div>
                  )}

                  {doc.motivo && (
                    <section className="mb-6 w-full">
                      <h3 className="font-bold uppercase text-xs tracking-wider text-slate-700 mb-2">
                        Do Pedido / Indicação:
                      </h3>
                      <p className="text-justify leading-relaxed whitespace-pre-line text-[12pt]">
                        {doc.motivo}
                      </p>
                    </section>
                  )}

                  {corpoJustificativa && (
                    <section className="mb-8 w-full">
                      <div
                        className="doc-html"
                        dangerouslySetInnerHTML={{ __html: corpoJustificativa }}
                      />
                    </section>
                  )}

                  <BlocoFechoEAssinatura espacoSuperior="mt-10" />
                </td>
              </tr>
            </tbody>
          )}

          {/* RODAPÉ OFICIAL (Repete automaticamente em todas as páginas) */}
          <tfoot>
            <tr>
              <td className="pt-8">
                <footer className="border-t-2 border-amber-500 pt-2 text-center font-sans">
                  {(tenant?.enderecoRodape || tenant?.contatoRodape) ? (
                    <>
                      {tenant?.enderecoRodape && (
                        <p className="text-[10px] font-bold text-amber-800 leading-tight">
                          {tenant.enderecoRodape}
                        </p>
                      )}
                      {tenant?.contatoRodape && (
                        <p className="text-[10px] font-semibold text-amber-700 leading-tight mt-0.5">
                          {tenant.contatoRodape}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Documento gerado eletronicamente via LegisDocs • Status: {doc.status.replace(/_/g, " ")}
                    </p>
                  )}
                </footer>
              </td>
            </tr>
          </tfoot>
        </table>
      </article>
    </div>
  );
}