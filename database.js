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

async function getLeaderboard(client, round, limit_num) {
    try {
        const query = `
            WITH race_stats AS (
                SELECT 
                    rr.doodle_id,
                    MIN(rr.finish_time) as best_time,
                    AVG(rr.finish_time) as avg_time,
                    AVG(rr.position) as avg_position,
                    MODE() WITHIN GROUP (ORDER BY rr.position) as mode_position,
                    COUNT(*) as race_count
                FROM race_results rr
                INNER JOIN races r ON rr.race_id = r.race_id
                INNER JOIN doodles d ON rr.doodle_id = d.doodle_id
                WHERE d.round = $1
                GROUP BY rr.doodle_id
            )
            SELECT 
                u.name, 
                u.frame1,
                u.frame2,
                d.running, 
                d.climbing, 
                d.swimming, 
                d.jumping, 
                d.stamina, 
                rs.best_time as fastest_time,
                rs.avg_time as avg_time,
                ROUND(rs.avg_position, 2) as avg_position,
                rs.mode_position,
                rs.race_count
            FROM doodles d
            INNER JOIN users u ON d.user_id = u.user_id
            INNER JOIN race_stats rs ON d.doodle_id = rs.doodle_id
            WHERE d.round = $1
            ORDER BY rs.best_time ASC
            limit $2;
        `;

        const result = await client.query(query, [round, limit_num]);

        // Convert sprite buffers to base64 strings
        const processedRows = result.rows.map(row => ({
            ...row,
            frame1: row.frame1 ? Buffer.from(row.frame1).toString('base64') : null,
            frame2: row.frame2 ? Buffer.from(row.frame2).toString('base64') : null
        }));
        
        return processedRows;
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        throw new Error(`Failed to fetch leaderboard: ${err.message}`);
    }
}

async function getUserRank(client, userId, round) {
    try {
        const query = `
            WITH all_stats AS (
                SELECT 
                    d.doodle_id,
                    d.user_id,
                    MIN(rr.finish_time) as best_time,
                    AVG(rr.finish_time) as avg_time,
                    AVG(rr.position) as avg_position,
                    MODE() WITHIN GROUP (ORDER BY rr.position) as mode_position,
                    COUNT(*) as race_count
                FROM doodles d
                INNER JOIN race_results rr ON d.doodle_id = rr.doodle_id
                INNER JOIN races r ON rr.race_id = r.race_id
                WHERE d.round = $2
                GROUP BY d.doodle_id, d.user_id
            ),
            ranked_stats AS (
                SELECT 
                    *,
                    ROW_NUMBER() OVER (ORDER BY best_time ASC) as best_time_rank,
                    ROW_NUMBER() OVER (ORDER BY avg_time ASC) as avg_time_rank,
                    ROW_NUMBER() OVER (ORDER BY avg_position ASC) as avg_position_rank,
                    ROW_NUMBER() OVER (ORDER BY mode_position ASC) as mode_position_rank,
                    ROW_NUMBER() OVER (ORDER BY race_count DESC) as race_count_rank
                FROM all_stats
            )
            SELECT 
                u.name,
                u.frame1,
                u.frame2,
                d.running,
                d.climbing,
                d.swimming,
                d.jumping,
                d.stamina,
                rs.best_time as finish_time,
                rs.avg_time as avg_time,
                ROUND(rs.avg_position, 2) as avg_position,
                rs.mode_position,
                rs.race_count,
                rs.best_time_rank,
                rs.avg_time_rank,
                rs.avg_position_rank,
                rs.mode_position_rank,
                rs.race_count_rank
            FROM doodles d
            INNER JOIN users u ON d.user_id = u.user_id
            INNER JOIN ranked_stats rs ON d.doodle_id = rs.doodle_id
            WHERE d.user_id = $1 AND d.round = $2
            ORDER BY rs.best_time ASC;
        `;

       const result = await client.query(query, [userId, round]);
        
        // Convert sprite buffers to base64 strings
        const processedRows = result.rows.map(row => ({
            ...row,
            frame1: row.frame1 ? Buffer.from(row.frame1).toString('base64') : null,
            frame2: row.frame2 ? Buffer.from(row.frame2).toString('base64') : null,
            best_time_rank: parseInt(row.best_time_rank),
            avg_time_rank: parseInt(row.avg_time_rank),
            avg_position_rank: parseInt(row.avg_position_rank),
            mode_position_rank: parseInt(row.mode_position_rank),
            race_count_rank: parseInt(row.race_count_rank)
        }));
        
        return processedRows;
    } catch (err) {
        console.error('Error fetching user rank:', err);
        throw new Error(`Failed to fetch user rank: ${err.message}`);
    }
}

module.exports = {
    createUser,
    createDoodle,
    createRace,
    createRaceResult,
    getLeaderboard,
    getUserRank
};