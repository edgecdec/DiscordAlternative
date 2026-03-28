const { createServer } = require("http");
const { parse } = require("url");
const { createHmac } = require("crypto");
const { execFile } = require("child_process");
const fs = require("fs");
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

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

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

    // Serve static uploads
    if (parsed.pathname && parsed.pathname.startsWith("/uploads/")) {
      const filename = path.basename(parsed.pathname);
      const filePath = path.join(UPLOADS_DIR, filename);
      try {
        const stat = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": stat.size,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }

    handle(req, res, parsed);
  });

  const io = new SocketServer(server);
  const onlineUsers = new Map(); // Map<userId, Set<socketId>>
  const voiceChannels = new Map(); // Map<channelId, Map<userId, { username, socketId }>>
  const socketVoice = new Map(); // Map<socketId, channelId> — quick lookup for disconnect cleanup

  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const user = parseAuthFromCookie(cookieHeader);
    if (!user) return next(new Error("Authentication required"));
    socket.data.userId = user.userId;
    socket.data.username = user.username;
    next();
  });

  io.on("connection", async (socket) => {
    const { userId, username } = socket.data;
    console.log(`Socket connected: ${username} (${userId})`);

    // Track online presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join server rooms and broadcast presence:online
    try {
      const memberships = await prisma.serverMember.findMany({
        where: { userId },
        select: { serverId: true },
      });
      const serverRooms = memberships.map((m) => `server:${m.serverId}`);
      for (const room of serverRooms) {
        socket.join(room);
      }
      // Only broadcast if this is the user's first socket (just came online)
      if (onlineUsers.get(userId).size === 1) {
        for (const room of serverRooms) {
          socket.to(room).emit("presence:online", { userId, username });
        }
      }
    } catch (err) {
      console.error("presence:online error:", err);
    }

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

    socket.on("presence:list", async ({ serverId }) => {
      try {
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId: socket.data.userId, serverId } },
        });
        if (!member) return;
        const members = await prisma.serverMember.findMany({
          where: { serverId },
          include: { user: { select: { id: true, status: true } } },
        });
        const onlineUserIds = members
          .map((m) => m.user.id)
          .filter((id) => onlineUsers.has(id));
        const userStatuses = {};
        for (const m of members) {
          userStatuses[m.user.id] = onlineUsers.has(m.user.id) ? m.user.status : "offline";
        }
        socket.emit("presence:list", { onlineUserIds, userStatuses });
      } catch (err) {
        console.error("presence:list error:", err);
      }
    });

    socket.on("message:create", async ({ channelId, content, fileUrl, replyToId }) => {
      try {
        if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) return;
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true, slowModeSeconds: true },
        });
        if (!channel) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId: socket.data.userId, serverId: channel.serverId } },
        });
        if (!member) return;

        // Slow mode enforcement (skip for OWNER/ADMIN)
        if (channel.slowModeSeconds > 0 && !["OWNER", "ADMIN"].includes(member.role)) {
          const lastMsg = await prisma.message.findFirst({
            where: { channelId, authorId: socket.data.userId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });
          if (lastMsg) {
            const elapsed = (Date.now() - lastMsg.createdAt.getTime()) / 1000;
            if (elapsed < channel.slowModeSeconds) {
              const remaining = Math.ceil(channel.slowModeSeconds - elapsed);
              socket.emit("message:error", { error: `Slow mode: wait ${remaining}s`, remaining });
              return;
            }
          }
        }

        const message = await prisma.message.create({
          data: {
            content: content.trim(),
            fileUrl: fileUrl || null,
            replyToId: replyToId || null,
            channelId,
            authorId: socket.data.userId,
          },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            replyTo: {
              select: {
                id: true,
                content: true,
                deleted: true,
                author: { select: { id: true, username: true } },
              },
            },
          },
        });
        const replyTo = message.replyTo
          ? { id: message.replyTo.id, content: message.replyTo.deleted ? "" : message.replyTo.content, author: message.replyTo.author, deleted: message.replyTo.deleted }
          : null;
        io.to(`channel:${channelId}`).emit("message:new", {
          id: message.id,
          content: message.content,
          fileUrl: message.fileUrl,
          deleted: message.deleted,
          pinned: message.pinned,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          channelId: message.channelId,
          author: message.author,
          replyTo,
        });

        // Parse @mentions and notify mentioned users
        const mentionPattern = /@(\w+)/g;
        const mentionedNames = new Set();
        let match;
        while ((match = mentionPattern.exec(message.content)) !== null) {
          mentionedNames.add(match[1].toLowerCase());
        }
        if (mentionedNames.size > 0) {
          try {
            const members = await prisma.serverMember.findMany({
              where: { serverId: channel.serverId },
              include: { user: { select: { id: true, username: true } } },
            });
            for (const m of members) {
              if (mentionedNames.has(m.user.username.toLowerCase()) && m.userId !== socket.data.userId) {
                const sockets = onlineUsers.get(m.userId);
                if (sockets) {
                  for (const sid of sockets) {
                    io.to(sid).emit("mention:notify", {
                      messageId: message.id,
                      channelId,
                      serverId: channel.serverId,
                      fromUsername: socket.data.username,
                      content: message.content,
                    });
                  }
                }
              }
            }
          } catch (mentionErr) {
            console.error("mention:notify error:", mentionErr);
          }
        }
      } catch (err) {
        console.error("message:create error:", err);
      }
    });

    socket.on("message:update", async ({ messageId, content }) => {
      try {
        if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) return;
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { authorId: true, channelId: true, deleted: true },
        });
        if (!message || message.deleted || message.authorId !== socket.data.userId) return;
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content: content.trim() },
          include: { author: { select: { id: true, username: true, avatarUrl: true } } },
        });
        io.to(`channel:${updated.channelId}`).emit("message:updated", {
          id: updated.id,
          content: updated.content,
          fileUrl: updated.fileUrl,
          deleted: updated.deleted,
          pinned: updated.pinned,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          channelId: updated.channelId,
          author: updated.author,
        });
      } catch (err) {
        console.error("message:update error:", err);
      }
    });

    socket.on("message:delete", async ({ messageId }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { authorId: true, channelId: true, deleted: true, channel: { select: { serverId: true } } },
        });
        if (!message || message.deleted) return;
        const isAuthor = message.authorId === socket.data.userId;
        if (!isAuthor) {
          const member = await prisma.serverMember.findUnique({
            where: { userId_serverId: { userId: socket.data.userId, serverId: message.channel.serverId } },
          });
          if (!member || (member.role !== "OWNER" && member.role !== "ADMIN" && member.role !== "MODERATOR")) return;
        }
        await prisma.message.update({
          where: { id: messageId },
          data: { deleted: true },
        });
        io.to(`channel:${message.channelId}`).emit("message:deleted", { messageId });
      } catch (err) {
        console.error("message:delete error:", err);
      }
    });

    socket.on("reaction:toggle", async ({ messageId, emoji }) => {
      try {
        if (!messageId || !emoji || typeof emoji !== "string") return;
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { id: true, deleted: true, channelId: true, channel: { select: { serverId: true } } },
        });
        if (!message || message.deleted) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId: socket.data.userId, serverId: message.channel.serverId } },
        });
        if (!member) return;
        const existing = await prisma.reaction.findUnique({
          where: { userId_messageId_emoji: { userId: socket.data.userId, messageId, emoji } },
        });
        const payload = { messageId, emoji, userId: socket.data.userId, channelId: message.channelId };
        if (existing) {
          await prisma.reaction.delete({ where: { id: existing.id } });
          io.to(`channel:${message.channelId}`).emit("reaction:remove", payload);
        } else {
          await prisma.reaction.create({ data: { emoji, userId: socket.data.userId, messageId } });
          io.to(`channel:${message.channelId}`).emit("reaction:add", payload);
        }
      } catch (err) {
        console.error("reaction:toggle error:", err);
      }
    });

    socket.on("pin:toggle", async ({ messageId }) => {
      try {
        if (!messageId) return;
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { id: true, deleted: true, pinned: true, channelId: true, channel: { select: { serverId: true } } },
        });
        if (!message || message.deleted) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId: socket.data.userId, serverId: message.channel.serverId } },
          select: { role: true },
        });
        if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) return;
        await prisma.message.update({
          where: { id: messageId },
          data: { pinned: !message.pinned },
        });
        io.to(`channel:${message.channelId}`).emit("pin:toggle", {
          messageId,
          pinned: !message.pinned,
          channelId: message.channelId,
        });
      } catch (err) {
        console.error("pin:toggle error:", err);
      }
    });

    const VALID_STATUSES = ["online", "away", "dnd", "offline"];

    socket.on("presence:status", async ({ status }) => {
      if (!status || !VALID_STATUSES.includes(status)) return;
      try {
        await prisma.user.update({ where: { id: userId }, data: { status } });
        const memberships = await prisma.serverMember.findMany({
          where: { userId },
          select: { serverId: true },
        });
        for (const m of memberships) {
          io.to(`server:${m.serverId}`).emit("presence:status", { userId, status });
        }
      } catch (err) {
        console.error("presence:status error:", err);
      }
    });

    socket.on("typing:start", ({ channelId }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit("typing:start", {
        userId: socket.data.userId,
        username: socket.data.username,
        channelId,
      });
    });

    socket.on("typing:stop", ({ channelId }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit("typing:stop", {
        userId: socket.data.userId,
        username: socket.data.username,
        channelId,
      });
    });

    socket.on("read:update", async ({ channelId, lastReadMessageId }) => {
      if (!channelId || !lastReadMessageId) return;
      try {
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true },
        });
        if (!channel) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId, serverId: channel.serverId } },
        });
        if (!member) return;
        await prisma.channelRead.upsert({
          where: { userId_channelId: { userId, channelId } },
          update: { lastReadMessageId },
          create: { userId, channelId, lastReadMessageId },
        });
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { avatarUrl: true },
        });
        socket.to(`channel:${channelId}`).emit("read:update", {
          userId,
          username,
          channelId,
          lastReadMessageId,
          avatarUrl: user?.avatarUrl ?? null,
        });
      } catch (err) {
        console.error("read:update error:", err);
      }
    });

    socket.on("voice:join", async ({ channelId }) => {
      if (!channelId) return;
      try {
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true, type: true },
        });
        if (!channel || (channel.type !== "VOICE" && channel.type !== "VIDEO")) return;
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId, serverId: channel.serverId } },
        });
        if (!member) return;

        // Remove from previous voice channel if any
        const prevChannel = socketVoice.get(socket.id);
        if (prevChannel && prevChannel !== channelId) {
          const prevMap = voiceChannels.get(prevChannel);
          if (prevMap) {
            prevMap.delete(userId);
            if (prevMap.size === 0) voiceChannels.delete(prevChannel);
          }
          io.to(`server:${channel.serverId}`).emit("voice:left", { channelId: prevChannel, userId, username });
        }

        if (!voiceChannels.has(channelId)) voiceChannels.set(channelId, new Map());
        voiceChannels.get(channelId).set(userId, { username, socketId: socket.id });
        socketVoice.set(socket.id, channelId);

        io.to(`server:${channel.serverId}`).emit("voice:joined", { channelId, userId, username });
      } catch (err) {
        console.error("voice:join error:", err);
      }
    });

    socket.on("voice:leave", async ({ channelId }) => {
      if (!channelId) return;
      try {
        const chMap = voiceChannels.get(channelId);
        if (chMap) {
          chMap.delete(userId);
          if (chMap.size === 0) voiceChannels.delete(channelId);
        }
        socketVoice.delete(socket.id);

        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { serverId: true },
        });
        if (channel) {
          io.to(`server:${channel.serverId}`).emit("voice:left", { channelId, userId, username });
        }
      } catch (err) {
        console.error("voice:leave error:", err);
      }
    });

    socket.on("voice:participants", ({ channelId }) => {
      if (!channelId) return;
      const chMap = voiceChannels.get(channelId);
      const participants = [];
      if (chMap) {
        for (const [uid, data] of chMap) {
          participants.push({ userId: uid, username: data.username });
        }
      }
      socket.emit("voice:participants", { channelId, participants });
    });

    socket.on("dm:create", async ({ receiverId, content, fileUrl }) => {
      try {
        if (!content || typeof content !== "string" || !content.trim() || content.length > 2000) return;
        if (!receiverId || receiverId === socket.data.userId) return;
        const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
        if (!receiver) return;
        const dm = await prisma.directMessage.create({
          data: {
            content: content.trim(),
            fileUrl: fileUrl || null,
            senderId: socket.data.userId,
            receiverId,
          },
          include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
        });
        const payload = {
          id: dm.id,
          content: dm.content,
          fileUrl: dm.fileUrl,
          senderId: dm.senderId,
          receiverId: dm.receiverId,
          createdAt: dm.createdAt.toISOString(),
          updatedAt: dm.updatedAt.toISOString(),
          sender: dm.sender,
        };
        // Send to all receiver's sockets
        const receiverSockets = onlineUsers.get(receiverId);
        if (receiverSockets) {
          for (const sid of receiverSockets) {
            io.to(sid).emit("dm:new", payload);
          }
        }
        // Send back to sender's sockets
        const senderSockets = onlineUsers.get(socket.data.userId);
        if (senderSockets) {
          for (const sid of senderSockets) {
            io.to(sid).emit("dm:new", payload);
          }
        }
      } catch (err) {
        console.error("dm:create error:", err);
      }
    });

    socket.on("disconnect", async () => {
      const { userId, username } = socket.data;
      console.log(`Socket disconnected: ${username} (${userId})`);

      // Clean up voice channel presence
      const voiceChId = socketVoice.get(socket.id);
      if (voiceChId) {
        const chMap = voiceChannels.get(voiceChId);
        if (chMap) {
          chMap.delete(userId);
          if (chMap.size === 0) voiceChannels.delete(voiceChId);
        }
        socketVoice.delete(socket.id);
        try {
          const channel = await prisma.channel.findUnique({
            where: { id: voiceChId },
            select: { serverId: true },
          });
          if (channel) {
            io.to(`server:${channel.serverId}`).emit("voice:left", { channelId: voiceChId, userId, username });
          }
        } catch (err) {
          console.error("voice disconnect cleanup error:", err);
        }
      }

      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline to all user's server rooms
          try {
            const memberships = await prisma.serverMember.findMany({
              where: { userId },
              select: { serverId: true },
            });
            for (const m of memberships) {
              io.to(`server:${m.serverId}`).emit("presence:offline", { userId });
            }
          } catch (err) {
            console.error("presence:offline error:", err);
          }
        }
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`> Server listening on http://localhost:${PORT}`);
  });
});
