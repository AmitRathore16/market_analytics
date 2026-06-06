require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const aiService = require('./aiService');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
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

app.post('/refresh-data', (req, res) => {
    // Determine path to the python virtual environment and script
    const pythonExecutable = path.resolve(__dirname, '../data_pipeline/venv/bin/python');
    const scriptPath = path.resolve(__dirname, '../data_pipeline/fetch_data.py');
    const cwdPath = path.resolve(__dirname, '../data_pipeline');

    // Run the python script
    exec(`"${pythonExecutable}" "${scriptPath}"`, { cwd: cwdPath }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec error: ${error}`);
            return res.status(500).json({ error: 'Failed to refresh data pipeline', details: stderr || error.message });
        }
        res.json({ success: true, message: 'Data pipeline completed successfully', output: stdout });
    });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
