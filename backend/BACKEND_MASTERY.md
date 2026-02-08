# 🎓 NoteBuddy Backend Master Class

Welcome to the deep dive. This document breaks down every single part of your backend. By the end of this, you will understand not just *how* it works, but *why* professional engineers build it this way.

## 🏗️ Phase 1: The Foundation (Dependencies)

Before writing code, we need tools. Here is what every package in your `package.json` actually does:

| Package | Purpose | Why we use it |
| :--- | :--- | :--- |
| **express** | The Web Framework | It handles HTTP requests (GET, POST) efficiently. Node.js alone is too low-level. |
| **cors** | Security Policy | "Cross-Origin Resource Sharing". It allows your frontend (usually on a different port/domain) to talk to this backend. Without it, browsers block the request. |
| **dotenv** | Environment Variables | Loads secrets from `.env` file so we don't hardcode passwords in the code. |
| **bcryptjs** | Password Hashing | Turns passwords into unreadable gibberish. Essential for security. |
| **jsonwebtoken** | Authentication | Creates the "digital wristband" (Token) users carry to prove they are logged in. |
| **crypto-js** | Data Encryption | Used to encrypt the *content* of notes so even the database admin can't read them. |
| **socket.io** | Real-Time Communication | Enables the "instant" popup features without refreshing the page. |
| **@supabase/supabase-js** | Database Client | The official tool to talk to your Supabase (PostgreSQL) database. |

---

## 🔌 Phase 2: Database Connection (`db.js`)

This file is the **Singleton** pattern. We create ONE connection and share it everywhere.

```javascript
const { createClient } = require('@supabase/supabase-js');

// 1. Fail Fast: If keys are missing, stop immediately.
if (!supabaseKey) {
  console.error('❌ FATAL: SUPABASE_ANON_KEY is not defined!');
  process.exit(1); // Exit code 1 means "Error"
}

// 2. Create the instance
const supabase = createClient(supabaseUrl, supabaseKey);
```

**Expert Insight 🧠**:
Why `maybeSingle()` in the seed logic?
*   `single()` crashes if 0 rows are found.
*   `maybeSingle()` returns `null` if 0 rows are found. This is much safer for checking "does this user exist?"

---

## 🛡️ Phase 3: The Server & Security (`server.js`)

### 1. The Encryption Layer (AES)
We use **Symmetric Encryption** (AES). Same key locks and unlocks.

```javascript
const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};
```
*   **Input**: "I love pizza"
*   **Key**: "MySecretKey"
*   **Output**: "U2FsdGVkX1+..." (This is what goes into the DB)

### 2. The Middleware (`authenticateToken`)
This is the **Gatekeeper**. It runs *before* protected routes.

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Token usually comes as: "Bearer eyJhbGci..."
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401); // 401 = Who are you? (Unauthenticated)

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403); // 403 = You are logged in, but this token is fake/expired. (Forbidden)
    
    // IMPORTANT: We attach the user info to the request object!
    // Now every route after this knows EXACTLY who 'req.user' is.
    req.user = user;
    next(); // Pass control to the next function
  });
};
```

---

## 🛣️ Phase 4: API Routes (The Logic)

### A. Authentication (`/api/auth/login`)
1.  **Search**: Find user by username.
2.  **Compare**: Use `bcrypt.compare(inputPassword, dbHash)`. NEVER compare plain text!
3.  **Sign**: Create a JWT token containing just `{ id: 1, username: 'khai' }`. We don't put sensitive info in tokens because they can be decoded easily (though not faked).

### B. Fetching Notes (`GET /api/notes`)
This is the most complex query in your app.

```javascript
.or(`author_id.eq.${req.user.id},and(recipient_id.eq.${req.user.id},is_revealed.eq.true)`)
```
**Breakdown**:
*   Supabase/PostgREST syntax is tricky.
*   It filters for:
    *   Records where I am the `author`
    *   **OR**
    *   Records where (I am `recipient` **AND** `is_revealed` is `true`)

**After Fetching**:
We map over the results to `decrypt()` the content. Meaning the raw encrypted data never leaves the server in a readable format unless the user is authorized.

### C. Creating Notes (`POST /api/notes`)
1.  **Resolve Recipient**: You send a username, we look up the ID. If typo, `recipient_id` is null (private note).
2.  **Encrypt**: Title and Content are scrambled.
3.  **Insert**: Save to DB.
4.  **Notify**: If it's a revealed note, trigger Socket.io.

---

## ⚡ Phase 5: Real-Time Sockets

We use **Rooms** to manage privacy.

```javascript
// Client side says: "I am User 5"
socket.on('join', (userId) => {
  socket.join(`user_${userId}`); // Creates a private channel named "user_5"
});

// Server side says: "User 5 has a new note!"
io.to(`user_${recipient_id}`).emit('note_revealed', { ... });
```
This is efficient. Instead of broadcasting to *everyone* ("Hey, someone got a note!"), we only whisper to the specific connection in the specific room.

---

## 🧪 Phase 6: Deployment & Health

### The Health Check
```javascript
app.get('/health', (req, res) => res.status(200).send('OK'));
```
**Why?**
Cloud providers (Render, AWS) need to know if your app is alive. They ping this URL. If it returns 200, they send traffic. If it crashes (500) or times out, they restart your server.

### Static File Serving
```javascript
app.use(express.static(path.join(__dirname, '../dist')));
```
Since we are deploying as a bundle, the Node server also acts as a Web Server for your React app (the `dist` folder created by Vite).

---

## 🎓 Expert Tips for the Future

1.  **Input Validation**: Right now we trust the client. A pro would use a library like `zod` to ensure `req.body.username` is actually a string before querying the DB.
2.  **Rate Limiting**: Use `express-rate-limit` to prevent someone from trying to login 1000 times a second to guess passwords.
3.  **Transactions**: If you implemented the "Delete User" feature, you'd want to use a SQL Transaction to ensure that if deleting the notes fails, the user isn't deleted either (All or Nothing). We handled this via SQL Cascades instead, which is also valid.

You are now running a backend that uses industry-standard security and patterns! 🚀
