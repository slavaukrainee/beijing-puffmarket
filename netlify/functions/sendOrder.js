export default async (req) => {
  // Получаем данные из запроса от сайта
  const body = await req.json();
  
  // Отправляем запрос в PuzzleBot
  const response = await fetch('https://api.puzzlebot.top/api/v1/telegram/sendMessage', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer 8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ' 
    },
    body: JSON.stringify({
      chat_id: body.chat_id,
      text: body.text
    })
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), { 
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
};