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
    const totalVereadores = data.totalVereadores || 9; // Fallback caso não seja enviado
    
    let aprovado = false;

    // REGRA 1: Maioria Qualificada (2/3) - Ex: Emendas à Lei Orgânica, Cassação, Veto
    if (tipo.includes('EMENDA') || tipo.includes('VETO') || tipo.includes('CASSAÇÃO')) {
      const minVotos = Math.ceil(totalVereadores * (2 / 3));
      aprovado = data.sim >= minVotos;
    } 
    // REGRA 2: Maioria Absoluta - Ex: Lei Complementar (mais da metade de TODOS os membros)
    else if (tipo.includes('COMPLEMENTAR')) {
      const minVotos = Math.floor(totalVereadores / 2) + 1;
      aprovado = data.sim >= minVotos;
    } 
    // REGRA 3: Maioria Simples - Ex: Projetos de Lei Ordinária, Requerimentos, Indicações
    else {
      // Maioria simples exige apenas que os "SIM" sejam maiores que os "NÃO" entre os presentes
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

 @Post('ata/gerar')
  async gerarAtaDinamica(@Body() data: any, @Res() res: Response) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pauta = await prisma.sessaoPauta.findFirst({
      where: { tenantId: data.tenantId, criadoEm: { gte: hoje } },
      orderBy: { criadoEm: 'desc' }
    });

    if (!pauta) {
      res.status(404).send('Nenhuma pauta foi enviada para o plenário nesta data.');
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ata_Sessao.pdf`);

    const doc = new PDFDocument({ margin: 60 });
    doc.pipe(res);

    doc.fontSize(14).font('Helvetica-Bold').text('PODER LEGISLATIVO', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Câmara Municipal de Baraúna', { align: 'center' });
    doc.text('ESTADO DO RIO GRANDE DO NORTE', { align: 'center' });
    doc.moveDown(2);
    
    const titulo = `ATA DA ${data.numeroSessao} SESSÃO ORDINÁRIA DA CÂMARA MUNICIPAL DE BARAÚNA, NO ${data.anoLegislativo} ANO LEGISLATIVO, NO ${data.periodoLegislativo} PERÍODO LEGISLATIVO, DA ${data.legislatura} LEGISLATURA, AO ${data.dataExtenso.toUpperCase()}.`;
    doc.fontSize(11).font('Helvetica-Bold').text(titulo, { align: 'center', lineGap: 3 });
    doc.moveDown(2);

    const intro = `Ao ${data.dataExtenso}, a partir das ${data.horarioInicio}, no Palácio Manoel Alves Bezerra. O senhor presidente ${data.presidente}, no uso de suas atribuições legais, saúda a todos os presentes. Conforme a Lei Orgânica do Município e de acordo com o Regimento Interno desta Egrégia Casa Legislativa, sob a proteção de Deus abriu a sessão e deu início aos trabalhos legislativos. Em seguida de acordo com o regimento interno convidou o senhor vereador ${data.vereadorBiblia}, para trazer uma mensagem bíblica. Ainda em conformidade com o Regimento Interno, o Senhor Primeiro Secretário da mesa diretora, ${data.primeiroSecretario}, fez a chamada dos vereadores e leu a ordem do dia da seguinte forma:`;
    doc.fontSize(11).font('Helvetica').text(intro, { align: 'justify', lineGap: 4 });
    doc.moveDown(2);

    const itensPauta = pauta.itens as any[];
    const expediente = itensPauta.filter(i => i.tramitacao === 'LEITURA');
    const ordemDia = itensPauta.filter(i => i.tramitacao === 'VOTAÇÃO');

    if (expediente.length > 0) {
      doc.font('Helvetica-Bold').fontSize(11).text('LEITURA DO EXPEDIENTE', { align: 'center' });
      doc.moveDown(1);
      for (const item of expediente) {
        doc.font('Helvetica-Bold').fontSize(10).text(`${item.type} Nº ${item.numero}. Propositor: ${item.propositor}`, { align: 'justify' });
        doc.font('Helvetica').fontSize(10).text(`Resumo: ${item.ementa}`, { align: 'justify' });
        doc.moveDown(1);
      }
    }

    if (ordemDia.length > 0) {
      doc.font('Helvetica-Bold').fontSize(11).text('ORDEM DO DIA (VOTAÇÕES)', { align: 'center' });
      doc.moveDown(1);
      for (const item of ordemDia) {
        doc.font('Helvetica-Bold').fontSize(10).text(`${item.type} Nº ${item.numero}. Propositor: ${item.propositor} (${item.turnoVotacao || 'Votação Única'})`, { align: 'justify' });
        doc.font('Helvetica').fontSize(10).text(`Resumo: ${item.ementa}`, { align: 'justify' });
        
        // Verifica se a matéria foi votada e grava o resultado
        const votacaoRealizada = await prisma.registroVotacao.findFirst({
          where: { documentId: item.id, tenantId: data.tenantId },
          orderBy: { criadoEm: 'desc' }
        });

        if (votacaoRealizada) {
          const aprovado = votacaoRealizada.sim > votacaoRealizada.nao;
          const statusTexto = aprovado ? 'APROVADA' : 'REJEITADA';
          doc.font('Helvetica-Oblique').fontSize(9).text(`-> ${statusTexto} com ${votacaoRealizada.sim} votos Sim, ${votacaoRealizada.nao} votos Não e ${votacaoRealizada.abstencao} Abstenções.`, { align: 'justify' });
        } else {
          doc.font('Helvetica-Oblique').fontSize(9).text('-> Matéria não foi posta em escrutínio nesta sessão.', { align: 'justify' });
        }
        doc.moveDown(1);
      }
    }

    doc.moveDown(2);
    const fechamento = `${data.textoFechamento} eu, ${data.secretariaGeral}, secretária geral do legislativo, lavrei a presente ata que segue assinada por mim e o senhor presidente.`;
    doc.font('Helvetica').fontSize(11).text(fechamento, { align: 'justify', lineGap: 4 });

    doc.moveDown(6);
    doc.text('____________________________________________________', { align: 'center' });
    doc.font('Helvetica-Bold').text(data.secretariaGeral, { align: 'center' });
    doc.font('Helvetica').fontSize(9).text('Secretária Geral do Legislativo', { align: 'center' });
    
    doc.moveDown(4);
    doc.text('____________________________________________________', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).text(data.presidente, { align: 'center' });
    doc.font('Helvetica').fontSize(9).text('Presidente da Câmara', { align: 'center' });

    doc.end();
  }
  @Get('ata/sessao/:pautaId')
  async gerarAtaPorId(@Param('pautaId') pautaId: string, @Res() res: Response) {
    try {
      const pauta = await prisma.sessaoPauta.findUnique({
        where: { id: pautaId }
      });

      if (!pauta) {
        return res.status(404).send('Sessão/Pauta não encontrada.');
      }

      // Correção: Limpar caracteres especiais (vírgulas, ponto e vírgula, aspas) do nome do ficheiro
      const nomeSeguro = pauta.nomeSessao.replace(/[,;"]/g, '').replace(/\s+/g, '_');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Ata_${nomeSeguro}.pdf"`);

      const doc = new PDFDocument({ margin: 60 });
      doc.pipe(res);

      doc.fontSize(14).font('Helvetica-Bold').text('PODER LEGISLATIVO', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Câmara Municipal de Baraúna', { align: 'center' });
      doc.text('ESTADO DO RIO GRANDE DO NORTE', { align: 'center' });
      doc.moveDown(2);
      
      const titulo = `ATA DA ${pauta.nomeSessao.toUpperCase()}`;
      doc.fontSize(11).font('Helvetica-Bold').text(titulo, { align: 'center', lineGap: 3 });
      doc.moveDown(2);

      const itensPauta = pauta.itens as any[];
      const expediente = itensPauta.filter(i => i.tramitacao === 'LEITURA');
      const ordemDia = itensPauta.filter(i => i.tramitacao === 'VOTAÇÃO');

      if (expediente.length > 0) {
        doc.font('Helvetica-Bold').fontSize(11).text('LEITURA DO EXPEDIENTE', { align: 'center' });
        doc.moveDown(1);
        for (const item of expediente) {
          doc.font('Helvetica-Bold').fontSize(10).text(`${item.type} Nº ${item.numero}. Propositor: ${item.propositor}`, { align: 'justify' });
          doc.font('Helvetica').fontSize(10).text(`Resumo: ${item.ementa}`, { align: 'justify' });
          doc.moveDown(1);
        }
      }

      if (ordemDia.length > 0) {
        doc.font('Helvetica-Bold').fontSize(11).text('ORDEM DO DIA (VOTAÇÕES)', { align: 'center' });
        doc.moveDown(1);
        for (const item of ordemDia) {
          doc.font('Helvetica-Bold').fontSize(10).text(`${item.type} Nº ${item.numero}. Propositor: ${item.propositor} (${item.turnoVotacao || 'Votação Única'})`, { align: 'justify' });
          doc.font('Helvetica').fontSize(10).text(`Resumo: ${item.ementa}`, { align: 'justify' });
          
          const votacaoRealizada = await prisma.registroVotacao.findFirst({
            where: { documentId: item.id, tenantId: pauta.tenantId },
            orderBy: { criadoEm: 'desc' }
          });

          if (votacaoRealizada) {
            const aprovado = votacaoRealizada.sim > votacaoRealizada.nao;
            const statusTexto = aprovado ? 'APROVADA' : 'REJEITADA';
            doc.font('Helvetica-Oblique').fontSize(9).text(`-> ${statusTexto} com ${votacaoRealizada.sim} votos Sim, ${votacaoRealizada.nao} votos Não e ${votacaoRealizada.abstencao} Abstenções.`, { align: 'justify' });
          } else {
            doc.font('Helvetica-Oblique').fontSize(9).text('-> Matéria não foi posta em escrutínio nesta sessão.', { align: 'justify' });
          }
          doc.moveDown(1);
        }
      }

      doc.moveDown(4);
      doc.text('____________________________________________________', { align: 'center' });
      doc.font('Helvetica-Bold').text('Secretária Geral do Legislativo', { align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Erro interno ao gerar o PDF da ata antiga:", error);
      if (!res.headersSent) {
        res.status(500).send("Erro no servidor ao tentar gerar o ficheiro.");
      }
    }
  }
}