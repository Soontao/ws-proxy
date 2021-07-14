import http from "http";
import { ProxyClient } from "../src/client";
import { ProxyServer } from "../src/server";

const SERVER_PORT = 10032;
const CLIENT_PORT = 50001;
const server = http.createServer();
new ProxyServer({ server });

server.listen(SERVER_PORT, async () => {
  const client = new ProxyClient("ws://127.0.0.1:10032/", CLIENT_PORT);
  await client.ready();
});
