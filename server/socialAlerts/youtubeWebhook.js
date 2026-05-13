const express = require("express");

const router = express.Router();

// Verification (YouTube sends GET request first)
router.get("/youtube/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" || mode === "unsubscribe") {
    console.log("[YouTube] Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(404);
});

// Notification (YouTube sends POST when new upload)
router.post("/youtube/webhook", express.text({ type: "*/*" }), async (req, res) => {
  try {
    const xml = req.body;

    

    // VERY SIMPLE PARSER (we improve later)
    const videoIdMatch = xml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const channelIdMatch = xml.match(/<yt:channelId>(.*?)<\/yt:channelId>/);

    if (!videoIdMatch || !channelIdMatch) {
      return res.sendStatus(200);
    }

    const videoId = videoIdMatch[1];
    const channelId = channelIdMatch[1];

   

    // TODO: send to Discord later (next step)

    res.sendStatus(200);
  } catch (err) {
    console.error("[YouTube] Webhook error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;