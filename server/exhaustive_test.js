import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const apiKey = process.env.GOOGLE_API_KEY?.trim();

if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();

        if (!listData.models) {
            console.log("No models found.");
            return;
        }

        for (const m of listData.models) {
            if (!m.supportedGenerationMethods.includes("generateContent")) continue;

            const modelName = m.name.replace('models/', '');
            console.log(`\nTesting: ${modelName} (${m.name})`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hi");
                const response = await result.response;
                console.log(`✅ Success: ${response.text().substring(0, 20)}...`);
                return;
            } catch (err) {
                console.error(`❌ Fail: ${err.message}`);
            }
        }
    } catch (e) {
        console.error("Global crash:", e.message);
    }
}

run();
