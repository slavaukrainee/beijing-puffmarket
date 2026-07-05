// netlify/functions/sendorder.js
// Серверная функция для обхода CORS: принимает заказ с фронтенда
// и пересылает его в Puzzlebot API.

const PUZZLEBOT_TOKEN = "8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ";
const PUZZLEBOT_URL = "https://api.puzzlebot.top/api/v1/telegram/sendMessage";

exports.handler = async function (event) {
  // Разрешаем CORS-preflight (на случай, если фронтенд шлёт OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
    };
  }

  const { chat_id, text } = payload;

  if (!chat_id || !text) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: false,
        error: "Missing required fields: chat_id and text",
      }),
    };
  }

  try {
    const response = await fetch(PUZZLEBOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PUZZLEBOT_TOKEN}`,
      },
      body: JSON.stringify({
        chat_id: chat_id,
        text: text,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    let responseData;

    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = { raw: await response.text() };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders(),
        body: JSON.stringify({
          ok: false,
          error: "Puzzlebot API error",
          details: responseData,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: true,
        message: "Order sent successfully",
        puzzlebotResponse: responseData,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: false,
        error: "Internal server error",
        details: err.message,
      }),
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}