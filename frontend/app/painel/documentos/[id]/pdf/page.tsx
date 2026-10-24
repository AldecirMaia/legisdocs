"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function DocumentoPDF({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [docId, setDocId] = useState<string>("");
  const [doc, setDoc] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((res) => setDocId(res.id));
  }, [params]);

  useEffect(() => {
    if (docId) carregarDados(docId);
  }, [docId]);

  const carregarDados = async (id: string) => {
    try {
      const resDoc = await fetch(`http://localhost:4000/document/detalhe/${id}`);
      const dataDoc = await resDoc.json();
      setDoc(dataDoc);

      const resTenant = await fetch(`http://localhost:4000/tenant/${dataDoc.tenantId}`);
      const dataTenant = await resTenant.json();
      setTenant(dataTenant);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !doc) return <div className="p-10 text-center font-sans">A gerar documento oficial...</div>;

  const dataFormatada = new Date(doc.createdAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nomeCidade = tenant?.cidadeEstado ? tenant.cidadeEstado.split('-')[0] : "Baraúna";

  return (
    <div className="min-h-screen bg-gray-200 py-8 flex flex-col items-center print:p-0 print:bg-white">
      
      {/* CSS Global para Impressão e Repetição de Assinatura/Rodapé por Página */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            margin: 15mm; 
            size: A4;
            @bottom-left {
              content: "Palácio ${tenant?.palacioNome || ''} | Visto/Assinatura: ___________________________";
              font-family: serif;
              font-size: 10px;
            }
            @bottom-right {
              content: "Pág. " counter(page) " de " counter(pages);
              font-family: serif;
              font-size: 10px;
            }
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          
          .watermark-print {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 65% !important;
          }
        }

        .html-content { width: 100%; max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; }
        .html-content table { width: 100% !important; table-layout: fixed; border-collapse: collapse; margin-bottom: 1.5rem; }
        .html-content table, .html-content th, .html-content td { border: 1px solid black; overflow: hidden; word-break: break-word; }
        .html-content th, .html-content td { padding: 6px 8px; text-align: left; font-size: 12px; }
        .html-content th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
        .html-content p { margin-bottom: 0.75rem; width: 100%; }
      `}} />

      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center no-print">
        <button onClick={() => router.back()} className="bg-gray-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-800">
          ← Voltar
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white relative shadow-2xl print:shadow-none print:w-full print:h-auto font-serif text-[15px] leading-relaxed text-black block">
        
        {tenant?.marcaDagua && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10 watermark-print">
            <img src={tenant.marcaDagua} alt="Marca de água" className="w-[65%] object-contain" />
          </div>
        )}

        <div className="px-[15mm] py-[15mm] relative z-10">
          
          {/* CABEÇALHO DIVIDIDO */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              {tenant?.logoCabecalho && (
                <img src={tenant.logoCabecalho} alt="Logo da Câmara" className="max-w-full max-h-full object-contain" />
              )}
            </div>
            <div className="flex-1 text-center font-bold flex flex-col justify-center">
              <span className="text-[16px] uppercase tracking-wide">Poder Legislativo</span>
              <span className="text-[19px] uppercase tracking-wider my-1">Câmara Municipal de {nomeCidade}</span>
              <span className="text-[14px] uppercase tracking-wide">Estado do Rio Grande do Norte</span>
            </div>
            <div className="w-24 flex-shrink-0"></div>
          </div>

          {/* RENDERIZAÇÃO DINÂMICA DO CORPO */}
          {(() => {
            switch (doc.type) {
              case "OFICIO":
                return (
                  <div className="text-[15px]">
                    <h1 className="text-right font-bold mb-4">
                      OFÍCIO n. {String(doc.protocolNum).padStart(3, '0')}/{doc.year}-Gab/{doc.author?.name?.toUpperCase()}
                    </h1>
                    <p className="text-right mb-8">{tenant?.cidadeEstado}, {dataFormatada}.</p>
                    <p className="font-bold uppercase">AO. ILMº. SRº.</p>
                    <p className="font-bold uppercase">{doc.nomeSecretario}</p>
                    <p className="font-medium mb-6">{doc.secretariaDestino}</p>
                    <p className="font-bold mb-6">Assunto: {doc.ementa}</p>
                    <div className="text-justify leading-relaxed mb-12 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              case "MOCAO":
                return (
                  <div className="text-[15px]">
                    <h1 className="text-center font-bold text-[20px] mb-8 uppercase tracking-wide underline">MOÇÃO DE APLAUSOS/REPÚDIO</h1>
                    <div className="text-justify leading-relaxed mb-12 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              case "PARECER":
                return (
                  <div className="text-[15px]">
                    <h1 className="text-left font-bold text-[16px] mb-2 uppercase">PARECER Nº {String(doc.protocolNum).padStart(3, '0')}/{doc.year}-CFO</h1>
                    <p className="font-bold text-justify mb-2">Referência: “{doc.ementa}”</p>
                    <p className="font-bold mb-8">Relator: {doc.author?.name}</p>
                    <div className="text-justify leading-relaxed mb-12 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              case "PROJETO_LEI":
              case "EMENDA_ADITIVA":
              case "EMENDA_IMPOSITIVA":
                return (
                  <div className="text-[15px]">
                    <h1 className="text-center font-bold text-[18px] mb-6 uppercase tracking-wide">
                      {doc.type === "PROJETO_LEI" ? `PROJETO DE LEI Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : 
                       doc.type === "EMENDA_ADITIVA" ? `EMENDA PARLAMENTAR ADITIVA Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : 
                       `EMENDA IMPOSITIVA Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}`}
                    </h1>
                    <div className="ml-auto w-1/2 text-justify text-[14px] font-bold mb-8 italic"><p>{doc.ementa}</p></div>
                    <div className="text-justify leading-relaxed mb-10 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              default: 
                return (
                  <div className="text-[15px]">
                    <h1 className="text-center font-bold text-[18px] mb-6 uppercase tracking-wide">INDICAÇÃO Nº {doc.protocolNum}/{doc.year}</h1>
                    <div className="ml-auto w-1/2 text-justify text-[14px] mb-6">
                      <p>Indico à Exmª. Srª. Prefeita Municipal, <strong>{tenant?.prefeitoNome}</strong>, que encaminhe ao Sec. Mun. de <strong>{doc.secretariaDestino}</strong>, <strong>{doc.nomeSecretario}</strong>, {doc.ementa}</p>
                    </div>
                    <p className="text-justify indent-8 mb-6">
                      Apresento a Vossas Excelências, nos termos do {tenant?.artigoIndicacao}, a presente indicação, que após lida em Plenário seja encaminhada Exmª. Srª. Prefeita Municipal, <strong>{tenant?.prefeitoNome}</strong>, que encaminhe ao Sec. Mun. de <strong>{doc.secretariaDestino}</strong>, <strong>{doc.nomeSecretario}</strong>, {doc.ementa}
                    </p>
                    <h2 className="text-center font-bold text-[16px] mb-3 uppercase tracking-wider">JUSTIFICATIVA</h2>
                    <div className="text-justify leading-relaxed mb-10 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || doc.motivo || "" }}></div>
                  </div>
                );
            }
          })()}

          {/* ASSINATURA PRINCIPAL (Última Página) */}
          <div className="mt-8 break-inside-avoid">
            {doc.type !== "OFICIO" && (
              <>
                <p className="text-[14px] text-gray-800 mb-1">Palácio: {tenant?.palacioNome}</p>
                <p className="text-[14px] text-gray-800 mb-6">Sala das Sessões: {tenant?.salaSessoesNome}</p>
              </>
            )}

            {doc.type !== "OFICIO" && (
              <p className="text-right font-medium mb-12">
                {tenant?.cidadeEstado}, {dataFormatada}.
              </p>
            )}

            <div className="text-center flex flex-col items-center mt-10">
              <div className="w-72 border-t border-black pt-2 mb-1">
                <p className="font-bold uppercase tracking-wider">{doc.author?.name}</p>
              </div>
              <p className="text-sm uppercase font-semibold">
                {doc.type === "PARECER" ? "VEREADOR(A) RELATOR(A)" : `VEREADOR(A) ${doc.author?.partido ? `- ${doc.author.partido}` : ""}`}
              </p>
            </div>
          </div>

          {/* RODAPÉ EDITÁVEL DO TENANT */}
          <div className="w-full border-t-[1.5px] border-black pt-2 mt-10 text-center break-inside-avoid">
            <p className="font-bold text-sm uppercase">Palácio {tenant?.palacioNome}</p>
            <p className="text-xs text-gray-800">{tenant?.enderecoRodape || "Rua do Horto Florestal, 506 Centro, Baraúna-RN // CEP: 59.695-000"}</p>
            <p className="text-xs text-gray-800">{tenant?.contatoRodape || "http://barauna.rn.leg.br/ // cmb.barauna@gmail.com"}</p>
          </div>

        </div>
      </div>
    </div>
  );
}