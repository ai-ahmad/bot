require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = "7390473104:AAG8c9h9UTnmaxw5SuvXPOMEJU0tS_WDTyo";
const GROUP_ID = -1002466999228;

const bot = new TelegramBot(TOKEN, { polling: true });

let userRequests = {}; // Временное хранилище данных пользователей

// Полный список филиалов (94 филиала)
const branches = [
  "Охунбобоев", "Yunusobod", "Ташми", "Кораташ", "Сергели Корзинка", "Куйлик",
  "Бодомзор", "Лабзак", "Чимган", "Кукча", "Филиал 11", "Филиал 12", "Филиал 13",
  "Филиал 14", "Филиал 15", "Филиал 16", "Филиал 17", "Филиал 18", "Филиал 19",
  "Филиал 20", "Филиал 21", "Филиал 22", "Филиал 23", "Филиал 24", "Филиал 25",
  "Филиал 26", "Филиал 27", "Филиал 28", "Филиал 29", "Филиал 30",
];

// Категории проблем
const categories = [
  "мебел ишлари", "электрика ишлари", "терминал",
  "сантехник ишлари", "прочее", "офис билан алока"
];

// Статусы заявки
const statuses = {
  accepted: "✅ Заявка қабул қилинди",
  completed: "✔️ Заявка бажарилди",
  rejected: "❌ Рад этилган"
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Salom! Siz muammo joylashgan filialni tanlang:", {
    reply_markup: {
      keyboard: branches.map((branch) => [branch]),
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// Обработчик выбора филиала
bot.on("message", (msg) => {
  const userId = msg.chat.id;
  const text = msg.text;

  if (branches.includes(text)) {
    userRequests[userId] = { filial: text };

    bot.sendMessage(userId, "Muammo kategoriyasini tanlang:", {
      reply_markup: {
        keyboard: categories.map((category) => [category]),
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });

    return;
  }

  if (categories.includes(text) && userRequests[userId]) {
    userRequests[userId].category = text;
    bot.sendMessage(userId, "Iltimos, muammo rasmini yuboring.");
    return;
  }

  if (msg.photo) {
    if (!userRequests[userId] || !userRequests[userId].category) {
      return bot.sendMessage(userId, "Avval filial va kategoriya tanlang!");
    }

    const fileId = msg.photo.pop().file_id;
    userRequests[userId].photo = fileId;
    bot.sendMessage(userId, "Endi muammo haqida qisqacha yozing.");
    return;
  }

  if (userRequests[userId] && userRequests[userId].photo) {
    userRequests[userId].text = text;
    const { filial, category, photo } = userRequests[userId];

    bot.sendMessage(userId, "✅ Zayavka qabul qilindi! Ma’lumot yuborilmoqda...");

    bot.sendPhoto(GROUP_ID, photo, {
      caption: `📍 *Filial:* ${filial}\n📌 *Kategoriya:* ${category}\n📝 *Muammo:* ${text}\n\n📊 *Status:* ${statuses.accepted}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✔️ Бажарилди", callback_data: `complete_${userId}` }],
          [{ text: "❌ Рад этилган", callback_data: `reject_${userId}` }]
        ],
      },
    });

    delete userRequests[userId];
  }
});

bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = msg.chat.id; // Это chatId группы
  const messageId = msg.message_id; // Это messageId сообщения в группе

  let newStatus;
  if (data.startsWith("complete_")) {
    newStatus = statuses.completed;
  } else if (data.startsWith("reject_")) {
    newStatus = statuses.rejected;
  }

  if (newStatus) {
    const newCaption = msg.caption.replace(/📊 \*Status:\* .*/, `📊 *Status:* ${newStatus}`);
    
    // Обновляем статус в группе
    bot.editMessageCaption(newCaption, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: msg.reply_markup,
    });

    // Отправляем уведомление пользователю
    const userId = data.split("_")[1]; // Получаем userId из callback_data
    bot.sendMessage(userId, `🔄 Ваша заявка была обновлена: ${newStatus}`);
  }
});

console.log("Bot ishga tushdi...");