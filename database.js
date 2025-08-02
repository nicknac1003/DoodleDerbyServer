async function createUser(client, userId, name, frame1, frame2) {
    try {
        await client.query(
            "INSERT INTO users (user_id, name, frame1, frame2) VALUES ($1, $2, $3, $4)",
            [userId, name, frame1, frame2]
        );
    } catch (err) {
        console.error('Error creating user:', err);
        throw new Error(`Failed to create user: ${err.message}`);
    }
}

async function createDoodle(client, userId, doodleData) {
    try {
        // Destructure the JSON doodle data
        const { roundNumber, running, climbing, swimming, jumping, stamina } = doodleData;
        
        // Check if a doodle already exists for this user and round
        const existingDoodle = await client.query(
            "SELECT doodle_id FROM doodles WHERE user_id = $1 AND round = $2",
            [userId, roundNumber]
        );
        
        if (existingDoodle.rows.length > 0) {
            return existingDoodle.rows[0].doodle_id; // Return existing doodle ID if found
        }


        const query = `
            INSERT INTO doodles (user_id, round, running, climbing, swimming, jumping, stamina)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING doodle_id
        `;
        const values = [userId, roundNumber, running, climbing, swimming, jumping, stamina];
        // Insert with all the doodle stats
        const result = await client.query(query, values);
        const doodleId = result.rows[0].doodle_id;
        return doodleId;

    } catch (err) {
        console.error('Error creating doodle:', err);
        throw new Error(`Failed to create doodle: ${err.message}`);
    }
}

async function createRace(client, raceId, mapSeed, round, isOlympic) {
    try {
        await client.query(
            "INSERT INTO races (race_id, map_seed, round, is_olympic) VALUES ($1, $2, $3, $4)",
            [raceId, mapSeed, round, isOlympic]
        );
    } catch (err) {
        console.error('Error creating race:', err);
        throw new Error(`Failed to create race: ${err.message}`);
    }
}

async function createRaceResult(client, raceId, doodleId, position, time) {
    try {
        await client.query(
            "INSERT INTO race_results (race_id, doodle_id, position, finish_time) VALUES ($1, $2, $3, $4)",
            [raceId, doodleId, position, time]
        );
    } catch (err) {
        console.error('Error creating race result:', err);
        throw new Error(`Failed to create race result: ${err.message}`);
    }
}

module.exports = {
    createUser,
    createDoodle,
    createRace,
    createRaceResult
};