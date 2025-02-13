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
let allRequests = [];

// Функция для форматирования даты в европейском формате: dd.mm.yyyy hh:mm:ss
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

// Команда /start – выбор филиала
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

// Основной обработчик сообщений пользователя
bot.on("message", async (msg) => {
  const userId = msg.chat.id;
  const text = msg.text;

  // Если пользователь ещё не начал – создаём объект состояния
  if (!userRequests[userId]) {
    userRequests[userId] = {};
  }

  // 1. Выбор филиала
  if (!userRequests[userId].filial && branches.includes(text)) {
    userRequests[userId].filial = text;
    bot.sendMessage(userId, "📌 Iltimos, muammo kategoriyasini tanlang:", {
      reply_markup: {
        keyboard: categories.map((c) => [c.type]),
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  // 2. Выбор категории
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

  // 3. Получение контакта
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

  // 4. Получение локации
  if (msg.location) {
    userRequests[userId].location = msg.location;
    // Если в объекте локации есть адрес (например, при отправке места), используем его,
    // иначе формируем адрес из координат.
    userRequests[userId].address =
      msg.location.address || `${msg.location.latitude}, ${msg.location.longitude}`;
    bot.sendMessage(userId, "✅ Lokatsiyangiz qabul qilindi. Endi muammo rasmini yuboring.");
    return;
  }

  // 5. Получение фотографии проблемы
  if (msg.photo) {
    if (!userRequests[userId] || !userRequests[userId].category) {
      return bot.sendMessage(userId, "Avval filial va kategoriya tanlang!");
    }
    // Берём последнюю (наилучшую по качеству) фотографию
    const photoFileId = msg.photo[msg.photo.length - 1].file_id;
    userRequests[userId].photo = photoFileId;
    bot.sendMessage(userId, "✍️ Endi muammo haqida qisqacha yozing.");
    return;
  }

  // 6. Получение описания проблемы (текст) после фотографии
  if (userRequests[userId].photo && !userRequests[userId].text) {
    userRequests[userId].text = text;
    // Сохраняем время создания заявки и присваиваем уникальный ID
    userRequests[userId].createdAt = new Date();
    userRequests[userId].id = Date.now().toString(); // уникальный идентификатор

    // Формируем объект заявки
    const request = { ...userRequests[userId], userId, status: statuses.accepted };
    // Если по какой-то причине адрес не был сохранён, формируем его из координат
    if (request.location && !request.address) {
      request.address = `${request.location.latitude}, ${request.location.longitude}`;
    }
    allRequests.push(request);

    bot.sendMessage(userId, "✅ Zayavka qabul qilindi!");

    // Отправляем заявку в группу с inline-кнопками для изменения статуса.
    // Здесь callback_data содержит уникальный id заявки.
    bot.sendPhoto(GROUP_ID, request.photo, {
      caption:
        `📍 <b>Filial:</b> ${request.filial}\n` +
        `📌 <b>Kategoriya:</b> ${request.category}\n` +
        `📝 <b>Muammo:</b> ${request.text}\n` +
        `📞 <b>Bog'lanish:</b> <a href='${request.contact}'>Kontakt</a>\n` +
        `📱 <b>Telefon:</b> ${request.phone}\n` +
        `📍 <b>Lokatsiya:</b> <a href='https://maps.google.com/?q=${request.location.latitude},${request.location.longitude}'>Google Maps</a>\n` +
        `📊 <b>Status:</b> ${request.status}\n` +
        `🕒 <b>Zayavka vaqti:</b> ${formatDate(request.createdAt)}`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✔️ Бажарилди", callback_data: `complete_${request.id}` }],
          [{ text: "❌ Рад этилган", callback_data: `reject_${request.id}` }],
        ],
      },
    });

    // Очищаем временные данные пользователя
    delete userRequests[userId];
    return;
  }
});

// Обработчик inline-кнопок (смена статуса заявки)
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  let newStatus;
  if (data.startsWith("complete_")) {
    newStatus = statuses.completed;
  } else if (data.startsWith("reject_")) {
    newStatus = statuses.rejected;
  }

  if (newStatus) {
    const requestId = data.split("_")[1];
    // Находим заявку по уникальному id
    const req = allRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = newStatus;
      // Сохраняем время обработки заявки
      req.fixedAt = new Date();

      const updatedMessage =
        `📊 Sizning zayavkangizning yangi statusi: ${req.status}\n\n` +
        `📍 <b>Filial:</b> ${req.filial}\n` +
        `📌 <b>Kategoriya:</b> ${req.category}\n` +
        `📝 <b>Muammo:</b> ${req.text}\n` +
        `📞 <b>Bog'lanish:</b> <a href='${req.contact}'>Kontakt</a>\n` +
        `📱 <b>Telefon:</b> ${req.phone}\n` +
        `📍 <b>Lokatsiya:</b> <a href='https://maps.google.com/?q=${req.location.latitude},${req.location.longitude}'>Google Maps</a>\n` +
        `🕒 <b>Zayavka vaqti:</b> ${formatDate(req.createdAt)}\n` +
        `⏱ <b>Tugatildi vaqti:</b> ${formatDate(req.fixedAt)}`;

      bot.sendMessage(req.userId, updatedMessage, { parse_mode: "HTML" });

      // Обновляем подпись (caption) сообщения в группе
      let newCaption = msg.caption.replace(
        /📊 <b>Status:<\/b> .*\n/,
        `📊 <b>Status:</b> ${req.status}\n`
      );
      if (!/⏱ <b>Tugatildi vaqti:<\/b>/.test(newCaption)) {
        newCaption += `⏱ <b>Tugatildi vaqti:</b> ${formatDate(req.fixedAt)}`;
      } else {
        newCaption = newCaption.replace(
          /⏱ <b>Tugatildi vaqti:<\/b> .*/,
          `⏱ <b>Tugatildi vaqti:</b> ${formatDate(req.fixedAt)}`
        );
      }

      try {
        await bot.editMessageCaption(newCaption, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });
      } catch (error) {
        console.error("Failed to edit message caption:", error);
      }
    }
  }
});

// Команда /exel – экспорт всех заявок в Excel.
// В файле будут присутствовать все заявки (как ранее, так и последующие).
bot.onText(/\/exel/, async (msg) => {
  const chatId = msg.chat.id;
  if (allRequests.length === 0) {
    return bot.sendMessage(chatId, "Hali hech qanday zayavka yo'q.");
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Requests");

  worksheet.columns = [
    { header: "User ID", key: "userId", width: 15 },
    { header: "Filial", key: "filial", width: 30 },
    { header: "Kategoriya", key: "category", width: 20 },
    { header: "Muammo", key: "text", width: 40 },
    { header: "Status", key: "status", width: 20 },
    { header: "Zayavka Sana", key: "createdDate", width: 15 },
    { header: "Zayavka Vaqti", key: "createdTime", width: 15 },
    { header: "Manzil", key: "address", width: 30 },
    { header: "Tugatildi Vaqti", key: "fixedAt", width: 20 },
  ];

  allRequests.forEach((req) => {
    const createdAt = new Date(req.createdAt);
    const createdDate = `${String(createdAt.getDate()).padStart(2, "0")}.${String(
      createdAt.getMonth() + 1
    ).padStart(2, "0")}.${createdAt.getFullYear()}`;
    const createdTime = `${String(createdAt.getHours()).padStart(2, "0")}:${String(
      createdAt.getMinutes()
    ).padStart(2, "0")}:${String(createdAt.getSeconds()).padStart(2, "0")}`;

    let fixedAtFormatted = "";
    if (req.fixedAt) {
      const fixedAt = new Date(req.fixedAt);
      fixedAtFormatted = `${String(fixedAt.getDate()).padStart(2, "0")}.${String(
        fixedAt.getMonth() + 1
      ).padStart(2, "0")}.${fixedAt.getFullYear()} ${String(fixedAt.getHours()).padStart(
        2,
        "0"
      )}:${String(fixedAt.getMinutes()).padStart(2, "0")}:${String(fixedAt.getSeconds()).padStart(2, "0")}`;
    }

    worksheet.addRow({
      userId: req.userId,
      filial: req.filial,
      category: req.category,
      text: req.text,
      status: req.status,
      createdDate: createdDate,
      createdTime: createdTime,
      address: req.address || "",
      fixedAt: fixedAtFormatted,
    });
  });

  const filePath = "requests.xlsx";
  await workbook.xlsx.writeFile(filePath);

  bot.sendDocument(chatId, filePath, { caption: "📄 Excel fayli tayyor!" })
    .then(() => {
      fs.unlinkSync(filePath);
    });
});

console.log("🚀 Bot started successfully!");
