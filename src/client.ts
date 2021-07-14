// license: MIT
// repo: https://github.com/TooTallNate/proxy
// with customize logic
import assert from "assert";
import debug from "debug";
import http, { IncomingMessage } from "http";
import net from "net";
import { ServerResponse } from "node:http";
import { RequestOptions } from "node:https";
import WebSocket from "ws";

const log = debug("ws-client");

export class ProxyAgent extends http.Agent {
  private _wsServerAddr: string;

  constructor(wsServerAddr: string) {
    super();
    this._wsServerAddr = wsServerAddr;
  }
  createConnection(opts: RequestOptions, cb: Function) {
    const ws = new WebSocket(this._wsServerAddr, {
      headers: {
        "x-proxy-host": opts.host,
        "x-proxy-port": opts.port || 80
      }
    });
    const stream = WebSocket.createWebSocketStream(ws);

    ws.on("open", () => {
      cb(null, stream);
    });
    ws.on("error", (err) => {
      cb(err);
    });
  }
}

/**
 * create a socks5 proxy with target ws proxy server
 */
export class ProxyClient {
  private _wsServerAddr: string;
  private _localProxyServer: http.Server;
  private _localProxyPort: string | number;

  constructor(serverAddr: string, localPort: string | number = 53324) {
    this._wsServerAddr = serverAddr;
    this._localProxyServer = http.createServer();
    this._localProxyPort = localPort;
  }

  public async ready(): Promise<number> {
    return new Promise((resolve, reject) => {
      this._localProxyServer.listen(parseInt(this._localProxyPort as any, 10), () => {
        const port = this._localProxyServer.address()?.["port"];
        log("proxy ready on port: %s", port);
        resolve(port);
      });
      this._localProxyServer.once("error", (err) => {
        reject(err);
      });
      this._localProxyServer.on("request", this._onRequest.bind(this));
      this._localProxyServer.on("connect", this._onConnect.bind(this));
    });
  }

  private _onRequest(request: IncomingMessage, response: ServerResponse) {
    log("proxy accept request: %s", request.url);

    const uri = new URL(request.url);

    const proxyRequest = http.request({
      port: uri.port || 80,
      hostname: uri.hostname,
      method: request.method,
      path: uri.pathname,
      headers: request.headers,
      protocol: uri.protocol,
      agent: new ProxyAgent(this._wsServerAddr)
    });

    request.pipe(proxyRequest);

    request.on("end", () => {
      proxyRequest.end();
    });

    proxyRequest.on("response", (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode, proxyResponse.httpVersion, proxyResponse.headers);
      proxyResponse.pipe(response);
      proxyResponse.on("end", () => {
        response.end();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._localProxyServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * HTTP CONNECT proxy requests.
   */
  private _onConnect(req: IncomingMessage, proxyClientSocket: net.Socket, head) {
    assert(!head || 0 == head.length, '"head" should be empty for proxy requests');

    let res = new http.ServerResponse(req);
    res.shouldKeepAlive = false;
    res.chunkedEncoding = false;
    res.useChunkedEncodingByDefault = false;
    res.assignSocket(proxyClientSocket);

    let gotResponse = false;

    function onfinish() {
      res.detachSocket(proxyClientSocket);
      proxyClientSocket.end();
    }
    res.once("finish", onfinish);

    proxyClientSocket.on("error", (err) => {
      log("response socket error: %s", err);
    });

    // pause the socket during authentication so no data is lost
    const parts = req.url.split(":");
    const host = parts[0];
    const port = +parts[1];

    const _log = (format: string, ...args: any[]) => log(`proxy to [%s] ${format}`, host, ...args);

    const ws = new WebSocket(this._wsServerAddr, {
      headers: {
        "x-proxy-host": host,
        "x-proxy-port": port
      }
    });

    ws.on("open", () => {
      gotResponse = true;
      res.removeListener("finish", onfinish);

      res.writeHead(200, "Connection established");
      res.flushHeaders();

      // relinquish control of the `socket` from the ServerResponse instance
      res.detachSocket(proxyClientSocket);

      // nullify the ServerResponse object, so that it can be cleaned
      // up before this socket proxy is completed
      res = null;

      const targetProxy = WebSocket.createWebSocketStream(ws);

      targetProxy.on("close", () => {
        _log("target closed");
      });
      targetProxy.on("error", (err) => {
        _log("target error: %s", err);
      });
      targetProxy.on("end", () => {
        _log("target end");
      });
      proxyClientSocket.pipe(targetProxy);
      targetProxy.pipe(proxyClientSocket);
    });

    ws.on("close", () => {
      _log("websocket closed");
      proxyClientSocket.destroy();
    });

    ws.on("error", (err) => {
      _log("websocket err: %s", err);
      if (gotResponse) {
        proxyClientSocket.destroy();
      } else if ("ENOTFOUND" == err?.["code"]) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(500);
        res.end();
      }
    });
  }
}
