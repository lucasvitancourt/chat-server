const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const auth = require('./auth');
const fs = require('fs');

// Habilitar CORS
app.use(cors());

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = process.env.NODE_ENV === 'production' 
        ? '/app/data/uploads'
        : path.join(__dirname, 'uploads');
      
      // Criar pasta se não existir
      if (!fs.existsSync(uploadPath)){
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  })
});

app.use(express.json());
app.use('/uploads', express.static(process.env.NODE_ENV === 'production' 
  ? '/app/data/uploads'
  : path.join(__dirname, 'uploads')
));

// Rotas de autenticação
app.post('/register', auth.register);
app.post('/login', auth.login);

// Rota para upload de arquivos
app.post('/upload', auth.verifySession, upload.single('file'), (req, res) => {
  if (req.file) {
    res.json({ 
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    });
  } else {
    res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
});

// Rotas de amizade
app.post('/friends/add', auth.verifySession, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.user_id;

    // Verifica se o amigo existe
    const friend = await db.getUserById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await db.addFriend(userId, friendId);
    res.status(201).json({ message: 'Solicitação de amizade enviada' });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao adicionar amigo' });
  }
});

app.get('/friends', auth.verifySession, async (req, res) => {
  try {
    const friends = await db.getFriends(req.user.user_id);
    res.json(friends);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao buscar amigos' });
  }
});

app.get('/friends/pending', auth.verifySession, async (req, res) => {
  try {
    const requests = await db.getPendingFriendRequests(req.user.user_id);
    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao buscar solicitações pendentes' });
  }
});

app.post('/friends/respond', auth.verifySession, async (req, res) => {
  try {
    const { friendId, accept } = req.body;
    const status = accept ? 'accepted' : 'rejected';
    
    await db.updateFriendshipStatus(req.user.user_id, friendId, status);
    res.json({ message: 'Solicitação de amizade atualizada' });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao responder solicitação' });
  }
});

// Gerenciamento de conexões Socket.IO
io.use(async (socket, next) => {
  const sessionId = socket.handshake.auth.sessionId;
  await auth.verifySocketSession(sessionId, next);
});

io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.user.username);

  socket.on('message', async (data) => {
    const message = {
      userId: socket.user.user_id,
      username: socket.user.username,
      content: data.content,
      type: data.type,
      timestamp: new Date()
    };

    await db.insertMessage(message);
    io.emit('message', message);
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.user.username);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 