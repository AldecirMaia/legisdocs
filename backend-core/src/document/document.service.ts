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

    // 1. Pega todos os protocolos válidos (maiores que 0) deste ano e tipo
    const allDocs = await prisma.document.findMany({
      where: { 
        tenantId: data.tenantId, 
        year: currentYear,
        type: data.type,
        protocolNum: { gt: 0 } // Ignora os documentos cancelados
      },
      select: { protocolNum: true },
      orderBy: { protocolNum: 'asc' },
    });

    // 2. Lógica para preencher buracos (Gaps) deixados por cancelamentos
    let nextProtocolNum = 1;
    for (const doc of allDocs) {
      if (doc.protocolNum === nextProtocolNum) {
        nextProtocolNum++;
      } else if (doc.protocolNum > nextProtocolNum) {
        break; // Achámos um buraco! O número 'nextProtocolNum' está livre.
      }
    }

    return await prisma.document.create({
      data: {
        protocolNum: nextProtocolNum,
        year: currentYear,
        type: data.type,
        status: data.status,
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
        gabinete: { select: { name: true } }
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