require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const crypto = require("crypto");
const { getDoodlesForRace, getTopDoodlesForRace } = require("./matchmaking");
const { createUser, createDoodle, createRace, createRaceResult, getLeaderboard } = require('./database');
const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


app.get("/", authenticate, (req, res) => {
    res.send("Hello World");
});
app.post("/", authenticate, (req, res) => {
    res.send("Hello World post");
});

app.post("/auth/new", async (req, res) => {

    const headers = req.headers;
    const requiredHeaders = ['x-client-type', 'x-game-client', 'x-timestamp', 'x-platform', 'x-unity-version'];
    for (const header of requiredHeaders) {
        if (!req.headers[header]) {
            return res.status(403).json({ error: 'Missing required headers' });
        }
    }

    const timestamp = parseInt(headers['x-timestamp']);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) { // 5 minute window
        return res.status(403).json({ error: 'Request expired' });
    }

    let name, sprite1, sprite2;
    try {
        ({ name, sprite1, sprite2 } = req.body);
        sprite1 = sprite1 ? Buffer.from(sprite1, 'base64') : null;
        sprite2 = sprite2 ? Buffer.from(sprite2, 'base64') : null;
        if (!name ) {
            return res.status(400).json({ error: 'Name, sprite1, and sprite2 are required' });
        }
    } catch (err) {
        console.error('Error parsing request body:', err);
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const userId = uuidv4();
    let client;
    try {
        client = await pool.connect();

        await createUser(client, userId, name, sprite1, sprite2);

        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    } finally {
        if (client) 
            client.release();
    }
});

app.post("/doodle/save", authenticate, async (req, res) => {
    
    const { userId } = req;
    const { roundNumber, doodle } = req.body;
    if (!doodle) {
        return res.status(400).json({ error: 'Doodle data is required' });
    }

    let client;
    try {
        client = await pool.connect();
        console.log('Saving doodle for user:', userId);
        const doodle_id = await createDoodle(client, userId, { ...doodle, roundNumber });
        res.json({ doodle_id });
    } catch (err) {
        console.error('Error saving doodle:', err);
        res.status(500).json({ error: 'Failed to save doodle' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.post("/race/start", authenticate, async (req, res) => {
    const { userId } = req;
    const { roundNumber, mapSeed, num_racers, isOlympic } = req.body;

    if (!roundNumber || !mapSeed) {
        return res.status(400).json({ error: 'Round and mapSeed are required' });
    }
    if (!num_racers || num_racers <= 0) {
        num_racers = 7;
    }

    const raceId = uuidv4();
    let client;
    try {
        client = await pool.connect();
        await createRace(client, raceId, mapSeed, roundNumber, isOlympic);

        try {
            let doodles;
            if (isOlympic) {
                doodles = await getTopDoodlesForRace(client, num_racers, roundNumber);
            }
            else {
                doodles = await getDoodlesForRace(client, num_racers, roundNumber, userId);
            }

            res.json({
                raceId,
                doodles
            });
        } catch (err) {
            console.error('Error getting doodles for race:', err);
            res.status(500).json({ error: 'Failed to get doodles for race' });
        }

    } catch (err) {
        console.error('Race start error:', err);
        res.status(500).json({ error: 'Failed to start race' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.post("/race/results", authenticate, async (req, res) => {
    const { raceId, results } = req.body;

    let client;
    const resultsList = [];
    
    try {
        client = await pool.connect();

        // Process the race results
        for (const result of results) {
            const { doodleId, position, time } = result;
            try {
                await createRaceResult(client, raceId, doodleId, position, time);
                resultsList.push({ doodle_id: doodleId, success: true });
            } catch (err) {
                console.error('Error creating race result:', err);
                resultsList.push({ doodle_id: doodleId, success: false, error: err.message });
            }
        }
        
        res.json({ 
            raceId: raceId,
            results: resultsList,
            overall_success: resultsList.every(r => r.success)
        });
    } catch (err) {
        console.error('Error saving race results:', err);
        res.status(500).json({ error: 'Failed to save race results' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.get("/leaderboard/:round", authenticate, async (req, res) => {
    const { round } = req.params;
    const limit_num = 1000;

    let client;
    try {
        client = await pool.connect();
        const leaderboard = await getLeaderboard(client, round, limit_num);
        res.json( leaderboard );
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    } finally {
        if (client) {
            client.release();
        }
    }
});
app.get("/leaderboard/user/:round", authenticate, async (req, res) => {
    const { userId } = req;
    const { round } = req.params;

    let client;
    try {
        client = await pool.connect();

        const rank = await getUserRank(client, userId, round);
        res.json({ rank });
    } catch (err) {
        console.error('Error fetching user rank:', err);
        res.status(500).json({ error: 'Failed to fetch user rank' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));

function authenticate(req, res, next) {
    const headers = req.headers;
    const requiredHeaders = ['x-client-type', 'x-game-client', 'x-timestamp', 'x-platform', 'x-unity-version', 'x-signature'];
    for (const header of requiredHeaders) {
        if (!headers[header]) {
            return res.status(403).json({ error: 'Invalid headers' });
        }
    }
    if (headers['x-client-type'] !== 'unity-game') {
        return res.status(403).json({ error: 'Invalid headers' });
    }
    if (headers['x-game-client'] !== 'DoodleDerby') {
        return res.status(403).json({ error: 'Invalid headers' });
    }
    if (headers['x-unity-version'] !== '6000.0.35f1') {
        return res.status(403).json({ error: 'Invalid headers' });
    }




    const timestamp = parseInt(headers['x-timestamp']);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) { // 5 minute window
        return res.status(403).json({ error: 'Request expired' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;


        const secret = Buffer.from(process.env.HMAC_SECRET, 'base64');
        const hmac = crypto.createHmac('sha256', secret);
        const signature = hmac.update(token + headers['x-timestamp']).digest('base64');

        if (signature !== headers['x-signature']) {
            return res.status(403).json({ error: 'Invalid headers' });
        }

        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }


}

