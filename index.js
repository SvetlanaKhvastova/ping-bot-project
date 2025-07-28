require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const cors = require("cors");
const db = require("./database");

function saveUser(telegramId) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT OR IGNORE INTO users (telegram_id, role) VALUES (?, ?)`, [telegramId, "CLIENT"], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getAdministrators() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT telegram_id FROM users WHERE role = 'ADMINISTRATOR'`, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map((row) => row.telegram_id));
      }
    });
  });
}

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(express.json());
app.use(cors());

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "/start") {
    await saveUser(chatId);
    await bot.sendMessage(chatId, "Received your message", {
      reply_markup: {
        keyboard: [
          [
            {
              text: "🚀 Open Mini App",
              web_app: { url: "https://ping-bot-frontend.vercel.app/" },
            },
          ],
        ],
        resize_keyboard: true,
      },
    });

    await bot.sendMessage(chatId, "Inline Button:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Inline Mini App",
              web_app: { url: "https://ping-bot-frontend.vercel.app/" },
            },
          ],
        ],
      },
    });
  }

  const adminIds = process.env.ADMIN_CHAT_IDS?.split(",") || [];

  if (text === "/debug" && adminIds.includes(chatId.toString())) {
    try {
      db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) {
          bot.sendMessage(chatId, `Помилка: ${err.message}`);
        } else {
          let message = "👥 Користувачі в базі:\n\n";
          rows.forEach((user) => {
            message += `ID: ${user.id}\nTelegram ID: ${user.telegram_id}\nРоль: ${user.role}\n\n`;
          });
          bot.sendMessage(chatId, message || "База порожня");
        }
      });
    } catch (error) {
      bot.sendMessage(chatId, `Помилка: ${error.message}`);
    }
  }
});

app.post("/web-data", async (req, res) => {
  const { chatId, message } = req.body;

  if (!chatId || !message) {
    return res.status(400).json({ error: "chatId and message are required" });
  }

  try {
    const administrators = await getAdministrators();

    for (const adminId of administrators) {
      await bot.sendMessage(adminId, `🔔 Користувач ${chatId} натиснув кнопку: ${message}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
