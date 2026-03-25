const { createServer } = require("http");
const { parse } = require("url");
const { createHmac } = require("crypto");
const { execFile } = require("child_process");
const path = require("path");
const next = require("next");
const { Server: SocketServer } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const DB_PATH = path.join(process.cwd(), "data", "discord.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

const PORT = parseInt(process.env.PORT || "3003", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

function verifySignature(payload, signature) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  return expected === signature;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseAuthFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const parsed = cookie.parse(cookieHeader);
  const token = parsed.token;
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret);
    return { userId: decoded.userId, username: decoded.username };
  } catch {
    return null;
  }
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsed = parse(req.url || "/", true);

    // Webhook handler
    if (parsed.pathname === "/api/webhook" && req.method === "POST") {
      const body = await collectBody(req);
      const signature = req.headers["x-hub-signature-256"];
      if (!verifySignature(body, signature)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      const script = path.join(__dirname, "deploy_webhook.sh");
      execFile("bash", [script], (err, stdout, stderr) => {
        if (err) console.error("Deploy script error:", err.message);
        if (stdout) console.log("Deploy stdout:", stdout);
        if (stderr) console.error("Deploy stderr:", stderr);
      });
      return;
    }

    handle(req, res, parsed);
  });

  const io = new SocketServer(server);

  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const user = parseAuthFromCookie(cookieHeader);
    if (!user) return next(new Error("Authentication required"));
    socket.data.userId = user.userId;
    socket.data.username = user.username;
    next();
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.data.username} (${socket.data.userId})`);

    socket.on("channel:join", async ({ channelId }) => {
      try {
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true },
        });
        if (!channel) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId: socket.data.userId, serverId: channel.serverId } },
        });
        if (!member) return;
        socket.join(`channel:${channelId}`);
      } catch (err) {
        console.error("channel:join error:", err);
      }
    });

    socket.on("channel:leave", ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("message:create", async ({ channelId, content, fileUrl }) => {
      try {
        if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) return;
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true },
        });
        if (!channel) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId: socket.data.userId, serverId: channel.serverId } },
        });
        if (!member) return;
        const message = await prisma.message.create({
          data: {
            content: content.trim(),
            fileUrl: fileUrl || null,
            channelId,
            authorId: socket.data.userId,
          },
          include: { author: { select: { id: true, username: true, avatarUrl: true } } },
        });
        io.to(`channel:${channelId}`).emit("message:new", {
          id: message.id,
          content: message.content,
          fileUrl: message.fileUrl,
          deleted: message.deleted,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          channelId: message.channelId,
          author: message.author,
        });
      } catch (err) {
        console.error("message:create error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.data.username} (${socket.data.userId})`);
    });
  });

  server.listen(PORT, () => {
    console.log(`> Server listening on http://localhost:${PORT}`);
  });
});
