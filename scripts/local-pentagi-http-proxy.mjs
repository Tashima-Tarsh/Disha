import http from "node:http";
import https from "node:https";
import tls from "node:tls";

const listenHost = "127.0.0.1";
const listenPort = 8088;
const targetHost = "127.0.0.1";
const targetPort = 8443;

const agent = new https.Agent({ rejectUnauthorized: false });

const server = http.createServer((req, res) => {
  const options = {
    agent,
    hostname: targetHost,
    port: targetPort,
    path: req.url || "/",
    method: req.method,
    rejectUnauthorized: false,
    headers: {
      ...req.headers,
      host: `${targetHost}:${targetPort}`,
      origin: `https://${targetHost}:${targetPort}`,
      referer: `https://${targetHost}:${targetPort}/`,
    },
  };

  const upstream = https.request(options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`DISHA 6.6 bridge error: ${error.message}`);
  });

  req.pipe(upstream);
});

server.listen(listenPort, listenHost, () => {
  console.log(`DISHA 6.6 Pentagi HTTP bridge: http://${listenHost}:${listenPort}/`);
});

server.on("upgrade", (req, socket, head) => {
  const upstream = tls.connect(
    {
      host: targetHost,
      port: targetPort,
      rejectUnauthorized: false,
      servername: "localhost",
    },
    () => {
      const headers = {
        ...req.headers,
        host: `${targetHost}:${targetPort}`,
        origin: `https://${targetHost}:${targetPort}`,
      };
      const rawHeaders = Object.entries(headers)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("\r\n");
      upstream.write(`${req.method} ${req.url || "/"} HTTP/${req.httpVersion}\r\n${rawHeaders}\r\n\r\n`);
      if (head?.length) {
        upstream.write(head);
      }
      upstream.pipe(socket);
      socket.pipe(upstream);
    },
  );

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});
