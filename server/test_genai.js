import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY?.trim();
console.log("API Key loaded:", apiKey ? "Yes (" + apiKey.substring(0, 8) + "...)" : "No");

if (!apiKey) {
    console.error("Please add GOOGLE_API_KEY to .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

async function run() {
    console.log("Starting diagnostic test...");
    for (const modelName of models) {
        console.log(`\nTesting model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test message. Please reply with 'READY'.");
            const response = await result.response;
            console.log(`✅ Success! Response: ${response.text()}`);
            return;
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
            if (error.status) console.error(`Error Status: ${error.status}`);
        }
    }
}

run();
