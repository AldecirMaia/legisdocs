import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class ProtocolService {
  constructor(private prisma: PrismaService) {}

  async createDocument(data: {
    tenantId: string;
    authorId: string;
    type: DocumentType;
    ementa: string;
    content: string;
  }) {
    const currentYear = new Date().getFullYear();

    // 1. Busca o documento com o maior número de protocolo para este ano, tipo e câmara
    const lastDocument = await this.prisma.document.findFirst({
      where: {
        tenantId: data.tenantId,
        year: currentYear,
        type: data.type,
      },
      orderBy: {
        protocolNum: 'desc',
      },
    });

    // 2. Se existir, soma 1. Se não, é o primeiro do ano (número 1).
    const nextProtocolNum = lastDocument?.protocolNum ? lastDocument.protocolNum + 1 : 1;

    // 3. Salva no banco de dados
    const newDocument = await this.prisma.document.create({
      data: {
        tenantId: data.tenantId,
        authorId: data.authorId,
        type: data.type,
        year: currentYear,
        protocolNum: nextProtocolNum,
        ementa: data.ementa,
        content: data.content,
        status: 'RASCUNHO', // Entra como rascunho para revisão antes do protocolo oficial
      },
    });

    return newDocument;
  }

  async getDocumentsByTenant(tenantId: string) {
    return this.prisma.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}