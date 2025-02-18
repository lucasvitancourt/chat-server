const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Usar pasta data para persistência
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/chat.db'
  : path.join(__dirname, 'chat.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabela de usuários
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabela de sessões
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    session_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
  )`);

  // Tabela de amigos
  db.run(`CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    friend_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(friend_id) REFERENCES users(user_id)
  )`);

  // Tabela de mensagens
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    content TEXT,
    type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
  )`);
});

function generateUserId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

module.exports = {
  createUser: async (username, hashedPassword) => {
    const userId = generateUserId();
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO users (user_id, username, password) VALUES (?, ?, ?)',
        [userId, username, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, userId });
        }
      );
    });
  },

  createSession: (userId, sessionId) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO sessions (user_id, session_id) VALUES (?, ?)',
        [userId, sessionId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  getSession: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  getUser: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE user_id = ?', [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  addFriend: (userId, friendId) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
        [userId, friendId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  getFriends: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT u.user_id, u.username, f.status
        FROM friendships f
        JOIN users u ON (f.friend_id = u.user_id)
        WHERE f.user_id = ? AND f.status = 'accepted'
        UNION
        SELECT u.user_id, u.username, f.status
        FROM friendships f
        JOIN users u ON (f.user_id = u.user_id)
        WHERE f.friend_id = ? AND f.status = 'accepted'
      `, [userId, userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getPendingFriendRequests: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT u.user_id, u.username, f.status
        FROM friendships f
        JOIN users u ON (f.user_id = u.user_id)
        WHERE f.friend_id = ? AND f.status = 'pending'
      `, [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  updateFriendshipStatus: (userId, friendId, status) => {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE friendships 
        SET status = ? 
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `,
        [status, userId, friendId, friendId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  insertMessage: (message) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO messages (user_id, content, type) VALUES (?, ?, ?)',
        [message.userId, message.content, message.type],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  getMessages: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT messages.*, users.username 
        FROM messages 
        JOIN users ON messages.user_id = users.id 
        ORDER BY messages.timestamp DESC 
        LIMIT 50
      `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}; 