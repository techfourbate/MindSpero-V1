import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { PDFDocument, rgb } from 'pdf-lib';
import axios from 'axios';
import supabaseAdmin from '../../lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

const splitTextByChars = (text, chunkSize = 1500) => {
  const chunks = [];
  let currentChunk = '';

  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};

const callOpenAIWithRetry = async (text, maxRetries = 2) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educator. Simplify complex academic text while preserving key concepts and information. Make it easy to understand for students.',
            },
            {
              role: 'user',
              content: `Simplify this text:\n\n${text}`,
            },
          ],
          temperature: 0.15,
          max_tokens: 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn(`Rate limit hit (429). Retrying after ${2 * (i + 1)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Wait 2s, then 4s
      } else if (i === maxRetries - 1) {
        throw error;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
};

const simplifyText = async (text) => {
  const chunks = splitTextByChars(text, 1500);
  const simplifiedChunks = [];

  for (const chunk of chunks) {
    const simplified = await callOpenAIWithRetry(chunk);
    simplifiedChunks.push(simplified);
  }

  const combined = simplifiedChunks.join('\n\n');

  const finalPrompt = `Review and refine this text to ensure it's cohesive and well-structured. Fix any redundancies or transitions:\n\n${combined}`;
  const finalSimplified = await callOpenAIWithRetry(finalPrompt);

  return finalSimplified;
};

const generateAudioScript = async (text) => {
  // We process in chunks but with a different prompt for audio
  const chunks = splitTextByChars(text, 1500);
  const scriptChunks = [];

  for (const chunk of chunks) {
    const scriptPart = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an engaging AI Audio Tutor. Convert the provided academic text into a lively, spoken-word script. Use rhetorical questions, analogies, and direct address ("Now, let s look at...") to keep the student listening. Do not use headers or bullet points, just natural speech flow.',
          },
          {
            role: 'user',
            content: `Convert this text into a spoken tutor script:\n\n${chunk}`,
          },
        ],
        temperature: 0.7, // Higher temp for more dynamic speech
      },
      {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );
    scriptChunks.push(scriptPart.data.choices[0].message.content);
  }

  return scriptChunks.join(' ');
};

const generateTtsBuffer = async (text) => {
  // OpenAI TTS has a 4096 character limit. Safe buffer of 4000.
  const chunks = splitTextByChars(text, 4000);
  const buffers = [];

  for (const chunk of chunks) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: chunk,
          voice: 'alloy',
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );
      buffers.push(Buffer.from(response.data));
    } catch (error) {
      console.error('OpenAI TTS Error:', error.message);
    }
  }

  if (buffers.length === 0) {
    return Buffer.concat([Buffer.from('ID3')]); // Return minimal valid MP3 header or empty
  }

  return Buffer.concat(buffers);
};

const generatePdf = async (text) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 800]);
  const { height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  const font = await pdfDoc.embedFont('Courier');
  const fontSize = 12;
  const lineHeight = 18;

  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > 500) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  for (const textLine of lines) {
    if (yPosition < margin + lineHeight) {
      page = pdfDoc.addPage([600, 800]);
      yPosition = height - margin;
    }

    page.drawText(textLine, {
      x: margin,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    yPosition -= lineHeight;
  }

  return await pdfDoc.save();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filePath, fileName } = req.body;

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const now = new Date();
    const hasAccess =
      (profile?.trial_end_date && new Date(profile.trial_end_date) > now) ||
      (profile?.bonus_trial_end_date && new Date(profile.bonus_trial_end_date) > now) ||
      (profile?.subscription_end_date && new Date(profile.subscription_end_date) > now);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Subscription expired' });
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('notes')
      .download(filePath);

    if (downloadError || !fileData) {
      return res.status(400).json({ error: 'File not found' });
    }

    let extractedText = '';

    if (fileName.endsWith('.pdf')) {
      // pdf-parse expects a Node.js Buffer
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdf = await pdfParse(buffer);
      extractedText = pdf.text;
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const docxResult = await mammoth.extractRawText({ arrayBuffer: await fileData.arrayBuffer() });
      extractedText = docxResult.value;
    } else if (fileName.endsWith('.txt')) {
      extractedText = fileData.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text found in file' });
    }

    const simplifiedText = await simplifyText(extractedText);
    const tutorScript = await generateAudioScript(simplifiedText); // Create engaging script based on simplified concepts

    const pdfBuffer = await generatePdf(simplifiedText);
    const audioBuffer = await generateTtsBuffer(tutorScript);

    const timestamp = Date.now();
    const pdfPath = `${userId}/output-${timestamp}.pdf`;
    const audioPath = `${userId}/output-${timestamp}.mp3`;

    const { error: pdfError } = await supabaseAdmin.storage
      .from('outputs')
      .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' });

    const { error: audioError } = await supabaseAdmin.storage
      .from('outputs')
      .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });

    const { error: dbError } = await supabaseAdmin
      .from('notes')
      .insert({
        user_id: userId,
        original_path: filePath,
        extracted_text: extractedText.substring(0, 5000),
        simplified_text: simplifiedText.substring(0, 5000),
        output_pdf_path: pdfPath,
        audio_path: audioPath,
        status: 'completed',
        created_at: new Date(),
      });

    if (dbError) {
      return res.status(400).json({ error: dbError.message });
    }

    return res.status(200).json({
      success: true,
      pdfPath,
      audioPath,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
