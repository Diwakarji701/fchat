const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('message', (msg) => {
    socket.broadcast.emit('message', msg);
  });

  socket.on('call-user', (data) => {
    socket.broadcast.emit('call-user', data);
  });

  socket.on('make-answer', (data) => {
    socket.broadcast.emit('make-answer', data);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

http.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
