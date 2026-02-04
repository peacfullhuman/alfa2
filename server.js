const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Парсинг данных формы
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

app.use(express.json());

// Подключаем статику
app.use(express.static('public'));

// Подключение к базе
const db = new sqlite3.Database('respons.db');

// Настройки против блокировок
db.exec("PRAGMA journal_mode = WAL;");
db.configure('busyTimeout', 5000);

app.post('/delete', (req, res) => {
  const { path: filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ success: false, message: 'Путь к файлу не указан' });
  }

  // Собираем полный путь (пример: если файлы в папке "public/files")
  const fullPath = path.join(__dirname, filePath);

  // Удаляем файл
  fs.unlink(fullPath, (err) => {
    if (err) {
      console.error('Ошибка удаления файла:', err);
      return res.status(500).json({ success: false, message: 'Не удалось удалить файл' });
    }
    res.json({ success: true, message: 'Файл успешно удалён' });
  });
});

// app.post('/delete-news', (req, res) => {
//   console.log('req.body:', req.body)
//   const { id } = req.body;

//   if (typeof id !== 'number' || id < 0) {
//     return res.status(400).json({ success: false, message: 'Неверный ID новости' });
//   }

//   const filePath = path.join(__dirname, 'data-news.json'); // или где хранятся новости

//   fs.readFile(filePath, 'utf8', (err, data) => {
//     if (err) {
//       console.error('Ошибка чтения файла:', err);
//       return res.status(500).json({ success: false, message: 'Не удалось прочитать данные' });
//     }

//     let newsList;
//     try {
//       newsList = JSON.parse(data);
//     } catch (e) {
//       return res.status(500).json({ success: false, message: 'Ошибка парсинга JSON' });
//     }

//     if (!newsList[id]) {
//       return res.status(404).json({ success: false, message: 'Новость не найдена' });
//     }

//     // Удаляем новость по индексу
//     newsList.splice(id, 1);

//     // Сохраняем обратно
//     fs.writeFile(filePath, JSON.stringify(newsList, null, 2), 'utf8', (err) => {
//       if (err) {
//         console.error('Ошибка записи:', err);
//         return res.status(500).json({ success: false, message: 'Не удалось сохранить' });
//       }
//       res.json({ success: true, message: 'Новость удалена' });
//     });
//   });
// });

app.post('/delete-news', (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID не указан' });
  }

  db.run('DELETE FROM news WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Ошибка БД:', err);
      return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Новость не найдена' });
    }
    res.json({ success: true, message: 'Новость удалена' });
  });
});

//ТАБЛИЦА НОВОСТЕЙ
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      preview TEXT NOT NULL,
      content TEXT NOT NULL,
      image TEXT NOT NULL,
      date TEXT NOT NULL
    )
  `);

  // Добавим две тестовые новости
  const stmt = db.prepare(`
    INSERT INTO news (title, preview, content, image, date) VALUES (?, ?, ?, ?, ?)
  `);

  // stmt.run("Открытие второго нового офиса", "Компания открыла новый офис в центре города.", "Мы рады сообщить, что с 15 октября наша компания запускает новый офис", "uploads/panels/img_1769288611786.jpg", "2024-11-18");
  // stmt.run("Новый продукт в продаже", "Выпущен инновационный гаджет нового поколения.", "Наша команда разработала устройство, которое меняет представление о повседневной технике...", "/img/news2.jpg", "10 октября 2024");

  stmt.finalize();
});

// Указываем EJS
app.set('view engine', 'ejs');
app.set('views', './views');

app.post('/add-news', (req, res) => {
  uploadMultiple(req, res, function (err) {
    if (err) {
      return res.status(500).send('Ошибка загрузки: ' + err.message);
    }

    const { title, preview, content, date } = req.body;
    const files = req.files;

    if (!title || !preview || !content || !files || files.length === 0 || !date) {
      return res.status(400).send('Все поля и хотя бы одно фото обязательны');
    }

    // Формируем пути: /uploads/news/имя_файла.jpg
    const imagePaths = files.map(file => `/uploads/news/${file.filename}`);
    const imagesJson = JSON.stringify(imagePaths); // сохраняем как JSON

    const sql = `INSERT INTO news (title, preview, content, image, date) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, preview, content, imagesJson, date], function (err) {
      if (err) {
        console.error('Ошибка БД:', err);
        return res.status(500).send('Не удалось сохранить новость');
      }

      res.send(`
        <h3>✅ Новость "${title}" добавлена с ${files.length} фото!</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${imagePaths.map(path => `
            <img src="${path}" alt="Фото" style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px;">
          `).join('')}
        </div><br>
        <a href="/admin">➕ Добавить ещё</a> | <a href="/">← Главная</a>
      `);
    });
  });
});


// Главная страница — все новости
app.get('/news', (req, res) => {
  db.all('SELECT id, title, preview, image, date FROM news ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Ошибка базы данных');
    }
    // Создаём объект вручную, чтобы избежать ошибок
    const newsData = {};

    rows.forEach(row => {
      newsData[row.id] = row;

    });
    res.render('news', { newsData })
  });
});


// Страница одной новости: /news/1
app.get('/new/:id', (req, res) => {
  const id = req.params.id;

  db.get('SELECT * FROM news WHERE id = ?', [id], (err, news) => {
    if (err) {
      return res.status(500).send('Ошибка базы данных');
    }
    if (news) {
      res.render('new', { news });
    } else {
      res.status(404).send('<h1>Новость не найдена</h1><a href="/">← Назад</a>');
    }
  });
});


// app.get('/new/:id', (req, res) => {
//   const id = req.params.id;
//   db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
//     if (err || !row) return res.status(404).send('Новость не найдена');

//     // Парсим JSON с фото
//     const images = JSON.parse(row.image || '[]');

//     res.render('full-news', { n: row, images });
//   });
// });

// Подключаем статику (CSS, изображения)
app.use(express.static('public'));



// Создаём таблицу respons (если нет)
db.run(`CREATE TABLE IF NOT EXISTS respons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  email TEXT,
  list TEXT,
  messages TEXT
)`);

// Создаём таблицу images
db.run(`CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class TEXT NOT NULL,
  url TEXT NOT NULL
)`);

// ПЕРЕХОЖУ НА СТРАНИЦЦУ ПО ИМЕНИ А НЕ ПО .HTML
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// app.get('/news', (req, res) => {
//   res.sendFile(__dirname + '/news.html');
// });



// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Получаем класс из формы
    const imgClass = req.body.class;

    // Формируем путь: uploads/hero/, uploads/icon/ и т.д.
    const dir = `uploads/${imgClass}`;

    // Создаём папку, если её нет
    const fs = require('fs');
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir); // указываем папку для сохранения
  },
  filename: (req, file, cb) => {
    // Уникальное имя файла
    const uniqueName = `img_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });
const uploadMultiple = upload.array('images', 10); // для множественной загрузки

// Обработка загрузки
app.post('/upload-image', upload.single('image'), (req, res) => {
  const { class: imgClass } = req.body;
  const filename = req.file.filename;
  const url = `/uploads/${imgClass}/${filename}`; // ← путь с подпапкой

  // Сохраняем в базу
  const stmt = db.prepare("INSERT INTO images (class, url) VALUES (?, ?)");
  stmt.run(imgClass, url, function (err) {
    if (err) {
      return res.send(`❌ Ошибка: ${err.message}`);
    }
    
  });
  stmt.finalize();
});

// Получить картинку по классу
app.get('/image/:class', (req, res) => {
  const { class: imgClass } = req.params;
  db.get("SELECT url FROM images WHERE class = ? ORDER BY id DESC LIMIT 1", [imgClass], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Картинка не найдена' });
    }
    res.json(row); // { "url": "/uploads/hero_123.jpg" }
  });
});

// Раздаём файлы из папки uploads
app.use('/uploads', express.static('uploads'));

app.get('/data', (req, res) => {
  db.all("SELECT * FROM respons", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows); // вернёт массив объектов
  });
});

// Обработка формы ОТПРАВКА С ФОРМЫ НА СЕРВЕР

app.post('/save', (req, res) => {
    const { name, phone, email, list, messages } = req.body;


    const stmt = db.prepare("INSERT INTO respons (name, phone, email, list, messages) VALUES (?, ?, ?, ?, ?)");
    stmt.run(name, phone, email, list, messages, function (err) {
        if (err) {
        return res.send(`❌ Ошибка: ${err.message}`);
        }
    });
    stmt.finalize(); // ← обязательно!
});

// Функция: рекурсивно читает все файлы из папки и подпапок
function readFilesRecursive(folderPath, root = folderPath) {
  let filesList = [];
  const items = fs.readdirSync(folderPath, { withFileTypes: true });

  items.forEach(item => {
    const itemPath = path.join(folderPath, item.name);

    if (item.isDirectory()) {
      // Рекурсия по подпапкам
      filesList = filesList.concat(readFilesRecursive(itemPath, root));
    } else {
      // Это файл — проверим, изображение ли
      const ext = path.extname(item.name).toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      if (allowed.includes(ext)) {
        // Относительный путь от корня uploads
        const relativePath = path.relative(root, itemPath).replace(/\\/g, '/');
        filesList.push(`/uploads/${relativePath}`);
      }
    }
  });
  return filesList;
}

app.get('/files', (req, res) => {
  try {
    const files = readFilesRecursive('uploads');
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось прочитать папку: ' + err.message });
  }
});

app.get('/data-news', (req, res) => {
  db.all('SELECT * FROM news', [], (err, rows) => {
    if (err){
      return res.status(500).json({ error: err.message});
    }
    const newList = rows
    res.json(rows)
  })
})

// app.post('/delete', (req, res) => {
//     const { path: filePath } = req.body;
//     if (!filePath) {
//         return res.json({ success: false, message: 'Путь не указан' });
//     }

//     const fullPath = path.join(__dirname, filePath); // или путь к папке с файлами

//     fs.unlink(fullPath, err => {
//         if (err) {
//             console.error('Ошибка удаления:', err);
//             return res.json({ success: false, message: 'Не удалось удалить файл' });
//         }
//         res.json({ success: true, message: 'Файл удалён' });
//     });
// });

// ОТПРАВКА С ФОРМЫ НА СЕРВЕР
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`👉 Загрузка: http://localhost:${PORT}/upload`);
});

