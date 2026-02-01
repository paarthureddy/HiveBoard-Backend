import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

let genAI;

const initAI = () => {
    // Trim the key to avoid whitespace issues
    const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : null;
    if (!genAI && apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
};

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body || {};

        // Detailed logging
        console.log('📝 AI Request Received');
        console.log('   Message:', message ? message.substring(0, 50) + '...' : 'NONE');

        const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : null;
        if (!apiKey) {
            console.error('❌ FATAL: GOOGLE_API_KEY is missing in environment variables');
            return res.status(500).json({ message: 'Server configuration error: Missing API Key' });
        }
        console.log('   Key available:', apiKey.substring(0, 4) + '...');

        initAI();

        if (!genAI) {
            console.error('❌ FATAL: Failed to initialize GoogleGenerativeAI');
            return res.status(500).json({ message: 'AI Client initialization failed' });
        }

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Try multiple models to ensure compatibility
        const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-pro"];

        let resultText = "";
        let success = false;
        let lastError = null;

        const systemPrompt = "You are a helpful AI assistant for HiveBoard. Keep responses concise.";

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Attempting model: ${modelName}`);

                const modelConfig = { model: modelName };
                // 1.5 models support systemInstruction
                if (modelName.includes('1.5')) {
                    modelConfig.systemInstruction = systemPrompt;
                }

                const model = genAI.getGenerativeModel(modelConfig);
                const result = await model.generateContent(message);
                const response = await result.response;
                resultText = response.text();

                success = true;
                console.log(`✅ Success with ${modelName}`);
                break;
            } catch (error) {
                console.warn(`⚠️ Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (success) {
            res.json({ response: resultText });
        } else {
            console.error('❌ All models failed.');
            throw lastError || new Error("All AI models failed.");
        }

    } catch (error) {
        console.error('❌ AI Route Error:', error);
        res.status(500).json({
            message: 'Error processing AI request.',
            details: error.message
        });
    }
});

export default router;
