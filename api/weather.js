// Серверная функция Vercel. Выполняется НА СЕРВЕРЕ — ключ в браузер не попадает.
// Ключ берётся из переменной окружения OPENWEATHER_API_KEY (задаётся в настройках Vercel).

export default async function handler(req, res) {
  const city = (req.query.city || '').toString().trim();

  if (!city) {
    return res.status(400).json({ error: 'Укажите название города.' });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    // Ключ не настроен на сервере — сообщаем нейтрально, без деталей.
    return res.status(500).json({ error: 'Сервис временно недоступен. Попробуйте позже.' });
  }

  const url = 'https://api.openweathermap.org/data/2.5/weather'
    + '?q=' + encodeURIComponent(city)
    + '&units=metric&lang=ru&appid=' + apiKey;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return res.status(404).json({ error: 'Город не найден. Проверьте название.' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.status(502).json({ error: 'Сервис временно недоступен. Попробуйте позже.' });
    }
    if (response.status === 429) {
      return res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
    }
    if (!response.ok) {
      return res.status(502).json({ error: 'Погодный сервис не отвечает. Попробуйте позже.' });
    }

    const d = await response.json();

    // Кэш на 5 минут — меньше запросов к API и быстрее ответ.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      city: d.name,
      country: d.sys && d.sys.country ? d.sys.country : '',
      temp: d.main.temp,
      feelsLike: d.main.feels_like,
      humidity: d.main.humidity,
      wind: d.wind ? d.wind.speed : 0,
      description: d.weather[0].description,
      icon: d.weather[0].icon,
    });
  } catch (e) {
    return res.status(502).json({ error: 'Не удалось получить данные о погоде.' });
  }
}
