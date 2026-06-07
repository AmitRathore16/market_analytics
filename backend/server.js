if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env"),
  });
}
const express = require("express");
const cors = require("cors");
const aiService = require("./aiService");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await aiService.processMessage(message, history || []);
    res.json(response);
  } catch (error) {
    console.error("Chat API Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});



const PORT = process.env.PORT || 5001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
