const Groq = require('groq-sdk');
const pool = require('./db');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const dbSchema = `
Table market_data:
Symbol (VARCHAR), Type (VARCHAR), Date (DATETIME), Open (FLOAT), High (FLOAT), Low (FLOAT), Close (FLOAT), Adj Close (FLOAT), Volume (FLOAT)

Table trackers:
Symbol (VARCHAR), Type (VARCHAR), Logo (VARCHAR)
`;

async function processMessage(message, history) {
    const systemPrompt = `You are a helpful AI assistant for a stock market dashboard. 
You have access to a MySQL database with the following schema:
${dbSchema}

IMPORTANT RULES:
1. If the user asks a question about the data, you MUST output ONLY a valid SQL query starting with "SELECT" to retrieve the data. Do NOT output markdown or explanations, JUST the raw query.
2. If the user asks a general question, greets you, or asks for advice (e.g. "which stock should I buy"), provide a conversational response based on your general knowledge. Do NOT output SQL for these.
3. If you output SQL, the system will execute it and give you the results in a second pass, and then you can formulate your final response.`;

    const formattedHistory = history.slice(-5).map(h => ({
        role: h.role === 'ai' ? 'assistant' : 'user',
        content: h.content
    }));

    const completion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            ...formattedHistory,
            { role: "user", content: message }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
    });

    let firstResponse = completion.choices[0].message.content.trim();

    if (firstResponse.toUpperCase().startsWith("SELECT ")) {
        // Remove possible markdown formatting if the LLM ignores instructions
        const query = firstResponse.replace(/\`\`\`/g, '').replace(/sql/gi, '').trim();
        let queryResult = null;
        let queryError = null;

        try {
            const [rows] = await pool.query(query);
            queryResult = rows;
        } catch (e) {
            queryError = e.message;
        }

        const finalPrompt = `The user asked: "${message}". 
You executed the following query:
${query}

The result was:
${JSON.stringify(queryResult || queryError).substring(0, 2000)}

Provide a friendly, conversational answer to the user's question based on this data. Do not show the query in your text response, just answer the question naturally.`;

        const finalCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful AI assistant for a stock market dashboard." },
                { role: "user", content: finalPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
        });

        return {
            content: finalCompletion.choices[0].message.content,
            query: query // Pass the query back to frontend
        };
    } else {
        return {
            content: firstResponse
        };
    }
}

module.exports = {
    processMessage
};
