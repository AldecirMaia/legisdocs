import { Injectable } from '@nestjs/common';
import { PrismaClient, StatusTramitacao } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ComissaoService {
  
  // 1. Cria a comissão e já vincula os vereadores e seus cargos
  async criarComissao(data: any) {
    return prisma.comissao.create({
      data: {
        nome: data.nome,
        sigla: data.sigla,
        tenantId: data.tenantId,
        membros: {
          create: data.membros.map((m: any) => ({
            userId: m.userId,
            cargo: m.cargo,
          })),
        },
      },
      include: { membros: { include: { user: true } } },
    });
  }

  // 2. Lista as comissões de uma Câmara
  async listarComissoes(tenantId: string) {
    return prisma.comissao.findMany({
      where: { tenantId },
      include: { 
        membros: { 
          include: { user: { select: { id: true, name: true } } } 
        } 
      },
    });
  }

  // 3. KANBAN: Lista todos os projetos tramitando nas comissões (Os "Cards")
  async listarKanban(tenantId: string) {
    return prisma.tramitacaoComissao.findMany({
      where: { comissao: { tenantId } },
      include: {
        document: true, // Traz id, fileUrl, content, ementa, type, protocolNum, year completos
        comissao: { select: { sigla: true, nome: true } },
        relator: { select: { id: true, name: true } },
        assinaturas: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // 4. KANBAN: Envia um projeto para a comissão (Cria o Card na coluna "Aguardando Despacho")
  async despachar(data: any) {
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + (Number(data.prazoDias) || 15));

    return prisma.tramitacaoComissao.create({
      data: {
        documentId: data.documentId,
        comissaoId: data.comissaoId,
        prazoDias: Number(data.prazoDias) || 15,
        status: StatusTramitacao.AGUARDANDO_DESPACHO,
        prazoVencimento: prazo,
      },
      include: { document: true, comissao: true },
    });
  }

  // 5. Atualiza status, comissão de destino, prazo ou relator do card
  async atualizarTramitacao(id: string, data: any) {
    return prisma.tramitacaoComissao.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.comissaoId !== undefined ? { comissaoId: data.comissaoId } : {}),
        ...(data.prazoDias !== undefined ? { prazoDias: Number(data.prazoDias) } : {}),
        ...(data.relatorId !== undefined ? { relatorId: data.relatorId } : {}),
      },
    });
  }

  // 6. Exclui o trâmite do card na comissão
  async excluirTramitacao(id: string) {
    await prisma.assinaturaParecer.deleteMany({
      where: { tramitacaoId: id },
    }).catch(() => {});

    return prisma.tramitacaoComissao.delete({
      where: { id },
    });
  }

  // 7. Atualiza dados da comissão
  async atualizarComissao(id: string, data: any) {
    const comissao = await prisma.comissao.update({
      where: { id },
      data: {
        nome: data.nome,
        sigla: data.sigla,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    if (data.membros) {
      await prisma.comissaoMembro.deleteMany({ where: { comissaoId: id } });
      
      if (data.membros.length > 0) {
        await prisma.comissaoMembro.createMany({
          data: data.membros.map((m: any) => ({
            comissaoId: id,
            userId: m.userId,
            cargo: m.cargo,
          })),
        });
      }
    }

    return comissao;
  }

  // 8. GESTÃO: Excluir Comissão
  async excluirComissao(id: string) {
    return prisma.comissao.delete({
      where: { id },
    });
  }

  // 9. KANBAN: Presidente designa relator e move para EM_ANALISE
  async designarRelator(tramitacaoId: string, relatorId: string) {
    return prisma.tramitacaoComissao.update({
      where: { id: tramitacaoId },
      data: { 
        relatorId, 
        status: 'EM_ANALISE',
      },
    });
  }

  // 10. KANBAN: Relator emite o parecer e move para AGUARDANDO_VOTACAO
  async emitirParecer(tramitacaoId: string, data: any) {
    return prisma.tramitacaoComissao.update({
      where: { id: tramitacaoId },
      data: {
        resultado: data.resultado,
        parecerFinal: data.parecerFinal,
        status: 'AGUARDANDO_VOTACAO',
      },
    });
  }

  // 11. KANBAN: Membro assina o parecer
  async assinarParecer(tramitacaoId: string, vereadorId: string, data: any) {
    const assinatura = await prisma.assinaturaParecer.create({
      data: {
        tramitacaoId,
        vereadorId,
        tipoVoto: data.tipoVoto,
        justificativa: data.justificativa || null,
      },
    });

    const tramitacao = await prisma.tramitacaoComissao.findUnique({
      where: { id: tramitacaoId },
      include: { 
        comissao: { include: { membros: true } },
        assinaturas: true,
      },
    });

    if (tramitacao) {
      const totalMembros = tramitacao.comissao.membros.length;
      const totalAssinaturas = tramitacao.assinaturas.length;

      const maioria = Math.floor(totalMembros / 2) + 1;
      if (totalAssinaturas >= maioria) {
        await prisma.tramitacaoComissao.update({
          where: { id: tramitacaoId },
          data: { status: 'CONCLUIDO' },
        });
      }
    }

    return assinatura;
  }
}