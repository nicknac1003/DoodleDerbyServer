require('dotenv').config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/testdb", async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query("SELECT * from leaderboard;");
        const results = result ? result.rows : null ;
        response_string = `Hello World! Current time from DB: ${JSON.stringify(results)}`;
        res.send(response_string);
        
        client.release();
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

