const express = require("express");

function createShipsRouter(getFleetSnapshot) {
  const router = express.Router();

  router.get("/", (req, res) => {
    if (typeof getFleetSnapshot !== "function") {
      return res.status(500).json({ error: "Fleet snapshot provider missing" });
    }
    return res.json(getFleetSnapshot());
  });

  router.get("/:id", (req, res) => {
    if (typeof getFleetSnapshot !== "function") {
      return res.status(500).json({ error: "Fleet snapshot provider missing" });
    }

    const shipId = String(req.params.id || "").toUpperCase();
    const snapshot = getFleetSnapshot();
    const ship = snapshot.ships.find((s) => s.id === shipId);

    if (!ship) {
      return res.status(404).json({ error: `Ship not found: ${shipId}` });
    }

    return res.json({
      ship,
      tick: snapshot.tick,
      serverTime: snapshot.serverTime,
    });
  });

  return router;
}

module.exports = { createShipsRouter };

