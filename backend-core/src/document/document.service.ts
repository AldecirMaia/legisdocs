import { Injectable } from '@nestjs/common';
import { DocumentType, DocumentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste o caminho se necessário

@Injectable()
export class DocumentService {
  
  // 1. CORREÇÃO DE ARQUITETURA: Injetar o PrismaService em vez de usar "new PrismaClient()"
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    type: DocumentType;
    status: DocumentStatus;
    ementa: string;
    content?: string;
    texto?: string;
    motivo?: string;
    secretariaDestino?: string;
    nomeSecretario?: string;
    justificativa?: string;
    tenantId: string;
    gabineteId: string;
    authorId: string;
  }) {
    const currentYear = new Date().getFullYear();

    return await this.prisma.$transaction(async (tx) => {
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

      let nextProtocolNum = 1;
      for (const doc of allDocs) {
        if (doc.protocolNum === nextProtocolNum) {
          nextProtocolNum++;
        } else if (doc.protocolNum > nextProtocolNum) {
          break; 
        }
      }

      const author = await tx.user.findUnique({ where: { id: data.authorId } });
      let finalStatus = data.status;
      
      if (data.status !== 'RASCUNHO') {
        finalStatus = author?.role === 'VEREADOR' ? 'ENVIADO' : 'AGUARDANDO_ASSINATURA';
      }

      return await tx.document.create({
        data: {
          protocolNum: nextProtocolNum,
          year: currentYear,
          type: data.type,
          status: finalStatus, 
          ementa: data.ementa,
          content: data.content || '', 
          texto: data.texto || null,
          motivo: data.motivo,
          secretariaDestino: data.secretariaDestino,
          nomeSecretario: data.nomeSecretario,
          justificativa: data.justificativa,
          tenantId: data.tenantId,
          gabineteId: data.gabineteId,
          authorId: data.authorId,
          // faseAtual assumirá "NOVO" automaticamente através do @default no Prisma
        },
      });
    });
  }

  async createManual(data: {
    type: DocumentType;
    ementa: string;
    propositorManual?: string;
    tenantId: string;
    gabineteId: string;
    authorId: string;
  }) {
    const currentYear = new Date().getFullYear();

    return await this.prisma.$transaction(async (tx) => {
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

      return await tx.document.create({
        data: {
          protocolNum: nextProtocolNum,
          year: currentYear,
          type: data.type,
          status: 'APROVADO', 
          ementa: data.ementa,
          content: data.propositorManual ? `Autor (Lançamento Manual): ${data.propositorManual}` : '', 
          tenantId: data.tenantId,
          gabineteId: data.gabineteId,
          authorId: data.authorId,
        },
      });
    });
  }

  async findByGabinete(gabineteId: string) {
    return await this.prisma.document.findMany({
      where: { gabineteId },
      orderBy: { createdAt: 'desc' }, 
      include: { author: { select: { name: true, partido: true } } }
    });
  }

  async findFilaAnalise(tenantId: string) {
    return await this.prisma.document.findMany({
      where: { tenantId, status: 'ENVIADO' },
      orderBy: { createdAt: 'asc' }, 
      include: { 
        author: { select: { name: true, partido: true } },
        gabinete: { select: { name: true } }
      }
    });
  }

  // 2. CORREÇÃO DA ESTEIRA: O método que alimenta o painel de Pauta
  async findAprovados(tenantId: string) {
    return await this.prisma.document.findMany({
      where: { 
        tenantId, 
        status: 'APROVADO',
        // ESCONDE os documentos que já terminaram o fluxo na câmara
        faseAtual: {
          notIn: ['APROVADO_FINAL', 'ARQUIVADO', 'LEI_SANCIONADA']
        }
      },
      orderBy: [
        { type: 'asc' },
        { protocolNum: 'asc' }
      ],
      include: { 
        author: { select: { name: true, partido: true } },
        gabinete: { 
          // Retornamos os usuários do gabinete para o frontend conseguir achar o VEREADOR autor
          select: { 
            name: true,
            users: { select: { name: true, role: true } }
          } 
        }
      }
    });
  }

  async findOne(id: string) {
    return await this.prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, role: true, partido: true } },
        gabinete: { 
          select: { 
            name: true,
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

    if (status === 'CANCELADO') {
       updateData.protocolNum = -Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1000);
    }

    return await this.prisma.document.update({
      where: { id },
      data: updateData,
    });
  }

  async updateDocument(id: string, data: any) {
    return await this.prisma.document.update({
      where: { id },
      data: {
        ementa: data.ementa,
        motivo: data.motivo,
        texto: data.texto,
        justificativa: data.justificativa,
        secretariaDestino: data.secretariaDestino,
        nomeSecretario: data.nomeSecretario,
        status: data.status, 
      },
    });
  }

  async findAprovadosSecretaria(tenantId: string) {
    return await this.prisma.document.findMany({
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