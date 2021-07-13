import debug from "debug";
import type { IncomingMessage } from "http";
import { connect } from "net";
import * as WebSocket from "ws";

const log = debug("ws-server");

/**
 * create a ws proxy server
 */
export class ProxyServer {
  private ws: WebSocket.Server;
  constructor(options: WebSocket.ServerOptions) {
    this.ws = new WebSocket.Server(options);
    this.ws.on("headers", (ws, req) => {});
    this.ws.on("listening", (wss) => {});
    this.ws.on("connection", this._onConnect.bind(this));
    this.ws.on("error", (err) => {
      log("ws server start up error: %s", err);
    });
  }
  private _onConnect(ws: WebSocket, req: IncomingMessage) {
    const proxyHost = req.headers?.["x-proxy-host"] as string;
    const proxyPort = req.headers?.["x-proxy-port"] as string;
    const _log = (format: string, ...args: any[]) => log(`proxy to [%s] ${format}`, proxyHost, ...args);
    const source = WebSocket.createWebSocketStream(ws);
    const target = connect({ host: proxyHost, port: parseInt(proxyPort, 10) });
    source.on("error", (err) => {
      _log("source error: %s", err);
      target.destroy();
    });
    source.on("close", () => {
      _log("source closed");
    });
    source.on("end", () => {
      _log("source end");
    });
    target.on("error", (err) => {
      _log("target error: %s", err);
      source.destroy();
    });
    target.on("end", () => {
      _log("target end");
    });
    target.on("close", () => {
      _log("target closed");
    });
    target.on("connect", () => {
      _log("target connect");
      source.pipe(target);
      target.pipe(source);
    });
  }
}
