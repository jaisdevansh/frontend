import http from 'http';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server Accessible\n');
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running at http://0.0.0.0:${PORT}/`);
});
