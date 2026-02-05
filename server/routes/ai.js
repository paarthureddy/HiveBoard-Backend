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
    console.log('--- NEW AI REQUEST ---');
    try {
        const { message, context } = req.body || {};
        console.log('Message:', message);
        console.log('Context:', context ? 'Provided' : 'None');

        const apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.trim() : null;
        console.log('API Key present:', !!apiKey);
        if (!apiKey) {
            return res.status(500).json({ message: 'Missing API Key' });
        }

        initAI();

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const imageKeywords = ['generate', 'image', 'picture', 'draw', 'show me'];
        const isImageRequest = imageKeywords.some(keyword => message.toLowerCase().includes(keyword));

        // Construct System Prompt with Context
        let contextString = "";
        if (context) {
            const notes = context.stickyNotes?.map(n => `- Sticky Note: "${n.text}"`).join('\n') || "";
            const texts = context.textItems?.map(t => `- Text: "${t.text}"`).join('\n') || "";
            if (notes || texts) {
                contextString = `\n\nCURRENT BOARD CONTEXT:\n${notes}\n${texts}\n\nUse this context to inform your answers. If the user asks for a critique or summary, refer to these items.`;
            }
        }

        const systemPrompt = isImageRequest
            ? "Respond ONLY with a markdown image: ![IMAGE](https://pollinations.ai/p/{prompt}?width=1024&height=1024&nologo=true&model=turbo). Replace {prompt} with a descriptive, URL-encoded prompt based on the user request. No other text."
            : `You are 'HiveMind', a collaborative AI partner for a whiteboard session. 
            - Be concise, actionable, and creative.
            - Format your response with Markdown (bold key terms, use lists).
            - If the user asks for a critique, analyze the Board Context provided below.
            - If the Board Context is empty, ask them to add some notes first.${contextString}`;

        const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"];

        let resultText = "";
        let success = false;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Fetching from ${modelName}...`);

                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] }]
                    })
                });

                const data = await apiResponse.json();

                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    resultText = data.candidates[0].content.parts[0].text;
                    success = true;
                    console.log(`✅ ${modelName} responded successfully.`);
                    break;
                } else if (data.error) {
                    console.error(`❌ ${modelName} API Error:`, data.error.message);
                } else {
                    console.warn(`⚠️ ${modelName} returned unexpected structure:`, JSON.stringify(data).substring(0, 100));
                }
            } catch (err) {
                console.error(`❌ ${modelName} Request failed:`, err.message);
            }
        }

        if (success) {
            // Detect if the model returned an image markdown even if Gemini was successful
            if (resultText.includes('![IMAGE]')) {
                const url = resultText.match(/\((.*?)\)/)?.[1];
                console.log('🖼️ Gemini generated image URL:', url);
                return res.json({ response: "I've generated this for you:", image: url });
            }
            res.json({ response: resultText });
        } else {
            // If it's an image request, we construct the URL.
            if (isImageRequest) {
                let promptSubject = message.replace(/generate|aimage|image|picture|draw|show me|a /gi, '').replace(/\s+/g, ' ').trim();
                if (promptSubject.toLowerCase().startsWith('of ')) promptSubject = promptSubject.substring(3);

                const encodedPrompt = encodeURIComponent(promptSubject || 'creative art');
                // Use gen.pollinations.ai which is their newer, more stable API
                const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&nologo=true&model=turbo&seed=${Math.floor(Math.random() * 100000)}`;
                console.log('🖼️ Constructed direct image URL:', imageUrl);
                return res.json({ response: "Generating image...", image: imageUrl });
            }

            console.log('🔄 Gemini fallback to Pollinations Text...');
            try {
                const pollinationsUrl = `https://text.pollinations.ai/${encodeURIComponent(message)}?system=${encodeURIComponent(systemPrompt)}`;
                const pollResponse = await fetch(pollinationsUrl);

                if (pollResponse.ok) {
                    const pollText = await pollResponse.text();
                    if (pollText && !pollText.includes('502 Bad Gateway') && !pollText.includes('error')) {
                        console.log('✅ Pollinations fallback successful.');
                        return res.json({ response: pollText });
                    }
                }
            } catch (fallbackErr) {
                console.error('❌ Fallback failed:', fallbackErr.message);
            }

            res.status(500).json({
                message: 'HiveMind is currently overworking (Quota exceeded)',
                details: 'Please try again in a few minutes.'
            });
        }

    } catch (error) {
        console.error('❌ AI Error:', error);
        res.status(500).json({ message: 'Error processing request', details: error.message });
    }
});

export default router;
