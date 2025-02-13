const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const ExcelJS = require("exceljs");

const TOKEN = "7390473104:AAE27j-Nofeu3n2AnzMYLF-Z8FEplCdIKPo";
const GROUP_ID = -1002466999228;
const bot = new TelegramBot(TOKEN, { polling: true });

const statuses = {
  accepted: "✅ Qabul qilindi",
  completed: "✔️ Bajarildi",
  rejected: "❌ Rad etilgan",
};

const branches = ["Filial 1", "Filial 2", "Filial 3"];
const categories = [
  { type: "Elektr", contact: "https://t.me/akhmad_x1" },
  { type: "Suv", contact: "https://t.me/akhmad_x1" },
  { type: "Internet", contact: "https://t.me/akhmad_x1" },
];

const userRequests = {};
const allRequests = [];

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.data.split("_")[1];
  const action = query.data.split("_")[0];

  const request = allRequests.find(req => req.userId == userId);
  if (request) {
    request.status = action === "complete" ? statuses.completed : statuses.rejected;

    const message = `📊 Sizning zayavkangizning yangi statusi: ${request.status}\n\n` +
      `📍 <b>Filial:</b> ${request.filial}\n` +
      `📌 <b>Kategoriya:</b> ${request.category}\n` +
      `📝 <b>Muammo:</b> ${request.text}\n` +
      `📞 <b>Bog'lanish:</b> <a href='${request.contact}'>Kontakt</a>\n` +
      `📱 <b>Telefon:</b> ${request.phone}\n` +
      `📍 <b>Lokatsiya:</b> <a href='https://maps.google.com/?q=${request.location.latitude},${request.location.longitude}'>Google Maps</a>`;

    bot.sendMessage(userId, message, { parse_mode: "HTML" });
    bot.editMessageCaption(message, { chat_id: chatId, message_id: query.message.message_id, parse_mode: "HTML" });
  }
});

bot.onText(/\/start/, (msg) => {
  const userId = msg.chat.id;
  userRequests[userId] = {};
  bot.sendMessage(userId, "📍 Iltimos, filialni tanlang:", {
    reply_markup: {
      keyboard: branches.map((b) => [b]),
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

bot.on("message", async (msg) => {
  const userId = msg.chat.id;
  const text = msg.text;

  if (!userRequests[userId]) {
    userRequests[userId] = {};
  }

  if (!userRequests[userId].filial && branches.includes(text)) {
    userRequests[userId].filial = text;
    bot.sendMessage(userId, "📌 Muammo kategoriyasini tanlang:", {
      reply_markup: {
        keyboard: categories.map((c) => [c.type]),
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  const selectedCategory = categories.find((c) => c.type === text);
  if (selectedCategory) {
    userRequests[userId].category = selectedCategory.type;
    userRequests[userId].contact = selectedCategory.contact;
    bot.sendMessage(userId, "📞 Iltimos, telefon raqamingizni yuboring:", {
      reply_markup: {
        keyboard: [[{ text: "📲 Telefon raqamni yuborish", request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  if (msg.contact) {
    userRequests[userId].phone = msg.contact.phone_number;
    bot.sendMessage(userId, "📍 Iltimos, lokatsiyangizni yuboring:", {
      reply_markup: {
        keyboard: [[{ text: "📍 Lokatsiyani yuborish", request_location: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  if (msg.location) {
    userRequests[userId].location = msg.location;
    bot.sendMessage(userId, "✅ Lokatsiyangiz qabul qilindi. Endi muammo rasmini yuboring.");
    return;
  }

  if (msg.photo) {
    userRequests[userId].photo = msg.photo.pop().file_id;
    bot.sendMessage(userId, "✍️ Endi muammo haqida qisqacha yozing.");
    return;
  }

  if (userRequests[userId].photo) {
    userRequests[userId].text = text;
    const request = { ...userRequests[userId], userId, status: statuses.accepted };
    allRequests.push(request);
    bot.sendMessage(userId, "✅ Zayavka qabul qilindi!");

    bot.sendPhoto(GROUP_ID, request.photo, {
      caption: `📍 <b>Filial:</b> ${request.filial}\n` +
        `📌 <b>Kategoriya:</b> ${request.category}\n` +
        `📝 <b>Muammo:</b> ${request.text}\n` +
        `📞 <b>Bog'lanish:</b> <a href='${request.contact}'>Kontakt</a>\n` +
        `📱 <b>Telefon:</b> ${request.phone}\n` +
        `📍 <b>Lokatsiya:</b> <a href='https://maps.google.com/?q=${request.location.latitude},${request.location.longitude}'>Google Maps</a>` +
        `📊 <b>Status:</b> ${request.status}`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✔️ Бажарилди", callback_data: `complete_${userId}` }],
          [{ text: "❌ Рад этилган", callback_data: `reject_${userId}` }],
        ],
      },
    });

    delete userRequests[userId];
  }
});

console.log("🚀 Bot started successfully!");