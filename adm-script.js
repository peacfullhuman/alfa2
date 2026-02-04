const btns = document.getElementsByClassName('open-btn')



function showBlock(id) {
    closeAllBlocks();
    document.getElementsByClassName(`${id}-btn`)[0].classList.add('active')
    document.getElementById(id).classList.add('active');
}

function closeAllBlocks() {

    document.querySelectorAll('.open-btn').forEach(b => {
        b.classList.remove('active')
    })

    document.querySelectorAll('.fullscreen-block').forEach(b => {
        b.classList.remove('active');
    });
}
const CORRECT_PASSWORD = '12345';

function checkPassword() {
    const input = document.getElementById('pass');
    const password = input.value;

    if (password === CORRECT_PASSWORD) {
      // Скрываем окно
        document.getElementById('passwordOverlay').style.display = 'none';
      // Можно сохранить факт входа в localStorage
        // localStorage.setItem('auth', 'true');
    } else {
        alert('❌ Неверный пароль');
        input.value = ''; // очищаем
        input.focus();
    }
}

  // При загрузке страницы — проверим, был ли уже ввод пароля
window.addEventListener('load', () => {
    if (localStorage.getItem('auth') === 'true') {
        document.getElementById('passwordOverlay').style.display = 'none';
    }
});

    // Загружаем данные с сервера
fetch('/data?t=' + Date.now())
    .then(response => response.json())
    .then(data => {
    const tbody = document.querySelector('#data-table tbody');
        
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Нет данных</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.name || ''}</td>
            <td>${row.phone || ''}</td>
            <td>${row.email || ''}</td>
            <td>${row.list || ''}</td>
            <td>${row.messages || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error('Ошибка загрузки данных:', err);
        tbody.innerHTML = '<tr><td colspan="6">❌ Ошибка: не удалось загрузить данные</td></tr>';
    });


fetch('/files')
    .then(response => response.json())
    .then(files => {
        const container = document.getElementById('file-list');

        if (files.length === 0) {
            container.innerHTML = '<p>Нет картинок</p>';
            return;
        }

        // Группировка по папкам
        const grouped = {};
        files.forEach(file => {
            const folder = file.split('/').slice(2, -1).join('/') || 'корень';
            if (!grouped[folder]) grouped[folder] = [];
            grouped[folder].push(file);
        });

      // Создаём HTML
        let html = '';
        for (const [folder, imgs] of Object.entries(grouped)) {
            html += `<h3>📁 ${folder || 'корень'}</h3>`;
            html += `<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">`;

            imgs.forEach(img => {
                const filename = img.split('/').pop();
                html += `
                <div style="text-align: center; max-width: 150px; position: relative;">
                    <img src="${img}" width="120" alt="${filename}" style="border-radius: 6px; transition: filter 0.2s;">
                    
                    <!-- Кнопка удаления -->
                    <button 
                        class="delete-img-btn" 
                        data-path="${img}"
                        style="
                            position: absolute; 
                            top: 5px; 
                            right: 5px; 
                            background: #ff3333; 
                            color: white; 
                            border: none; 
                            width: 20px; 
                            height: 20px; 
                            border-radius: 50%; 
                            font-size: 12px; 
                            cursor: pointer;
                            
                            transition: opacity 0.2s;
                        "
                        title="Удалить фото">
                        ✕
                    </button>
                    
                    <div style="font-size: 0.8em; color: #555; margin-top: 4px; word-break: break-word;">${filename}</div>
                </div>
                `;
            });


            html += `</div>`;
        }

        container.innerHTML = html;

        // Добавляем обработчики для всех кнопок удаления
        container.querySelectorAll('.delete-img-btn').forEach(button => {
            const imgPath = button.dataset.path;

            // Показывать кнопку при наведении на карточку
            const card = button.parentElement;
            // card.addEventListener('mouseenter', () => button.style.opacity = '1');
            // card.addEventListener('mouseleave', () => button.style.opacity = '0');

            // Клик по кнопке удаления
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!confirm(`Удалить фото "${imgPath.split('/').pop()}"?`)) return;

                fetch('/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: imgPath })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Плавное удаление
                        const card = button.closest('div[style*="text-align: center"]');
                        card.style.transition = 'opacity 0.3s';
                        card.style.opacity = '0';
                        setTimeout(() => card.remove(), 300);

                        // Если в папке больше нет фото — можно удалить и заголовок, но это опционально
                        alert('Фото удалено');
                    } else {
                        alert('Ошибка: ' + data.message);
                    }
                })
                .catch(err => {
                    console.error('Ошибка:', err);
                    alert('Не удалось удалить файл');
                });
            });
        });

    })
    .catch(err => {
        console.error('Ошибка:', err);
        container.innerHTML = '<p>❌ Не удалось загрузить файлы</p>';
    });

// список всех новостей
fetch('/data-news')
  .then(response => response.json())
  .then(newsList => {
    console.log(123)
    const container = document.querySelector('.news-list');

    for (let n = Object.keys(newsList).length-1; n >= 0; n--){
      const newsItem = document.createElement('div');
      newsItem.classList.add('new-adm');


        newsItem.innerHTML = `
        <div class="new-title-adm">
            <h3>${newsList[n].title}</h3>
            <button 
            class="delete-news-btn" 
            data-id="${newsList[n]._id || newsList[n].id}"
            data-title="${newsList[n].title}"
            style="background: #ff3333; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            &times; Удалить
            </button>
        </div>
        `;

        container.appendChild(newsItem);

      // Находим кнопку внутри только что добавленного элемента
        const deleteBtn = newsItem.querySelector('.delete-news-btn');

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Читаем данные прямо из кнопки
            const newsId = deleteBtn.dataset.id;
            const title = deleteBtn.dataset.title;

            if (!confirm(`Удалить новость: "${title}"?`)) return;

            fetch('/delete-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newsId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                newsItem.style.opacity = '0';
                setTimeout(() => newsItem.remove(), 300);
                alert('Новость удалена');
                } else {
                alert('Ошибка: ' + data.message);
                }
            })
            .catch(err => {
                console.error('Ошибка:', err);
                alert('Не удалось удалить');
            });
        });

    }

  })
  .catch(err => {
    console.error('Ошибка:', err);
    document.querySelector('.news-list').innerHTML = '<p>Не удалось загрузить новости</p>';
});



app.post('/add-news', (req, res) => {
  const { title, preview, content, image, date } = req.body;

  // Валидация (на всякий случай)
  if (!title || !preview || !content || !image || !date) {
    return res.status(400).send('Все поля обязательны');
  }

  // Добавляем в базу
  const sql = `INSERT INTO news (title, preview, content, image, date) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(sql, [title, preview, content, image, date], function (err) {
    if (err) {
      console.error('Ошибка при добавлении:', err);
      return res.status(500).send('Ошибка базы данных');
    }

    // Успешно добавлено
    console.log(`✅ Новость добавлена с ID: ${this.lastID}`);
    res.send(`
      <h3>✅ Новость "${title}" успешно добавлена!</h3>
      <a href="/news">← Вернуться к новостям</a><br>
      <a href="/admin">➕ Добавить ещё</a>
    `);
  });
});

