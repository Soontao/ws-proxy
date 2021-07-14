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
    this.ws.on("listening", () => {
      const port = this.ws.address()?.["port"];
      log("proxy ready on port: %s", port);
    });
    this.ws.on("connection", this._onConnect.bind(this));
    this.ws.on("error", (err) => {
      log("ws server start up error: %s", err);
    });
  }

  /**
   * stop the server
   * @returns
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
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
      target.destroy();
    });
    target.on("error", (err) => {
      _log("target error: %s", err);
      source.destroy();
    });
    target.on("end", () => {
      _log("target end");
      source.destroy();
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
