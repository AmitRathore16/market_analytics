require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const aiService = require('./aiService');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const response = await aiService.processMessage(message, history || []);
        res.json(response);
    } catch (error) {
        console.error("Chat API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.post('/api/refresh-data', async (req, res) => {
    try {
        const token = process.env.GITHUB_PAT;
        if (!token) {
            return res.status(500).json({ error: "Missing GITHUB_PAT environment variable." });
        }

        const owner = "AmitRathore16";
        const repo = "market_analytics";
        const workflow_id = "market_pipeline.yml";

        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${token}`
            },
            body: JSON.stringify({
                ref: 'main'
            })
        });

        if (!ghRes.ok) {
            const errorText = await ghRes.text();
            console.error(`GitHub API error: ${ghRes.status} ${errorText}`);
            return res.status(500).json({ error: "Failed to trigger pipeline", details: errorText });
        }

        res.json({ success: true, message: 'Pipeline triggered on GitHub Actions. Data will be updated shortly.' });
    } catch (error) {
        console.error("Refresh Data API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

module.exports = app;
