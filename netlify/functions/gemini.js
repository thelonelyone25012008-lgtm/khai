const { GoogleGenAI } = require('@google/genai');

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { history, systemInstruction, modelName, tools } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'Server API key not configured' };
    }

    const ai = new GoogleGenAI({ apiKey });

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction,
        temperature: 0.5,
        tools: tools || [],
      },
      history: history.slice(0, -1),
    });

    // Send the last user message and await a response (one-shot)
    const lastMessage = history[history.length - 1];
    const response = await chat.sendMessage({ message: lastMessage.parts });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: String(err) };
  }
};
