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
            cargo: m.cargo, // PRESIDENCIA, RELATORIA, etc.
          }))
        }
      },
      include: { membros: { include: { user: true } } }
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
      }
    });
  }

  // 3. KANBAN: Lista todos os projetos tramitando nas comissões (Os "Cards")
  async listarKanban(tenantId: string) {
    return prisma.tramitacaoComissao.findMany({
      where: { comissao: { tenantId } },
      include: {
        document: { select: { type: true, protocolNum: true, year: true, ementa: true } },
        comissao: { select: { sigla: true, nome: true } },
        relator: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  // 4. KANBAN: Envia um projeto para a comissão (Cria o Card na coluna "Aguardando Despacho")
  async despachar(data: any) {
    // Calcula o prazo legal (Ex: 15 dias para emitir parecer)
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + 15);

    return prisma.tramitacaoComissao.create({
      data: {
        documentId: data.documentId,
        comissaoId: data.comissaoId,
        prazoDias: data.prazoDias || 15,
        status: StatusTramitacao.AGUARDANDO_DESPACHO,
        prazoVencimento: prazo
      },
      include: { document: true, comissao: true }
    });
  }

  // 5. KANBAN: Atualiza o Card (Arrastar de coluna, designar relator, dar parecer)
  async atualizarTramitacao(id: string, data: any) {
    return prisma.tramitacaoComissao.update({
      where: { id },
      data: {
        status: data.status,
        relatorId: data.relatorId,
        resultado: data.resultado,
        parecerFinal: data.parecerFinal
      },
      include: { relator: { select: { name: true } } }
    });
  }
  async atualizarComissao(id: string, data: any) {
    // Atualiza os dados básicos (Nome e Sigla)
    const comissao = await prisma.comissao.update({
      where: { id },
      data: {
        nome: data.nome,
        sigla: data.sigla,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    // Se vieram membros na edição, deleta os antigos e recria os novos (Evita duplicidade)
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

  // 7. GESTÃO: Excluir Comissão
  async excluirComissao(id: string) {
    return prisma.comissao.delete({
      where: { id },
    });
  }
  // 8. KANBAN: Presidente designa relator e move para EM_ANALISE
  async designarRelator(tramitacaoId: string, relatorId: string) {
    return prisma.tramitacaoComissao.update({
      where: { id: tramitacaoId },
      data: { 
        relatorId, 
        status: 'EM_ANALISE' 
      }
    });
  }

  // 9. KANBAN: Relator emite o parecer e move para AGUARDANDO_VOTACAO
  async emitirParecer(tramitacaoId: string, data: any) {
    return prisma.tramitacaoComissao.update({
      where: { id: tramitacaoId },
      data: {
        resultado: data.resultado, // Ex: FAVORÁVEL, CONTRÁRIO
        parecerFinal: data.parecerFinal,
        status: 'AGUARDANDO_VOTACAO'
      }
    });
  }

  // 10. KANBAN: Membro assina o parecer
  async assinarParecer(tramitacaoId: string, vereadorId: string, data: any) {
    // 1. Cria a assinatura
    const assinatura = await prisma.assinaturaParecer.create({
      data: {
        tramitacaoId,
        vereadorId,
        tipoVoto: data.tipoVoto, // ACOMPANHA_RELATOR, DIVERGE_RELATOR, ABSTENCAO
        justificativa: data.justificativa || null
      }
    });

    // 2. Busca todos os membros da comissão para saber o total
    const tramitacao = await prisma.tramitacaoComissao.findUnique({
      where: { id: tramitacaoId },
      include: { 
        comissao: { include: { membros: true } },
        assinaturas: true
      }
    });

    if (tramitacao) {
      const totalMembros = tramitacao.comissao.membros.length;
      const totalAssinaturas = tramitacao.assinaturas.length;

      // 3. Regra de Negócio Automática: Se a maioria absoluta já assinou, conclui o trâmite!
      const maioria = Math.floor(totalMembros / 2) + 1;
      if (totalAssinaturas >= maioria) {
        await prisma.tramitacaoComissao.update({
          where: { id: tramitacaoId },
          data: { status: 'CONCLUIDO' }
        });
      }
    }

    return assinatura;
  }
}

  