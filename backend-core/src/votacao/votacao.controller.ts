import { Controller, Post, Body, Get, Param, Res } from '@nestjs/common';
import { PrismaClient, DocumentStatus } from '@prisma/client';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

@Controller('votacao')
export class VotacaoController {
  
  @Post('salvar')
  async salvarResultado(@Body() data: any) {
    const registro = await prisma.registroVotacao.create({
      data: {
        tenantId: data.tenantId,
        documentId: data.documentId,
        sim: data.sim,
        nao: data.nao,
        abstencao: data.abstencao,
        ausentes: data.ausentes,
        votos: data.votos,
      },
    });
    
    // --- LÓGICA DE REGRAS DE APROVAÇÃO E QUÓRUM ---
    const tipo = (data.tipoDocumento || '').toUpperCase();
    const totalVereadores = data.totalVereadores || 9;
    
    let aprovado = false;

    // REGRA 1: Maioria Qualificada (2/3)
    if (tipo.includes('EMENDA') || tipo.includes('VETO') || tipo.includes('CASSAÇÃO')) {
      const minVotos = Math.ceil(totalVereadores * (2 / 3));
      aprovado = data.sim >= minVotos;
    } 
    // REGRA 2: Maioria Absoluta
    else if (tipo.includes('COMPLEMENTAR')) {
      const minVotos = Math.floor(totalVereadores / 2) + 1;
      aprovado = data.sim >= minVotos;
    } 
    // REGRA 3: Maioria Simples
    else {
      aprovado = data.sim > data.nao;
    }

    await prisma.document.update({
      where: { id: data.documentId },
      data: { 
        status: aprovado ? DocumentStatus.APROVADO : DocumentStatus.CANCELADO 
      }
    });

    return { ...registro, statusFinal: aprovado ? 'APROVADO' : 'REJEITADO' };
  }

  // =========================================================================
  // 1. GERAR ATA NOVA OU REGERAR ATA ANTIGA EDITADA
  // =========================================================================
  @Post('ata/gerar')
  async gerarAtaDinamica(@Body() data: any, @Res() res: Response) {
    try {
      let pauta: any = null;

      // Se vier sessaoId, estamos editando/regerando uma ata específica do histórico
      if (data.sessaoId) {
        pauta = await prisma.sessaoPauta.findUnique({
          where: { id: data.sessaoId },
        });
      } else {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        pauta = await prisma.sessaoPauta.findFirst({
          where: { tenantId: data.tenantId, criadoEm: { gte: hoje } },
          orderBy: { criadoEm: 'desc' },
        });
      }

      if (!pauta) {
        res.status(404).send('Nenhuma pauta foi encontrada para gerar a Ata.');
        return;
      }

      // Persiste os parâmetros editados dentro da pauta (anexando no primeiro item ou metadata)
      // sem precisar rodar migration no Prisma agora
      const parametrosAta = {
        numeroSessao: data.numeroSessao || '',
        anoLegislativo: data.anoLegislativo || '',
        periodoLegislativo: data.periodoLegislativo || '',
        legislatura: data.legislatura || '',
        dataExtenso: data.dataExtenso || '',
        horarioInicio: data.horarioInicio || '',
        presidente: data.presidente || '',
        vereadorBiblia: data.vereadorBiblia || '',
        primeiroSecretario: data.primeiroSecretario || '',
        secretariaGeral: data.secretariaGeral || '',
        textoFechamento: data.textoFechamento || '',
      };

      const itensOriginais = Array.isArray(pauta.itens) ? pauta.itens : [];
      const itensAtualizados = itensOriginais.map((item: any, index: number) =>
        index === 0 ? { ...item, _parametrosAta: parametrosAta } : item
      );

      await prisma.sessaoPauta.update({
        where: { id: pauta.id },
        data: { itens: itensAtualizados },
      });

      const nomeSeguro = pauta.nomeSessao.replace(/[,;"]/g, '').replace(/\s+/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Ata_${nomeSeguro}.pdf"`);

      await this.compilarPdfAta(res, pauta, itensAtualizados, parametrosAta);
    } catch (error) {
      console.error('Erro ao gerar/regerar Ata:', error);
      if (!res.headersSent) {
        res.status(500).send('Erro interno ao gerar o PDF da Ata.');
      }
    }
  }

  // =========================================================================
  // 2. BUSCAR PARÂMETROS SALVOS DE UMA ATA DO HISTÓRICO (PARA EDIÇÃO)
  // =========================================================================
  @Get('ata/sessao/:pautaId/dados')
  async obterDadosAtaSessao(@Param('pautaId') pautaId: string) {
    const pauta = await prisma.sessaoPauta.findUnique({
      where: { id: pautaId },
    });

    if (!pauta) {
      return { parametrosAta: null };
    }

    const itens = Array.isArray(pauta.itens) ? (pauta.itens as any[]) : [];
    const parametrosSalvos = itens.find((i) => i?._parametrosAta)?._parametrosAta || null;

    return {
      id: pauta.id,
      nomeSessao: pauta.nomeSessao,
      dataSessao: pauta.dataSessao,
      parametrosAta: parametrosSalvos,
    };
  }

  // =========================================================================
  // 3. BAIXAR ATA DO HISTÓRICO "COMO ESTÁ"
  // =========================================================================
  @Get('ata/sessao/:pautaId')
  async gerarAtaPorId(@Param('pautaId') pautaId: string, @Res() res: Response) {
    try {
      const pauta = await prisma.sessaoPauta.findUnique({
        where: { id: pautaId },
      });

      if (!pauta) {
        return res.status(404).send('Sessão/Pauta não encontrada.');
      }

      const nomeSeguro = pauta.nomeSessao.replace(/[,;"]/g, '').replace(/\s+/g, '_');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Ata_${nomeSeguro}.pdf"`);

      const itensPauta = Array.isArray(pauta.itens) ? (pauta.itens as any[]) : [];
      const parametrosSalvos = itensPauta.find((i) => i?._parametrosAta)?._parametrosAta || null;

      await this.compilarPdfAta(res, pauta, itensPauta, parametrosSalvos);
    } catch (error) {
      console.error('Erro interno ao gerar o PDF da ata antiga:', error);
      if (!res.headersSent) {
        res.status(500).send('Erro no servidor ao tentar gerar o ficheiro.');
      }
    }
  }

  // =========================================================================
  // MÉTODO AUXILIAR: COMPILA O PDF COMPLETO OU SIMPLIFICADO
  // =========================================================================
  private async compilarPdfAta(
    res: Response,
    pauta: any,
    itensPauta: any[],
    params: any | null
  ) {
    const doc = new PDFDocument({ margin: 60 });
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('PODER LEGISLATIVO', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Câmara Municipal de Baraúna', { align: 'center' });
    doc.text('ESTADO DO RIO GRANDE DO NORTE', { align: 'center' });
    doc.moveDown(2);

    // Se houver parâmetros completos (gerados ou editados), usa o cabeçalho oficial completo
    if (params && (params.numeroSessao || params.dataExtenso || params.presidente)) {
      const dataExtUpper = (params.dataExtenso || pauta.dataSessao || '').toUpperCase();
      const titulo = `ATA DA ${params.numeroSessao || ''} SESSÃO ORDINÁRIA DA CÂMARA MUNICIPAL DE BARAÚNA, NO ${params.anoLegislativo || ''} ANO LEGISLATIVO, NO ${params.periodoLegislativo || ''} PERÍODO LEGISLATIVO, DA ${params.legislatura || ''} LEGISLATURA, AO ${dataExtUpper}.`;
      doc.fontSize(11).font('Helvetica-Bold').text(titulo, { align: 'center', lineGap: 3 });
      doc.moveDown(2);

      const intro = `Ao ${params.dataExtenso || pauta.dataSessao}, a partir das ${params.horarioInicio || '09:00 horas'}, no Palácio Manoel Alves Bezerra. O senhor presidente ${params.presidente || '___'}, no uso de suas atribuições legais, saúda a todos os presentes. Conforme a Lei Orgânica do Município e de acordo com o Regimento Interno desta Egrégia Casa Legislativa, sob a proteção de Deus abriu a sessão e deu início aos trabalhos legislativos. Em seguida de acordo com o regimento interno convidou o senhor vereador ${params.vereadorBiblia || '___'}, para trazer uma mensagem bíblica. Ainda em conformidade com o Regimento Interno, o Senhor Primeiro Secretário da mesa diretora, ${params.primeiroSecretario || '___'}, fez a chamada dos vereadores e leu a ordem do dia da seguinte forma:`;
      doc.fontSize(11).font('Helvetica').text(intro, { align: 'justify', lineGap: 4 });
      doc.moveDown(2);
    } else {
      // Fallback caso seja uma ata antiga baixada "como está" sem nunca ter passado pelo formulário
      const titulo = `ATA DA ${pauta.nomeSessao.toUpperCase()}`;
      doc.fontSize(11).font('Helvetica-Bold').text(titulo, { align: 'center', lineGap: 3 });
      doc.moveDown(2);
    }

    const expediente = itensPauta.filter((i) => i.tramitacao === 'LEITURA');
    const ordemDia = itensPauta.filter((i) => i.tramitacao === 'VOTAÇÃO');

    if (expediente.length > 0) {
      doc.font('Helvetica-Bold').fontSize(11).text('LEITURA DO EXPEDIENTE', { align: 'center' });
      doc.moveDown(1);
      for (const item of expediente) {
        doc.font('Helvetica-Bold').fontSize(10).text(`${item.type} Nº ${item.numero}. Propositor: ${item.propositor}`, { align: 'justify' });
        doc.font('Helvetica').fontSize(10).text(`Resumo: ${item.ementa}`, { align: 'justify' });
        if (item.observacaoAta) {
          doc.font('Helvetica-Oblique').fontSize(9).text(`-> Observação: ${item.observacaoAta}`, { align: 'justify' });
        }
        doc.moveDown(1);
      }
    }

    if (ordemDia.length > 0) {
      doc.font('Helvetica-Bold').fontSize(11).text('ORDEM DO DIA (VOTAÇÕES)', { align: 'center' });
      doc.moveDown(1);
      for (const item of ordemDia) {
        doc.font('Helvetica-Bold').fontSize(10).text(`${item.type} Nº ${item.numero}. Propositor: ${item.propositor} (${item.turnoVotacao || 'Votação Única'})`, { align: 'justify' });
        doc.font('Helvetica').fontSize(10).text(`Resumo: ${item.ementa}`, { align: 'justify' });

        // 1º Verifica se houve votação ao vivo gravada na tabela RegistroVotacao
        const votacaoRealizada = await prisma.registroVotacao.findFirst({
          where: { documentId: item.id, tenantId: pauta.tenantId },
          orderBy: { criadoEm: 'desc' },
        });

        if (votacaoRealizada) {
          const aprovado = votacaoRealizada.sim > votacaoRealizada.nao;
          const statusTexto = aprovado ? 'APROVADA' : 'REJEITADA';
          doc.font('Helvetica-Oblique').fontSize(9).text(
            `-> ${statusTexto} com ${votacaoRealizada.sim} votos Sim, ${votacaoRealizada.nao} votos Não e ${votacaoRealizada.abstencao} Abstenções.`,
            { align: 'justify' }
          );
        } 
        // 2º Caso contrário, verifica se veio do lançamento manual para Ata (sem sessão ao vivo)
        else if (item.teveVotacao) {
          const favor = Array.isArray(item.votosFavor) ? item.votosFavor : [];
          const contra = Array.isArray(item.votosContra) ? item.votosContra : [];
          const abst = Array.isArray(item.abstencoes) ? item.abstencoes : [];

          let linhaResultado = `-> ${item.resultado || 'APROVADO'} com ${favor.length} votos Sim, ${contra.length} votos Não e ${abst.length} Abstenções.`;
          if (favor.length > 0) linhaResultado += ` A favor: ${favor.join(', ')}.`;
          if (contra.length > 0) linhaResultado += ` Contra: ${contra.join(', ')}.`;
          if (item.observacaoAta) linhaResultado += ` Obs.: ${item.observacaoAta}.`;

          doc.font('Helvetica-Oblique').fontSize(9).text(linhaResultado, { align: 'justify' });
        } 
        // 3º Não votada
        else {
          doc.font('Helvetica-Oblique').fontSize(9).text('-> Matéria não foi posta em escrutínio nesta sessão.', { align: 'justify' });
        }

        doc.moveDown(1);
      }
    }

    if (params && (params.textoFechamento || params.secretariaGeral || params.presidente)) {
      doc.moveDown(2);
      const fechamento = `${params.textoFechamento || ''} eu, ${params.secretariaGeral || '___'}, secretária geral do legislativo, lavrei a presente ata que segue assinada por mim e o senhor presidente.`;
      doc.font('Helvetica').fontSize(11).text(fechamento, { align: 'justify', lineGap: 4 });

      doc.moveDown(6);
      doc.text('____________________________________________________', { align: 'center' });
      doc.font('Helvetica-Bold').text(params.secretariaGeral || 'Secretária Geral', { align: 'center' });
      doc.font('Helvetica').fontSize(9).text('Secretária Geral do Legislativo', { align: 'center' });

      doc.moveDown(4);
      doc.text('____________________________________________________', { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(11).text(params.presidente || 'Presidente', { align: 'center' });
      doc.font('Helvetica').fontSize(9).text('Presidente da Câmara', { align: 'center' });
    } else {
      doc.moveDown(4);
      doc.text('____________________________________________________', { align: 'center' });
      doc.font('Helvetica-Bold').text('Secretária Geral do Legislativo', { align: 'center' });
    }

    doc.end();
  }
}