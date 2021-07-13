// license: MIT
// repo: https://github.com/TooTallNate/proxy
// with customize logic
import assert from "assert";
import debug from "debug";
import http, { IncomingMessage } from "http";
import net from "net";
import WebSocket from "ws";

const log = debug("ws-client");

/**
 * create a socks5 proxy with target ws proxy server
 */
export class ProxyClient {
  private _wsServerAddr: string;
  private _localSocksServer: http.Server;
  constructor(serverAddr: string, localPort = 53324) {
    this._wsServerAddr = serverAddr;
    this._localSocksServer = http.createServer().listen(localPort);
    this._localSocksServer.on("connect", this._onConnect.bind(this));
  }

  /**
   * HTTP CONNECT proxy requests.
   */
  private _onConnect(req: IncomingMessage, socket: net.Socket, head) {
    assert(!head || 0 == head.length, '"head" should be empty for proxy requests');

    let res;
    let gotResponse = false;

    // create the `res` instance for this request since Node.js
    // doesn't provide us with one :(
    // XXX: this is undocumented API, so it will break some day (ノಠ益ಠ)ノ彡┻━┻
    res = new http.ServerResponse(req);
    res.shouldKeepAlive = false;
    res.chunkedEncoding = false;
    res.useChunkedEncodingByDefault = false;
    res.assignSocket(socket);

    // called for the ServerResponse's "finish" event
    // XXX: normally, node's "http" module has a "finish" event listener that would
    // take care of closing the socket once the HTTP response has completed, but
    // since we're making this ServerResponse instance manually, that event handler
    // never gets hooked up, so we must manually close the socket...
    function onfinish() {
      res.detachSocket(socket);
      socket.end();
    }
    res.once("finish", onfinish);

    socket.on("error", (err) => {
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
      res.detachSocket(socket);

      // nullify the ServerResponse object, so that it can be cleaned
      // up before this socket proxy is completed
      res = null;

      const target = WebSocket.createWebSocketStream(ws);

      target.on("close", () => {
        _log("target closed");
      });
      target.on("error", (err) => {
        _log("target error: %s", err);
      });
      target.on("end", () => {
        _log("target end");
      });
      socket.pipe(target);
      target.pipe(socket);
    });

    ws.on("close", () => {
      socket.destroy();
    });

    ws.on("error", (err) => {
      if (gotResponse) {
        socket.destroy();
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
