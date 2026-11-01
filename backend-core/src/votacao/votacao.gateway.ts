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
    origin: '*', // Permite que o frontend Next.js se conecte sem erros de CORS
  },
})
export class VotacaoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Estado em memória das votações ativas por Câmara (tenantId)
  // Ex: { 'tenant-123': { documento: {...}, votos: { 'vereador-1': 'SIM' } } }
  private sessoesAtivas = new Map<string, any>();

  handleConnection(client: Socket) {
    console.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Cliente desconectado: ${client.id}`);
  }

  // 1. Cliente (Vereador, Telão ou Secretaria) entra na sala da sua Câmara
  @SubscribeMessage('entrarSala')
  handleEntrarSala(@MessageBody() data: { tenantId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.tenantId);
    
    // Se a página do Telão for atualizada (F5) enquanto ocorre uma votação, ele recebe o estado atual
    const sessaoAtual = this.sessoesAtivas.get(data.tenantId);
    if (sessaoAtual) {
      client.emit('statusVotacao', sessaoAtual);
    }
  }

  // 2. Secretaria inicia a votação de um documento da Pauta
  @SubscribeMessage('abrirVotacao')
  handleAbrirVotacao(@MessageBody() data: { tenantId: string; documento: any }) {
    const novaSessao = {
      documento: data.documento,
      status: 'ABERTA',
      votos: {}, // Objeto para guardar { vereadorId: 'SIM' | 'NAO' | 'ABSTENCAO' }
    };
    this.sessoesAtivas.set(data.tenantId, novaSessao);

    // Avisa todos na Câmara (Telão e Vereadores) que podem começar a votar
    this.server.to(data.tenantId).emit('votacaoAberta', novaSessao);
  }

  // 3. Vereador clica no tablet para votar
  @SubscribeMessage('registrarVoto')
  handleRegistrarVoto(@MessageBody() data: { tenantId: string; vereadorId: string; voto: 'SIM' | 'NAO' | 'ABSTENCAO' }) {
    const sessao = this.sessoesAtivas.get(data.tenantId);
    
    if (sessao && sessao.status === 'ABERTA') {
      // Regista ou altera o voto do vereador (evita votos duplos somados)
      sessao.votos[data.vereadorId] = data.voto;
      this.sessoesAtivas.set(data.tenantId, sessao);

      // Transmite a atualização imediata para animar a grelha no Telão
      this.server.to(data.tenantId).emit('votoAtualizado', {
        vereadorId: data.vereadorId,
        voto: data.voto,
        totalVotos: sessao.votos
      });
    }
  }

  // 4. Secretaria encerra a votação e revela o resultado final
  @SubscribeMessage('encerrarVotacao')
  handleEncerrarVotacao(@MessageBody() data: { tenantId: string }) {
    const sessao = this.sessoesAtivas.get(data.tenantId);
    if (sessao) {
      sessao.status = 'ENCERRADA';
      
      // Manda o sinal de bloqueio de ecrã para os vereadores e o gráfico final para o telão
      this.server.to(data.tenantId).emit('votacaoEncerrada', sessao);
      
      // Limpa a memória para o próximo documento
      this.sessoesAtivas.delete(data.tenantId);
    }
  }
}