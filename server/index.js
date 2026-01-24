const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const clamp = (value, min) => (value < min ? min : value);

const generateSeries = ({ from, to }) => {
  const now = new Date();
  const start = from || new Date(now.getTime() - 48 * HOUR_MS);
  const end = to || now;
  const points = [];

  const baseConsumption = 125 + Math.random() * 25;
  const baseProduction = 85 + Math.random() * 20;

  for (let t = start.getTime(); t <= end.getTime(); t += HOUR_MS) {
    const current = new Date(t);
    const hour = current.getHours();
    const dailyPhase = (hour / 24) * Math.PI * 2;

    const consumption =
      baseConsumption +
      40 * Math.sin(dailyPhase - 1) +
      (Math.random() * 12 - 6);
    const production =
      baseProduction +
      30 * Math.sin(dailyPhase + 1) +
      (Math.random() * 10 - 5);

    points.push({
      timestamp: current.toISOString(),
      consumption: Math.round(clamp(consumption, 20)),
      production: Math.round(clamp(production, 10)),
    });
  }

  return points;
};

const fetchOpenMeteo = async ({ from, to, lat, lon }) => {
  const end = to || new Date();
  const start = from || new Date(end.getTime() - 48 * HOUR_MS);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / DAY_MS);
  const pastDays = Math.min(Math.max(diffDays, 1), 7);

  const url = "https://api.open-meteo.com/v1/forecast";
  const response = await axios.get(url, {
    params: {
      latitude: lat,
      longitude: lon,
      hourly: "temperature_2m,shortwave_radiation,windspeed_10m",
      past_days: pastDays,
      forecast_days: 1,
      timezone: "auto",
    },
    timeout: 10000,
  });

  const hourly = response.data?.hourly;
  if (!hourly?.time) {
    return null;
  }

  const points = hourly.time.map((timestamp, index) => {
    const temperature = hourly.temperature_2m?.[index] ?? 18;
    const radiation = hourly.shortwave_radiation?.[index] ?? 0;
    const windspeed = hourly.windspeed_10m?.[index] ?? 3;

    const production = clamp(radiation / 9 + windspeed * 1.8 + 30, 10);
    const consumption = clamp(
      110 + Math.abs(temperature - 18) * 2.5 + (Math.random() * 12 - 6),
      20
    );

    return {
      timestamp: new Date(timestamp).toISOString(),
      consumption: Math.round(consumption),
      production: Math.round(production),
    };
  });

  return points.filter((point) => {
    const t = new Date(point.timestamp).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Identifiants requis." });
  }

  return res.json({
    token: `demo-token-${Date.now()}`,
    user: { name: username },
  });
});

app.get("/api/metrics", (req, res) => {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const source = req.query.source === "real" ? "real" : "simulated";
  const lat = Number(req.query.lat) || 48.8566;
  const lon = Number(req.query.lon) || 2.3522;

  const thresholds = {
    consumptionHigh: 170,
    productionLow: 60,
  };

  const sendPayload = (points) => {
    const totals = points.reduce(
      (acc, point) => {
        acc.consumption += point.consumption;
        acc.production += point.production;
        return acc;
      },
      { consumption: 0, production: 0 }
    );

    res.json({
      source,
      range: {
        from: points[0]?.timestamp,
        to: points[points.length - 1]?.timestamp,
      },
      points,
      thresholds,
      totals: {
        consumption: Math.round(totals.consumption),
        production: Math.round(totals.production),
      },
    });
  };

  if (source === "real") {
    fetchOpenMeteo({ from, to, lat, lon })
      .then((points) => {
        if (points && points.length > 0) {
          sendPayload(points);
        } else {
          sendPayload(generateSeries({ from, to }));
        }
      })
      .catch(() => {
        sendPayload(generateSeries({ from, to }));
      });
  } else {
    sendPayload(generateSeries({ from, to }));
  }
});

app.listen(PORT, () => {
  console.log(`API énergétique prête sur http://localhost:${PORT}`);
});
