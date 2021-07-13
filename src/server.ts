import type { IncomingMessage, Server } from "http";
import { connect } from "net";
import * as WebSocket from "ws";

/**
 * create a ws proxy server
 */
export class ProxyServer {
  private ws: WebSocket.Server;
  constructor(server: Server, port = 3000) {
    this.ws = new WebSocket.Server({
      server,
      port
    });
    this.ws.on("connection", this._onConnect);
  }
  private _onConnect(ws: WebSocket, req: IncomingMessage) {
    const proxyHost = req.headers?.["x-proxy-host"]?.[0];
    const proxyPort = req.headers?.["x-proxy-port"]?.[0];
    const source = WebSocket.createWebSocketStream(ws, { encoding: "binary" });
    const target = connect({ host: proxyHost, port: parseInt(proxyPort) });
    source.on("error", () => {
      target.destroy();
    });
    target.on("error", () => {
      source.destroy();
    });
    target.on("close", ws.close);
    target.on("connect", () => {
      source.pipe(target);
      target.pipe(source);
    });
  }
}
