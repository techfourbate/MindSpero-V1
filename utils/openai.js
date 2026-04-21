const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_KEY?.startsWith('sk-scitely') 
             ? 'https://api.scitely.com/v1' 
             : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
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
                        "examQA": {
                            "tldr": "A 1-2 sentence 'Too Long, Didn't Read' instant summary of the entire text.",
                            "mnemonics": [
                                "Create a clever acronym or mnemonic device to help memorize the hardest concept 1",
                                "Provide mnemonic 2 if relevant"
                            ],
                            "shortQA": [
                                {
                                    "question": "Likely written exam question 1",
                                    "answer": "Structured answer 1"
                                }
                            ],
                            "mcq": [
                                {
                                    "question": "Multiple choice test question 1",
                                    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                                    "answer": "C) Option 3"
                                }
                            ]
                        },
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
