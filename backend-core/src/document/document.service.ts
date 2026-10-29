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

    // 1. Pega todos os protocolos válidos
    const allDocs = await prisma.document.findMany({
      where: { 
        tenantId: data.tenantId, 
        year: currentYear,
        type: data.type,
        protocolNum: { gt: 0 } 
      },
      select: { protocolNum: true },
      orderBy: { protocolNum: 'asc' },
    });

    // 2. Preenche buracos
    let nextProtocolNum = 1;
    for (const doc of allDocs) {
      if (doc.protocolNum === nextProtocolNum) {
        nextProtocolNum++;
      } else if (doc.protocolNum > nextProtocolNum) {
        break; 
      }
    }

    // 3. Regra de Negócio Corrigida: Só aplica a trava se NÃO for Rascunho
    const author = await prisma.user.findUnique({ where: { id: data.authorId } });
    let finalStatus = data.status;
    
    if (data.status !== 'RASCUNHO') {
      finalStatus = author?.role === 'VEREADOR' ? 'ENVIADO' : 'AGUARDANDO_ASSINATURA';
    }

    return await prisma.document.create({
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
        { type: 'asc' }, // Agrupa por tipo (Indicações, Ofícios, etc)
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

    // 3. Quando a Secretaria CANCELA, o documento perde o seu número oficial (fica com um negativo aleatório para não dar erro na base de dados)
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
            name: true, // Conforme visto nos outros métodos do seu service, o campo correto na tabela é 'name' e não 'nome'
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}