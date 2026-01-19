const io = require('socket.io-client');
const http = require('http');

const socket = io('http://localhost:5000');
const USER_ID_BESTIE = 3;

socket.on('connect', () => {
    console.log('Bestie connected');
    socket.emit('join', USER_ID_BESTIE);
    
    // Now login as Khai and reveal Note 9
    const loginData = JSON.stringify({username: 'khai', password: '123'});
    const loginReq = http.request({hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: {'Content-Type': 'application/json'}}, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            const token = JSON.parse(body).token;
            console.log('Khai logged in');
            const revealReq = http.request({hostname: 'localhost', port: 5000, path: '/api/notes/9/reveal', method: 'PATCH', headers: {'Authorization': 'Bearer ' + token}}, (res2) => {
                res2.on('data', d => console.log('Note revealed response:', d.toString()));
            });
            revealReq.end();
        });
    });
    loginReq.write(loginData);
    loginReq.end();
});

socket.on('note_revealed', (data) => {
    console.log('SUCCESS: Bestie received real-time reveal!', data);
    process.exit(0);
});

setTimeout(() => {
    console.log('Test timed out');
    process.exit(1);
}, 10000);
