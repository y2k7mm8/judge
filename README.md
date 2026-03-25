# ⚡ Judge

Трекинг позы для спорта

---

## 🚀 Быстрый запуск

### Python (самый простой)
```
python -m http.server 8080
```
→ Открыть: http://localhost:8080

### Node.js
```
npx serve .
```

### VS Code
Расширение **Live Server** → правой кнопкой на index.html → Open with Live Server



## 🗂️ Структура

```
ai-judge-v2/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js          — точка входа
│   ├── pose-tracker.js  — ядро трекинга
│   ├── skeleton.js      — реалистичный скелет
│   ├── zones.js         — зоны с детектом ударов
│   ├── face-tracker.js  — трекинг лица + позиция
│   ├── recorder.js      — запись движений
│   ├── scoring.js       — система очков
│   └── ui.js            — интерфейс
└── README.md
```

---

## 📊 Формат экспорта JSON

```json
{
  "meta": {
    "version": "2.0",
    "exportTime": "2025-01-01T12:00:00.000Z",
    "duration": 15000,
    "frameCount": 450,
    "eventCount": 12
  },
  "events": [
    { "t": 1200, "type": "hit", "label": "УДАР В ГОЛОВУ", "points": 10, "combo": 1 }
  ],
  "frames": [
    {
      "t": 0,
      "score": 0,
      "keypoints": [{ "x": 320, "y": 120, "s": 0.95 }],
      "face": { "position": "ЦЕНТР", "distance": "НОРМА", "x": 320, "y": 150 },
      "hits": { "head": false, "body": false }
    }
  ]
}
```

---

## 💡 Советы

- Хорошее освещение = точный трекинг
- Всё тело в кадре для лучшего результата
- Лицо должно быть хорошо видно для позиционирования
- Chrome показывает лучшие результаты
