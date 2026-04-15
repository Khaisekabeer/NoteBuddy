const io = require('socket.io-client');
const socket = io('http://localhost:5000');

const USER_ID_BESTIE = 3;

socket.on('connect', () => {
    console.log('Connected to server as Bestie');
    socket.emit('join', USER_ID_BESTIE);
});

socket.on('note_revealed', (data) => {
    console.log('SUCCESS: Received real-time reveal!', data);
    process.exit(0);
});

setTimeout(() => {
    console.log('Test timed out after 10s');
    process.exit(1);
}, 10000);
