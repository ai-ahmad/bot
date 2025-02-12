require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

let userRequests = {}; // Har bir user uchun vaqtincha ma'lumot saqlash

// Filialni tanlash menyusi
const branches = [
  "Filial 79", "Filial 80", "Filial 81", "Filial 82", "Filial 83",
];

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Salom! Siz muammo joylashgan filialni tanlang:", {
    reply_markup: {
      inline_keyboard: branches.map((branch) => [{ text: branch, callback_data: branch }]),
    },
  });
});

// Filial tanlangandan keyin rasm yuklash
bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const userId = msg.chat.id;
  const filial = callbackQuery.data;

  userRequests[userId] = { filial };
  bot.sendMessage(userId, "Iltimos, muammo rasmini yuboring.");
});

// Rasm qabul qilish
bot.on("photo", (msg) => {
  const userId = msg.chat.id;
  if (!userRequests[userId]) return bot.sendMessage(userId, "Avval filialni tanlang!");

  const fileId = msg.photo.pop().file_id;
  userRequests[userId].photo = fileId;
  bot.sendMessage(userId, "Endi muammo haqida qisqacha yozing.");
});

// Matn qabul qilish
bot.on("message", (msg) => {
  const userId = msg.chat.id;
  if (!userRequests[userId] || !userRequests[userId].photo || msg.photo) return;

  userRequests[userId].text = msg.text;
  const { filial, photo, text } = userRequests[userId];

  bot.sendMessage(userId, "Zayavka qabul qilindi! Ma’lumot yuborilmoqda... ✅");

  // Zayavkani administratorga yuborish
  bot.sendPhoto(ADMIN_CHAT_ID, photo, {
    caption: `📍 *Filial:* ${filial}\n📝 *Muammo:* ${text}`,
    parse_mode: "Markdown",
  });

  delete userRequests[userId]; // User request ma'lumotini tozalash
});

console.log("Bot ishga tushdi...");
