# 💬 Chat Server

Servidor de chat em tempo real com **Node.js, Express e Socket.IO**, com contas de usuário, amigos e envio de arquivos.

## ✨ Recursos

- Cadastro e login com senha protegida por **bcrypt**
- Lista de amigos com convites (enviar, aceitar, recusar)
- Mensagens em tempo real via **Socket.IO**
- Upload de arquivos com **multer**
- Persistência em **SQLite**

## 🚀 Rodando

Requer Node.js 18+.

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta da variável `PORT`).

## 🔌 Rotas

| Método | Rota | Descrição |
|:--|:--|:--|
| POST | `/register` | Cria conta |
| POST | `/login` | Autentica |
| POST | `/upload` | Envia arquivo (autenticado) |
| GET | `/friends` | Lista amigos |
| GET | `/friends/pending` | Convites pendentes |
| POST | `/friends/add` | Envia convite |
| POST | `/friends/respond` | Aceita ou recusa convite |

Eventos Socket.IO: `message` e `disconnect`.

## ☁️ Deploy

Inclui `Procfile` (`web: node index.js`). Em produção (`NODE_ENV=production`) os uploads ficam em `/app/data/uploads`.
