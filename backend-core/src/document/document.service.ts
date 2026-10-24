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

    // 1. Descobre o último número de protocolo desta Câmara no ano atual PARA ESTE TIPO DE DOCUMENTO
    const lastDoc = await prisma.document.findFirst({
      where: { 
        tenantId: data.tenantId, 
        year: currentYear,
        type: data.type // <-- NOVA REGRA: A numeração agora é separada por tipo (Indicação, Ofício, etc.)
      },
      orderBy: { protocolNum: 'desc' },
    });

    // 2. Se já existir um documento deste tipo, soma 1. Se for o primeiro do ano, começa no 1.
    const nextProtocolNum = lastDoc ? lastDoc.protocolNum + 1 : 1;

    // 3. Grava o documento de forma definitiva
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

  // Lista todos os documentos de um gabinete específico
  async findByGabinete(gabineteId: string) {
    return await prisma.document.findMany({
      where: { gabineteId },
      orderBy: { createdAt: 'desc' }, 
      include: { 
        author: { select: { name: true, partido: true } } 
      }
    });
  }

  // Lista os documentos que aguardam análise da Secretaria
  async findFilaAnalise(tenantId: string) {
    return await prisma.document.findMany({
      where: { 
        tenantId,
        status: 'ENVIADO' 
      },
      orderBy: { createdAt: 'asc' }, 
      include: { 
        author: { select: { name: true, partido: true } },
        gabinete: { select: { name: true } }
      }
    });
  }

  // Busca os detalhes completos de um documento específico
  async findOne(id: string) {
    return await prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, role: true, partido: true } },
        gabinete: { select: { name: true } }
      }
    });
  }

  // Atualiza o status e adiciona o feedback da Secretaria (se houver)
  async updateStatus(id: string, status: DocumentStatus, feedbackSecretaria?: string) {
    return await prisma.document.update({
      where: { id },
      data: { 
        status,
        feedbackSecretaria: feedbackSecretaria || null
      },
    });
  }

  // Atualiza o conteúdo do documento (usado pelo Gabinete para editar rascunhos ou refazer documentos)
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
}