import http from "http";
import { ProxyClient } from "../src/client";
import { ProxyServer } from "../src/server";

const s = http.createServer(function (req, res) {
  res.write("Hello World!"); //write a response to the client
  res.end(); //end the response
});

const server = new ProxyServer({ server: s });
s.listen(10032).on("listening", () => {
  const client = new ProxyClient("ws://127.0.0.1:10032/");
});
