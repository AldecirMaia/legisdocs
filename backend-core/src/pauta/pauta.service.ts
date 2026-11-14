import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PautaService {
  constructor(private readonly prisma: PrismaService) {}

  async enviarPauta(data: any) {
    const { tenantId, nomeSessao, dataSessao, itens } = data;

    return this.prisma.$transaction(async (tx) => {
      const pautaSalva = await tx.sessaoPauta.create({
        data: { tenantId, nomeSessao, dataSessao, itens }
      });

      for (const item of itens) {
        let novaFase = item.faseAtual; 

        if (item.tramitacao === 'LEITURA') {
          novaFase = 'LEITURA_CONCLUIDA';
        } else if (item.tramitacao === 'VOTAÇÃO') {
          if (item.turnoVotacao === '1ª Votação') {
            novaFase = '1_VOTACAO_CONCLUIDA';
          } else if (item.turnoVotacao === '2ª Votação' || item.turnoVotacao === 'Votação Única') {
            novaFase = 'APROVADO_FINAL'; 
          }
        }

        if (item.id && novaFase) {
          await tx.document.update({
            where: { id: item.id },
            data: { faseAtual: novaFase }
          });
        }
      }

      return { success: true, message: 'Pauta travada e documentos tramitados com sucesso!', pauta: pautaSalva };
    });
  }

  async obterPautaAtiva(tenantId: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return this.prisma.sessaoPauta.findFirst({
      where: { tenantId, criadoEm: { gte: hoje } },
      orderBy: { criadoEm: 'desc' },
    });
  }
  async enviarPautaDiretoAta(data: any) {
    const { tenantId, nomeSessao, dataSessao, itens } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Salva a SessaoPauta com os resultados manuais embutidos no JSON `itens`
      const pautaSalva = await tx.sessaoPauta.create({
        data: {
          tenantId,
          nomeSessao,
          dataSessao,
          itens,
        },
      });

      // 2. Tramita os documentos conforme o resultado informado pela Secretaria
      for (const item of itens) {
        if (!item.id) continue;

        let novaFase: string | undefined;

        if (!item.teveVotacao || item.resultado === 'APENAS_LEITURA') {
          novaFase = 'LEITURA_CONCLUIDA';
        } else if (item.resultado === 'ADIADO') {
          // Mantém a fase atual para que o documento continue disponível para a próxima pauta
          novaFase = undefined;
        } else if (item.resultado === 'REPROVADO') {
          novaFase = 'REPROVADO';
        } else if (item.resultado === 'APROVADO') {
          if (item.turnoVotacao === '1ª Votação') {
            novaFase = '1_VOTACAO_CONCLUIDA';
          } else {
            // 2ª Votação, Votação Única ou requerimento/moção aprovada
            novaFase = 'APROVADO_FINAL';
          }
        }

        if (novaFase) {
          await tx.document.update({
            where: { id: item.id },
            data: { faseAtual: novaFase },
          });
        }
      }

      return {
        success: true,
        message: 'Deliberações registradas e enviadas para a Ata com sucesso!',
        pauta: pautaSalva,
      };
    });
  }
  async obterHistoricoPautas(tenantId: string) {
    return this.prisma.sessaoPauta.findMany({
      where: { tenantId },
      orderBy: { criadoEm: 'desc' },
      take: 10
    });
  }
}