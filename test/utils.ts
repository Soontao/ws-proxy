import http from "http";

export async function listenServer(server: http.Server) {
  return new Promise((res, rej) => {
    server.listen(0, () => {
      res(server.address()["port"]);
    });
    server.on("error", rej);
  });
}

export async function closeServer(server: http.Server): Promise<void> {
  return new Promise((res, rej) => {
    server.close((err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}
