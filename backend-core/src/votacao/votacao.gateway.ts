import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class VotacaoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Estados em memória por Câmara (tenantId)
  private sessoesAtivas = new Map<string, any>();
  private estadoSessaoGlobal = new Map<string, string>();
  
  // NOVO: Guarda o estado da chamada e quem já marcou presença
  private chamadasAtivas = new Map<string, { ativa: boolean, presencas: string[] }>();

  handleConnection(client: Socket) {
    console.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('entrarSala')
  handleEntrarSala(@MessageBody() data: { tenantId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.tenantId);
    
    // 1. Envia a Votação Atual (se houver)
    const sessaoAtual = this.sessoesAtivas.get(data.tenantId);
    if (sessaoAtual) {
      client.emit('statusVotacao', sessaoAtual);
    }

    // 2. Envia o Estado Global
    const estadoGlobal = this.estadoSessaoGlobal.get(data.tenantId) || 'SUSPENSA';
    client.emit('estadoSessaoAtualizado', estadoGlobal);

    // 3. NOVO: Se a chamada estiver ativa, envia para o vereador atrasado
    const chamada = this.chamadasAtivas.get(data.tenantId);
    if (chamada && chamada.ativa) {
      client.emit('chamadaAberta', chamada);
    }
  }

  @SubscribeMessage('abrirVotacao')
  handleAbrirVotacao(@MessageBody() data: { tenantId: string; documento: any }) {
    const novaSessao = {
      documento: data.documento,
      status: 'ABERTA',
      votos: {}, 
    };
    this.sessoesAtivas.set(data.tenantId, novaSessao);
    this.server.to(data.tenantId).emit('votacaoAberta', novaSessao);
  }

  @SubscribeMessage('registrarVoto')
  handleRegistrarVoto(@MessageBody() data: { tenantId: string; vereadorId: string; voto: 'SIM' | 'NAO' | 'ABSTENCAO' }) {
    const sessao = this.sessoesAtivas.get(data.tenantId);
    if (sessao && sessao.status === 'ABERTA') {
      sessao.votos[data.vereadorId] = data.voto;
      this.sessoesAtivas.set(data.tenantId, sessao);
      this.server.to(data.tenantId).emit('votoAtualizado', {
        vereadorId: data.vereadorId,
        voto: data.voto,
        totalVotos: sessao.votos
      });
    }
  }

  @SubscribeMessage('encerrarVotacao')
  handleEncerrarVotacao(@MessageBody() data: { tenantId: string }) {
    const sessao = this.sessoesAtivas.get(data.tenantId);
    if (sessao) {
      sessao.status = 'ENCERRADA';
      this.server.to(data.tenantId).emit('votacaoEncerrada', sessao);
      this.sessoesAtivas.delete(data.tenantId);
    }
  }

  @SubscribeMessage('atualizarEstadoSessao')
  handleAtualizarEstadoSessao(@MessageBody() data: { tenantId: string; estado: 'SUSPENSA' | 'EM_ANDAMENTO' | 'ENCERRADA' }) {
    this.estadoSessaoGlobal.set(data.tenantId, data.estado);
    this.server.to(data.tenantId).emit('estadoSessaoAtualizado', data.estado);
  }

  @SubscribeMessage('syncCronometro')
  handleSyncCronometro(@MessageBody() data: any) {
    this.server.to(data.tenantId).emit('syncCronometro', data);
  }

  @SubscribeMessage('alertaCronometro')
  handleAlertaCronometro(@MessageBody() data: any) {
    this.server.to(data.tenantId).emit('alertaCronometro', data);
  }

  // ==== ATUALIZAÇÕES DA CHAMADA DE PRESENÇA ====
  
  @SubscribeMessage('abrirChamada')
  handleAbrirChamada(@MessageBody() data: any) {
    // Regista a chamada como ativa e zera as presenças
    const novaChamada = { ativa: true, presencas: [] };
    this.chamadasAtivas.set(data.tenantId, novaChamada);
    this.server.to(data.tenantId).emit('chamadaAberta', novaChamada);
  }

  @SubscribeMessage('confirmarPresenca')
  handleConfirmarPresenca(@MessageBody() data: any) {
    // Guarda na memória que este vereador já confirmou
    const chamada = this.chamadasAtivas.get(data.tenantId);
    if (chamada && chamada.ativa) {
      if (!chamada.presencas.includes(data.vereadorId)) {
        chamada.presencas.push(data.vereadorId);
      }
    }
    this.server.to(data.tenantId).emit('presencaConfirmada', data);
  }
}