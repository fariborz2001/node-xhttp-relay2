const http = require('http');
const httpProxy = require('http-proxy');

// Render and Koyeb assign the port dynamically using process.env.PORT
const PORT = process.env.PORT || 10000;
const TARGET = process.env.TARGET_DOMAIN; 

if (!TARGET) {
    console.error("TARGET_DOMAIN environment variable is missing! Please set it in the dashboard.");
    process.exit(1);
}

const proxy = httpProxy.createProxyServer({
    target: TARGET,
    changeOrigin: true,
    ws: true,
    secure: false // Ignores SSL errors if your server uses a self-signed cert
});

// Pass along the real IP address
proxy.on('proxyReq', function(proxyReq, req, res, options) {
    if (req.headers['x-forwarded-for']) {
        proxyReq.setHeader('x-forwarded-for', req.headers['x-forwarded-for']);
    } else if (req.headers['cf-connecting-ip']) {
        proxyReq.setHeader('x-forwarded-for', req.headers['cf-connecting-ip']);
    }
});

// Handle tunnel drops gracefully
proxy.on('error', function (err, req, res) {
    console.error("Proxy Error:", err.message);
    if (!res.headersSent) {
        res.writeHead(502);
        res.end("Bad Gateway");
    }
});

// Handle normal HTTP/XHTTP traffic
const server = http.createServer((req, res) => {
    proxy.web(req, res);
});

// Handle standard WebSocket traffic
server.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Relay listening on port ${PORT}, routing to ${TARGET}`);
});
