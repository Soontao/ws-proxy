import axios from "axios";
import http from "http";
import ProxyAgent from "proxy-agent";
import { ProxyClient, ProxyServer } from "../src";
import { closeServer, listenServer } from "./utils";

describe("Demo Test Suite", () => {
  it("should not be exported", () => {
    expect(ProxyClient).not.toBeUndefined();
    expect(ProxyServer).not.toBeUndefined();
  });

  it("should support basic proxy", async () => {
    let httpServer: http.Server;
    let proxyServer: ProxyServer;
    let proxyClient: ProxyClient;

    try {
      httpServer = http.createServer();
      proxyServer = new ProxyServer({ server: httpServer });
      const proxyServerPort = await listenServer(httpServer);
      proxyClient = new ProxyClient(`ws://127.0.0.1:${proxyServerPort}/`);
      const proxyClientPort = await proxyClient.ready();
      const agent = new ProxyAgent(`http://127.0.0.1:${proxyClientPort}`);

      const resp = await axios.get("https://registry.npmjs.org/", {
        httpAgent: agent,
        httpsAgent: agent
      });

      expect(resp.status).toBe(200);

      const resp2 = await axios.get("http://registry.npmjs.org/", {
        httpAgent: agent,
        httpsAgent: agent
      });

      expect(resp2.status).toBe(200);
    } finally {
      if (proxyServer) {
        await proxyServer.stop();
      }
      if (httpServer) {
        await closeServer(httpServer);
      }
      if (proxyClient) {
        await proxyClient.stop();
      }
    }
  });
});
