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
      const resDoc = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/document/detalhe/${id}`);
      const dataDoc = await resDoc.json();
      setDoc(dataDoc);

      const resTenant = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/${dataDoc.tenantId}`);
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

  // Regra de Negócio: Assinatura é sempre do Titular do Gabinete
  const vereadorTitular = doc.gabinete?.users?.[0];
  const nomeAssinatura = vereadorTitular?.name || doc.author?.name;
  const partidoAssinatura = vereadorTitular?.partido || doc.author?.partido;

  return (
    <div className="min-h-screen bg-gray-200 py-8 flex flex-col items-center print:py-0 print:p-0 print:m-0 print:bg-white print:block">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            margin: 0; 
            size: A4;
          }
          body { 
            margin: 0; 
            padding: 0; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white; 
          }
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
        .html-content table { width: 100% !important; table-layout: fixed; border-collapse: collapse; margin-bottom: 1rem; }
        .html-content table, .html-content th, .html-content td { border: 1px solid black; overflow: hidden; word-break: break-word; }
        .html-content th, .html-content td { padding: 4px 6px; text-align: left; font-size: 11px; }
        .html-content th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
        .html-content p { margin-bottom: 0.5rem; width: 100%; text-indent: 2.5rem; text-align: justify; }
      `}} />

      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center no-print">
        <button onClick={() => router.back()} className="bg-gray-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-800">
          ← Voltar
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white relative shadow-2xl print:shadow-none print:w-full print:max-w-none print:h-auto print:m-0 font-serif text-[12px] leading-relaxed text-black block box-border">
        
        {tenant?.marcaDagua && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10 watermark-print">
            <img src={tenant.marcaDagua} alt="Marca de água" className="w-[65%] object-contain" />
          </div>
        )}

        <div className="px-[15mm] py-[15mm] print:px-[10mm] print:py-[10mm] relative z-10 box-border">
          
          <div className="flex items-center justify-between mb-4">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              {tenant?.logoCabecalho && (
                <img src={tenant.logoCabecalho} alt="Logo da Câmara" className="max-w-full max-h-full object-contain" />
              )}
            </div>
            <div className="flex-1 text-center font-bold flex flex-col justify-center">
              <span className="text-[15px] uppercase tracking-wide">Poder Legislativo</span>
              <span className="text-[18px] uppercase tracking-wider my-1">Câmara Municipal de {nomeCidade}</span>
              <span className="text-[13px] uppercase tracking-wide">Estado do Rio Grande do Norte</span>
            </div>
            <div className="w-24 flex-shrink-0"></div>
          </div>

          {(() => {
            switch (doc.type) {
              case "OFICIO":
                return (
                  <div className="text-[12px]">
                    <h1 className="text-right font-bold mb-3">
                      OFÍCIO n. {String(doc.protocolNum).padStart(3, '0')}/{doc.year}-Gab/{doc.author?.name?.toUpperCase()}
                    </h1>
                    <p className="text-right mb-6">{tenant?.cidadeEstado}, {dataFormatada}.</p>
                    <p className="font-bold uppercase">AO. ILMº. SRº.</p>
                    <p className="font-bold uppercase">{doc.nomeSecretario}</p>
                    <p className="font-medium mb-4">{doc.secretariaDestino}</p>
                    <p className="font-bold mb-4">Assunto: {doc.ementa}</p>
                    <div className="text-justify leading-relaxed mb-8 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              case "MOCAO":
                return (
                  <div className="text-[12px]">
                    <h1 className="text-center font-bold text-[18px] mb-6 uppercase tracking-wide underline">MOÇÃO DE APLAUSOS/REPÚDIO</h1>
                    <div className="text-justify leading-relaxed mb-8 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              case "PARECER":
                return (
                  <div className="text-[12px]">
                    <h1 className="text-left font-bold text-[15px] mb-2 uppercase">PARECER Nº {String(doc.protocolNum).padStart(3, '0')}/{doc.year}-CFO</h1>
                    <p className="font-bold text-justify mb-2">Referência: “{doc.ementa}”</p>
                    <p className="font-bold mb-6">Relator: {doc.author?.name}</p>
                    <div className="text-justify leading-relaxed mb-8 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              case "PROJETO_LEI":
              case "EMENDA_ADITIVA":
              case "EMENDA_IMPOSITIVA":
                return (
                  <div className="text-[12px]">
                    <h1 className="text-center font-bold text-[17px] mb-4 uppercase tracking-wide">
                      {doc.type === "PROJETO_LEI" ? `PROJETO DE LEI Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : 
                       doc.type === "EMENDA_ADITIVA" ? `EMENDA PARLAMENTAR ADITIVA Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}` : 
                       `EMENDA IMPOSITIVA Nº ${String(doc.protocolNum).padStart(3, '0')}/${doc.year}`}
                    </h1>
                    <div className="ml-auto w-1/2 text-justify text-[13px] font-bold mb-6 italic"><p>{doc.ementa}</p></div>
                    <div className="text-justify leading-relaxed mb-8 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || "" }}></div>
                  </div>
                );

              default: 
                return (
                  <div className="text-[12px]">
                    <h1 className="text-center font-bold text-[17px] mb-4 uppercase tracking-wide">
                      INDICAÇÃO Nº {doc.protocolNum > 0 ? String(doc.protocolNum).padStart(3, '0') : "S/N"}/{doc.year}
                    </h1>
                    <div className="ml-auto w-1/2 text-justify text-[13px] mb-4">
                      <p>
                        Indico à Exmª. Srª. Prefeita Municipal, <strong>{tenant?.prefeitoNome}</strong>, que encaminhe ao(à) <strong>{doc.secretariaDestino}</strong>, titular <strong>{doc.nomeSecretario}</strong>, {doc.ementa}
                      </p>
                    </div>
                    <p className="text-justify indent-10 mb-4">
                      Apresento a Vossas Excelências, nos termos do {tenant?.artigoIndicacao?.replace(/^nos termos do\s*/i, '')}, a presente indicação, que após lida em Plenário seja encaminhada à Exmª. Srª. Prefeita Municipal, <strong>{tenant?.prefeitoNome}</strong>, para que encaminhe ao(à) <strong>{doc.secretariaDestino}</strong>, titular <strong>{doc.nomeSecretario}</strong>, {doc.ementa}
                    </p>
                    <h2 className="text-center font-bold text-[15px] mb-2 uppercase tracking-wider mt-6">JUSTIFICATIVA</h2>
                    <div className="text-justify leading-relaxed mb-6 html-content" dangerouslySetInnerHTML={{ __html: doc.justificativa || doc.motivo || "" }}></div>
                  </div>
                );
            }
          })()}

          <div className="mt-6 break-inside-avoid">
            {doc.type !== "OFICIO" && (
              <>
                <p className="text-[13px] text-gray-800 mb-1">Palácio: {tenant?.palacioNome}</p>
                <p className="text-[13px] text-gray-800 mb-4">Sala das Sessões: {tenant?.salaSessoesNome}</p>
              </>
            )}

            {doc.type !== "OFICIO" && (
              <p className="text-right font-medium mb-8">
                {tenant?.cidadeEstado}, {dataFormatada}.
              </p>
            )}

            {/* Lógica Híbrida de Assinatura Eletrónica */}
            {(doc.status === "ENVIADO" || doc.status === "APROVADO") ? (
              <div className="mt-4 flex flex-col items-center justify-center border-[1.5px] border-blue-900 rounded py-2 px-4 w-64 mx-auto bg-blue-50 text-blue-900 break-inside-avoid print:border-black print:text-black print:bg-white">
                <p className="text-[9px] uppercase font-bold tracking-widest">Assinatura Eletrónica</p>
                <p className="font-bold text-[12px] uppercase mt-1">{nomeAssinatura}</p>
                <p className="text-[9px] font-semibold">
                  {doc.type === "PARECER" ? "VEREADOR(A) RELATOR(A)" : `VEREADOR(A) ${partidoAssinatura ? `- ${partidoAssinatura}` : ""}`}
                </p>
                <p className="text-[7px] mt-1 font-medium italic">
                  Autenticado digitalmente via sistema.
                </p>
              </div>
            ) : (
              <div className="text-center flex flex-col items-center mt-8 break-inside-avoid">
                <div className="w-64 border-t border-black pt-2 mb-1">
                  <p className="font-bold uppercase tracking-wider text-[13px]">{nomeAssinatura}</p>
                </div>
                <p className="text-[12px] uppercase font-semibold">
                  {doc.type === "PARECER" ? "VEREADOR(A) RELATOR(A)" : `VEREADOR(A) ${partidoAssinatura ? `- ${partidoAssinatura}` : ""}`}
                </p>
              </div>
            )}
          </div>

          <div className="w-full border-t-[1.5px] border-black pt-2 mt-6 text-center break-inside-avoid">
            <p className="font-bold text-[13px] uppercase">Palácio {tenant?.palacioNome}</p>
            <p className="text-[11px] text-gray-800">{tenant?.enderecoRodape || "Morada não configurada nas definições da Secretaria"}</p>
            <p className="text-[11px] text-gray-800">{tenant?.contatoRodape || "Contactos não configurados nas definições da Secretaria"}</p>
          </div>

        </div>
      </div>
    </div>
  );
}