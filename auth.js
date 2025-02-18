const bcrypt = require('bcrypt');
const db = require('./database');

module.exports = {
  register: async (req, res) => {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const { userId } = await db.createUser(username, hashedPassword);
      
      res.status(201).json({ 
        message: 'Usuário criado com sucesso',
        userId,
        username 
      });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar usuário' });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await db.getUser(username);
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Criar sessão simples
      const sessionId = Math.random().toString(36).substring(2);
      await db.createSession(user.user_id, sessionId);

      res.json({ 
        sessionId,
        userId: user.user_id,
        username: user.username
      });
    } catch (error) {
      res.status(400).json({ error: 'Erro ao fazer login' });
    }
  },

  verifySession: async (req, res, next) => {
    const sessionId = req.headers.authorization;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Sessão não fornecida' });
    }

    try {
      const session = await db.getSession(sessionId);
      if (!session) {
        return res.status(401).json({ error: 'Sessão inválida' });
      }
      
      const user = await db.getUserById(session.user_id);
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Sessão inválida' });
    }
  },

  verifySocketSession: async (sessionId, next) => {
    if (!sessionId) {
      return next(new Error('Authentication error'));
    }

    try {
      const session = await db.getSession(sessionId);
      if (!session) {
        return next(new Error('Invalid session'));
      }
      
      const user = await db.getUserById(session.user_id);
      next.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  }
}; 