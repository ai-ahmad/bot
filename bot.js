require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const ExcelJS = require("exceljs");

const TOKEN = "7390473104:AAE27j-Nofeu3n2AnzMYLF-Z8FEplCdIKPo";
const GROUP_ID = -1002466999228;

const bot = new TelegramBot(TOKEN, { polling: true });

let userRequests = {}; // Temporary storage for user data
let allRequests = []; // Storage for all requests

// Updated branches list
const branches = [
  "T001 Глазной",
  "T002 Охунбобоев",
  "T003 Yunusobod",
  "T005 Ташми",
  "T007 Кораташ",
  "T009 Сергели Корзинка",
  "T010 Куйлик",
  "T012 Бодомзор",
  "T015 Лабзак",
  "T016 Чимган",
  "T018 Кукча",
  "T020 Сергели Дустлик",
  "T024 16 Гор. боль.",
  "T027 Алайский",
  "T028 Глинка макро",
  "T029 Такачи",
  "T030 Фаргона Макро",
  "T032 Бибигон",
  "T034 Самарканд дарвоза РОВД",
  "T036 Жуковский Неотложка",
  "T037 Юнусобод (Биллур)",
  "T040 Шахристанский",
  "T045 Кушбеги (Хавас)",
  "T046 Фархадский",
  "T047 Юнусобод (Хавас) 17кв",
  "T048 ТТЗ Акушерство Гинекологии",
  "T049 Водник Корзинка",
  "T050 Юнусобод Уста Ширин",
  "T051 Ангрен",
  "T053 Бекобод",
  "T055 Юнусобод 7 кв",
  "T056 Мирзо Улугбек (налоговый)",
  "T057 Янги Ташми (Роддом)",
  "T059 Бекобод (2)",
  "T060 Универсам Юнусобод",
  "T061 Ганга Хадра Маркет",
  "T062 Онкология",
  "T064 Янги Йул",
  "T065 Максим Горький",
  "T066 Тапоич Больница",
  "T067 Солдатский",
  "T068 Янги Тошми Куксарой",
  "T069 1 Гор. Больница (Роддом)",
  "T070 Чилонзор Гагарин",
  "T071 Фархадский Базар Макро",
  "T072 Кадышева Базар",
  "T073 Куйлик 29-поликлиника",
  "T074 ТТЗ Базар банк",
  "T075 Кадишева перекресток",
  "T076 Чирчик Макро",
  "T078 Сергели Янги хает",
  "T079 Куйлик 2-поликлиника",
  "T081 Рисовый Роддом",
  "T082 Максим Горький метро",
  "T084 Сампи Скрининг центр",
  "T085 ТТЗ Навруз Бозор конечка",
  "T086 Ц5 Корзинка",
  "T087 Шухрат Корзинка",
  "T089 Чирчик Макро Клиника",
  "T006 Сергели спутник",
  "T090 Тансикбоев кора/камиш",
  "T091 Куйлик Мост",
  "T092 Янги йуль 2 астанофка",
  "T093 Чиланзор 21 кв",
  "T094 Янги йуль раддом",
  "T095 Чирчик 9 мактаб",
  "T096 Пскент",
  "T097 Солдацкий 2",
  "T098 Келес куктерак",
  "T099 Беруни (эко бозор)",
  "T102 Транспортный",
  "T103 Охунбобоев 2",
  "T104 Дубовский",
  "T105 Чиноз",
  "T106 Чирчик (октябрьский бозор)",
  "T107 медгарадок",
  "T108 Кадишева Конечка (хавас)",
  "T109 Фархадский автозапчасти",
  "T111 Чилонзор 23 кв (7777)",
  "T113 Янгиобод (карзинка)",
  "T114 Лисунова (хавас)",
  "T115 Рисовый Махалла",
  "T116 Юнусобод Мега",
  "T117 Хасанбой Абдурахмон",
  "T118 Ташмори бозор",
  "T119 Водник 2",
  "T120 Янги обод",
  "T121 Янги обод 2",
  "T122 Жума бозор",
  "T123 Гулистон",
  "T124 Ғунча",
  "T125 Паркент",
  "T126 Сергили карзинка",
  "T127 Корокамиш 1/2 бозор",
  "T128 Келес бозор",
];

const categories = [
  "мебел ишлари",
  "электрика ишлари",
  "терминал",
  "сантехник ишлари",
  "прочее",
  "офис билан алока",
];

const statuses = {
  accepted: "✅ Заявка қабул қилинди",
  completed: "✔️ Заявка бажарилди",
  rejected: "❌ Рад этилган",
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Salom! Siz muammo joylashgan filialni tanlang:", {
    reply_markup: {
      keyboard: branches.map((b) => [b]),
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

bot.on("message", (msg) => {
  const userId = msg.chat.id;
  const text = msg.text;

  if (branches.includes(text)) {
    userRequests[userId] = { filial: text };
    bot.sendMessage(userId, "Muammo kategoriyasini tanlang:", {
      reply_markup: {
        keyboard: categories.map((c) => [c]),
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

  // If user has provided all required data (filial, category, photo), the next text is the problem description
  if (userRequests[userId] && userRequests[userId].photo) {
    userRequests[userId].text = text;
    const { filial, category, photo } = userRequests[userId];
    const request = {
      userId,
      filial,
      category,
      text,
      photo,
      status: statuses.accepted,
    };
    allRequests.push(request);

    bot.sendMessage(userId, "✅ Zayavka qabul qilindi!");
    bot.sendPhoto(GROUP_ID, photo, {
      caption: `📍 *Filial:* ${filial}\n📌 *Kategoriya:* ${category}\n📝 *Muammo:* ${text}\n\n📊 *Status:* ${statuses.accepted}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✔️ Бажарилди", callback_data: `complete_${userId}` },
            { text: "❌ Рад этилган", callback_data: `reject_${userId}` },
          ],
        ],
      },
    });
    delete userRequests[userId];
  }
});

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
    const userId = data.split("_")[1];

    // Update the request status in allRequests array
    allRequests = allRequests.map((req) =>
      req.userId == userId ? { ...req, status: newStatus } : req
    );

    const newCaption = msg.caption.replace(
      /📊 \*Status:\* .*/,
      `📊 *Status:* ${newStatus}`
    );

    await bot.editMessageCaption(newCaption, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [] },
    });
  }
});

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
  ];

  allRequests.forEach((req) => worksheet.addRow(req));

  const filePath = "requests.xlsx";
  await workbook.xlsx.writeFile(filePath);

  bot.sendDocument(chatId, filePath, { caption: "📄 Excel fayli tayyor!" }).then(
    () => {
      fs.unlinkSync(filePath);
    }
  );
});

console.log("Bot ishga tushdi...");
