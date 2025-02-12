require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = "7390473104:AAGWv9GHBG_ki9RaYJVySF0gHTGlx2DklmM";
const GROUP_ID = -1002466999228;

const bot = new TelegramBot(TOKEN, { polling: true });

let userRequests = {}; // Temporary storage for user data

// Full list of branches (94 branches)
const branches = [
  "Охунбобоев", "Yunusobod", "Ташми", "Кораташ", "Сергели Корзинка", "Куйлик", "Бодомзор", "Лабзак", "Чимган", "Кукча",
  "Сергели Дустлик", "16 Гор. боль.", "Алайский", "Глинка макро", "Такачи", "Фаргона Макро", "Бибигон", "Самарканд дарвоза РОВД",
  "Жуковский Неотложка", "Юнусобод (Биллур)", "Шахристанский", "Кушбеги (Хавас)", "Фархадский", "Юнусобод (Хавас) 17кв",
  "ТТЗ Акушерство Гинекологии", "Водник Корзинка", "Юнусобод Уста Ширин", "Ангрен", "Бекобод", "Юнусобод 7 кв",
  "Мирзо Улугбек (налоговый)", "Янги Ташми (Роддом)", "Бекобод (2)", "Универсам Юнусобод", "Ганга Хадра Маркет", "Онкология",
  "Янги Йул", "Максим Горький", "Тапоич Больница", "Солдатский", "Янги Тошми Куксарой", "1 Гор. Больница (Роддом)",
  "Чилонзор Гагарин", "Фархадский Базар Макро", "Кадышева Базар", "Куйлик 29-поликлиника", "ТТЗ Базар банк", "Кадишева перекресток",
  "Чирчик Макро", "Сергели Янги хает", "Куйлик 2-поликлиника", "Рисовый Роддом", "Максим Горький метро", "Сампи Скрининг центр",
  "ТТЗ Навруз Бозор конечка", "Ц5 Корзинка", "Шухрат Корзинка", "Чирчик Макро Клиника", "Сергели спутник", "Тансикбоев кора/камиш",
  "Куйлик Мост", "Янги йуль 2 астанофка", "Чиланзор 21 кв", "Янги йуль раддом", "Чирчик 9 мактаб", "Пскент", "Солдацкий 2",
  "Келес куктерак", "Беруни (эко бозор)", "Транспортный", "Охунбобоев 2", "Дубовский", "Чиноз", "Чирчик (октябрьский бозор)",
  "медгарадок", "Кадишева Конечка (хавас)", "Фархадский автозапчасти", "Чилонзор 23 кв (7777)", "Янгиобод (карзинка)",
  "Лисунова (хавас)", "Рисовый Махалла", "Юнусобод Мега", "Хасанбой Абдурахмон", "Ташмори бозор", "Водник 2", "Янги обод",
  "Янги обод 2", "Жума бозор", "Гулистон", "Ғунча", "Паркент", "Сергили карзинка", "Корокамиш 1/2 бозор", "Келес бозор"
];

// Problem categories
const categories = [
  "мебел ишлари", "электрика ишлари", "терминал",
  "сантехник ишлари", "прочее", "офис билан алока"
];

// Request statuses
const statuses = {
  accepted: "✅ Заявка қабул қилинди",
  completed: "✔️ Заявка бажарилди",
  rejected: "❌ Рад этилган"
};

// /start command handler
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

// Branch and category selection handler
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

// Callback query handler for group buttons
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

    const captionLines = msg.caption.split("\n");
    const filial = captionLines[0].replace("📍 *Filial:* ", "");
    const category = captionLines[1].replace("📌 *Kategoriya:* ", "");
    const issueText = captionLines[2].replace("📝 *Muammo:* ", "");

    const newCaption = msg.caption.replace(/📊 \*Status:\* .*/, `📊 *Status:* ${newStatus}`);

    await bot.editMessageCaption(newCaption, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [] },
    });

    bot.sendPhoto(userId, msg.photo[msg.photo.length - 1].file_id, {
      caption: `📍 *Filial:* ${filial}\n📌 *Kategoriya:* ${category}\n📝 *Muammo:* ${issueText}\n\n📊 *Status:* ${newStatus}`,
      parse_mode: "Markdown",
    });
  }
});

console.log("Bot ishga tushdi...");
