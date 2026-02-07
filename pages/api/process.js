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
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
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

const generateTtsBuffer = async (text) => {
  const chunks = [];
  const textChunks = text.match(/[^.!?]*[.!?]+/g) || [text];

  let currentChunk = '';
  for (const sentence of textChunks) {
    if ((currentChunk + sentence).length > 2000) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  const buffers = [];
  for (const chunk of chunks) {
    try {
      const response = await axios.get(
        `https://api.google-tts-api.com/audio?text=${encodeURIComponent(chunk)}&lang=en`,
        { responseType: 'arraybuffer', timeout: 10000 }
      );
      buffers.push(Buffer.from(response.data));
    } catch {
    }
  }

  if (buffers.length === 0) {
    return Buffer.concat([Buffer.from('ID3')]);
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

  try {
    const user = await supabaseAdmin.auth.admin.getUserById(
      req.headers['x-user-id'] || ''
    );

    if (!user?.data?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.data.user.id;

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
      const pdf = await pdfParse(fileData);
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

    const pdfBuffer = await generatePdf(simplifiedText);
    const audioBuffer = await generateTtsBuffer(simplifiedText);

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
