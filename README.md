# ws-proxy

[![npm (scoped)](https://img.shields.io/npm/v/@newdash/ws-proxy)](https://www.npmjs.com/package/@newdash/ws-proxy)
[![node-test](https://github.com/Soontao/ws-proxy/actions/workflows/nodejs.yml/badge.svg)](https://github.com/Soontao/ws-proxy/actions/workflows/nodejs.yml)
[![codecov](https://codecov.io/gh/Soontao/ws-proxy/branch/main/graph/badge.svg?token=7UAYhJ0lP3)](https://codecov.io/gh/Soontao/ws-proxy)

> provide http proxy under web socket

## High Level Design

![](https://res.cloudinary.com/digf90pwi/image/upload/v1626255042/ws-proxy_1_ezuxfy.png)

## Example

> an example proxy server with client

server

```ts
import http from "http";
import { ProxyServer } from "../src/server";

const SERVER_PORT = 10032;
const server = http.createServer();
new ProxyServer({ server });
server.listen(SERVER_PORT);
```

client

```ts
import http from "http";
import { ProxyClient } from "../src/client";

const SERVER_PORT = 10032;
const CLIENT_PORT = 50001;

const client = new ProxyClient(
  `ws://server.host.com:${SERVER_PORT}`,
  CLIENT_PORT
);
client.ready().then(()=>{
  console.log("proxy ready")
});
// http proxy ready on http://127.0.0.1:50001

```

## [CHANGELOG](./CHANGELOG.md)

## [LICENSE](./LICENSE)

