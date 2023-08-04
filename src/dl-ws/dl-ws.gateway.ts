import { MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Observable, from, map } from 'rxjs';

@WebSocketGateway()
export class DlWsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any, ...args: any[]) {
    console.log(`connected (${this.server.engine.clientsCount})`, client.id)
  }
}
