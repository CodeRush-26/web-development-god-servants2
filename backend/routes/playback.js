const express = require("express");

function createPlaybackRouter(getPlaybackHistory, getPlaybackSnapshotAt) {
  const router = express.Router();

  router.get("/", (req, res) => {
    if (typeof getPlaybackHistory !== "function") {
      return res.status(500).json({ error: "Playback history provider missing" });
    }
    return res.json({ snapshots: getPlaybackHistory() });
  });

  router.get("/:timestamp", (req, res) => {
    if (typeof getPlaybackSnapshotAt !== "function") {
      return res.status(500).json({ error: "Playback snapshot provider missing" });
    }
    const snap = getPlaybackSnapshotAt(req.params.timestamp);
    if (!snap) return res.status(404).json({ error: "No playback snapshot found" });
    return res.json({ snapshot: snap });
  });

  return router;
}

module.exports = { createPlaybackRouter };
