import { Injectable } from '@nestjs/common';
import { PrismaClient, DocumentType, DocumentStatus } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class DocumentService {
  
  async create(data: {
    type: DocumentType;
    status: DocumentStatus;
    ementa: string;
    content?: string;
    motivo?: string;
    secretariaDestino?: string;
    nomeSecretario?: string;
    justificativa?: string;
    tenantId: string;
    gabineteId: string;
    authorId: string;
  }) {
    const currentYear = new Date().getFullYear();

    // Utilizamos $transaction para evitar "race conditions" (números duplicados se 2 pessoas salvarem ao mesmo tempo)
    return await prisma.$transaction(async (tx) => {
      // 1. Pega apenas protocolos válidos (maiores que 0) daquele TIPO, ANO e TENANT
      const allDocs = await tx.document.findMany({
        where: { 
          tenantId: data.tenantId, 
          year: currentYear,
          type: data.type, 
          protocolNum: { gt: 0 } 
        },
        select: { protocolNum: true },
        orderBy: { protocolNum: 'asc' },
      });

      // 2. Lógica Reforçada: Descobrir o próximo número disponível
      // Como a query já filtrou protocolNum > 0 e ordenou, podemos varrer de forma limpa.
      let nextProtocolNum = 1;
      for (const doc of allDocs) {
        if (doc.protocolNum === nextProtocolNum) {
          nextProtocolNum++;
        } else if (doc.protocolNum > nextProtocolNum) {
          // Achou um buraco, o nextProtocolNum atual é a vaga livre.
          break; 
        }
      }

      // 3. Regra de Negócio: Só aplica a trava de envio se NÃO for Rascunho
      const author = await tx.user.findUnique({ where: { id: data.authorId } });
      let finalStatus = data.status;
      
      if (data.status !== 'RASCUNHO') {
        finalStatus = author?.role === 'VEREADOR' ? 'ENVIADO' : 'AGUARDANDO_ASSINATURA';
      }

      // 4. Cria o documento com o número correto calculado
      return await tx.document.create({
        data: {
          protocolNum: nextProtocolNum,
          year: currentYear,
          type: data.type,
          status: finalStatus, 
          ementa: data.ementa,
          content: data.content || '', 
          motivo: data.motivo,
          secretariaDestino: data.secretariaDestino,
          nomeSecretario: data.nomeSecretario,
          justificativa: data.justificativa,
          tenantId: data.tenantId,
          gabineteId: data.gabineteId,
          authorId: data.authorId,
        },
      });
    });
  }
// NOVO: Função para inserir documentos manuais direto na Pauta
  async createManual(data: {
    type: DocumentType;
    ementa: string;
    propositorManual?: string;
    tenantId: string;
    gabineteId: string;
    authorId: string;
  }) {
    const currentYear = new Date().getFullYear();

    return await prisma.$transaction(async (tx) => {
      // 1. Calcula o próximo número ignorando os negativos (cancelados)
      const allDocs = await tx.document.findMany({
        where: { tenantId: data.tenantId, year: currentYear, type: data.type, protocolNum: { gt: 0 } },
        select: { protocolNum: true },
        orderBy: { protocolNum: 'asc' },
      });

      let nextProtocolNum = 1;
      for (const doc of allDocs) {
        if (doc.protocolNum === nextProtocolNum) {
          nextProtocolNum++;
        } else if (doc.protocolNum > nextProtocolNum) {
          break; 
        }
      }

      // 2. Grava permanentemente na base de dados com status APROVADO
      return await tx.document.create({
        data: {
          protocolNum: nextProtocolNum,
          year: currentYear,
          type: data.type,
          status: 'APROVADO', 
          ementa: data.ementa,
          // Guardamos o nome do propositor manual no campo content para histórico
          content: data.propositorManual ? `Autor (Lançamento Manual): ${data.propositorManual}` : '', 
          tenantId: data.tenantId,
          gabineteId: data.gabineteId,
          authorId: data.authorId,
        },
      });
    });
  }
  async findByGabinete(gabineteId: string) {
    return await prisma.document.findMany({
      where: { gabineteId },
      orderBy: { createdAt: 'desc' }, 
      include: { author: { select: { name: true, partido: true } } }
    });
  }

  async findFilaAnalise(tenantId: string) {
    return await prisma.document.findMany({
      where: { tenantId, status: 'ENVIADO' },
      orderBy: { createdAt: 'asc' }, 
      include: { 
        author: { select: { name: true, partido: true } },
        gabinete: { select: { name: true } }
      }
    });
  }

  async findAprovados(tenantId: string) {
    return await prisma.document.findMany({
      where: { 
        tenantId, 
        status: 'APROVADO' 
      },
      orderBy: [
        { type: 'asc' }, // Agrupa por tipo (Indicações, Projetos do Executivo, etc)
        { protocolNum: 'asc' } // Ordena pelo número
      ],
      include: { 
        author: { select: { name: true, partido: true } },
        gabinete: { select: { name: true } }
      }
    });
  }

  async findOne(id: string) {
    return await prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, role: true, partido: true } },
        gabinete: { 
          select: { 
            name: true,
            // Esta inclusão é obrigatória para a assinatura do PDF funcionar
            users: {
              where: { role: 'VEREADOR' },
              select: { name: true, partido: true }
            }
          } 
        }
      }
    });
  }

  async updateStatus(id: string, status: DocumentStatus, feedbackSecretaria?: string) {
    const updateData: any = { 
      status, 
      feedbackSecretaria: feedbackSecretaria || null 
    };

    // Quando a Secretaria CANCELA, o documento perde o seu número oficial 
    if (status === 'CANCELADO') {
       updateData.protocolNum = -Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1000);
    }

    return await prisma.document.update({
      where: { id },
      data: updateData,
    });
  }

  async updateDocument(id: string, data: any) {
    return await prisma.document.update({
      where: { id },
      data: {
        ementa: data.ementa,
        motivo: data.motivo,
        justificativa: data.justificativa,
        secretariaDestino: data.secretariaDestino,
        nomeSecretario: data.nomeSecretario,
        status: data.status, 
      },
    });
  }

  async findAprovadosSecretaria(tenantId: string) {
    return await prisma.document.findMany({
      where: {
        tenantId,
        status: 'APROVADO',
      },
      include: {
        gabinete: {
          select: {
            name: true, 
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}