const fs = require('fs');
const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        // Clean text formatting issue somewhat
        let cleanedText = data.text.replace(/\n\s*\n/g, '\n\n').trim();
        return cleanedText;
    } catch (err) {
        throw new Error('Failed to extract text from PDF');
    }
};

module.exports = { extractTextFromPDF };
