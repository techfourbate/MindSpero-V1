const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const processNotes = async (text) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost efficient but smart
            messages: [
                {
                    "role": "system",
                    "content": `You are an expert university lecturer explaining content to a struggling student.
                    The user will provide text from lecture notes.
                    You MUST return the output EXACTLY in the following JSON format. Do not include markdown formatting or extra text outside the JSON.
                    {
                        "explanation": "A simple, clear explanation like a lecturer teaching a student. Use simple language and analogize where possible.",
                        "keyPoints": "Bullet point revision notes. Easy to memorize. Provide as an array of strings.",
                        "examQA": [
                            {
                                "question": "Likely exam question 1",
                                "answer": "Structured answer 1"
                            },
                            {
                                "question": "Likely exam question 2",
                                "answer": "Structured answer 2"
                            }
                        ],
                        "audioScript": "A natural spoken script of the explanation. Conversational style suitable for Text-to-Speech."
                    }`
                },
                {
                    "role": "user",
                    "content": text.slice(0, 15000) // limit input size somewhat
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (err) {
        console.error("OpenAI processing error:", err);
        throw new Error("Failed to process notes via AI");
    }
};

const generateSpeech = async (script, filepath) => {
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy", // or nova/onyx
            input: script.slice(0, 4096), // TTS limit
        });
        
        const buffer = Buffer.from(await mp3.arrayBuffer());
        require('fs').writeFileSync(filepath, buffer);
        return true;
    } catch (err) {
        console.error("OpenAI TTS error:", err);
        throw new Error("Failed to generate audio");
    }
};

module.exports = { processNotes, generateSpeech };
