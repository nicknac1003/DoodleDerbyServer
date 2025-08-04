/**
 * Matchmaking functions for Doodle Derby racing
 */

/**
 * Get random doodles for a race from a specific round
 * @param {Object} client - PostgreSQL client connection
 * @param {number} num_racers - Number of racers needed for the race
 * @param {number} round - The round number to filter doodles by
 * @returns {Promise<Array>} Array of doodle objects for the race
 */
async function getDoodlesForRace(client, num_racers, round, userId) {
    try {
        // Query to get random doodles from the specified round
        const query = `
            SELECT d.doodle_id, d.running, d.climbing, d.swimming, d.jumping, d.stamina, u.name as name, u.frame1, u.frame2
            FROM doodles d
            LEFT JOIN users u ON d.user_id = u.user_id
            WHERE d.round = $1 AND d.user_id != $2
            ORDER BY RANDOM()
            LIMIT $3
        `;

        const result = await client.query(query, [round, userId, num_racers]);

        if (result.rows.length === 0) {
            throw new Error(`No doodles found for round ${round}`);
        }
        
        if (result.rows.length < num_racers) {
            console.warn(`Only ${result.rows.length} doodles available for round ${round}, requested ${num_racers}`);
        }
        
        // Convert sprite buffers to base64 strings
        const processedRows = result.rows.map(row => ({
            ...row,
            frame1: row.frame1 ? Buffer.from(row.frame1).toString('base64') : null,
            frame2: row.frame2 ? Buffer.from(row.frame2).toString('base64') : null,
            is_player: false
        }));
        
        return processedRows;
        
    } catch (err) {
        console.error('Error getting doodles for race:', err);
        throw new Error(`Failed to get doodles for race: ${err.message}`);
    }
}

/**
 * Get top performing doodles from a specific round
 * @param {Object} client - PostgreSQL client connection
 * @param {number} num_racers - Number of racers needed for the race
 * @param {number} round - The round number to filter doodles by
 * @returns {Promise<Array>} Array of top performing doodle objects
 */
async function getTopDoodlesForRace(client, num_racers, round, userId) {
    try {
        // Query to get top doodles based on best time for the specified round
        const query = `
            SELECT d.doodle_id, d.running, d.climbing, d.swimming, d.jumping, d.stamina, u.name as name, u.frame1, u.frame2
            FROM doodles d
            LEFT JOIN users u ON d.user_id = u.user_id
            WHERE d.round = $1 and d.user_id != $3
            ORDER BY (SELECT avg(position) FROM race_results rr WHERE rr.doodle_id = d.doodle_id) ASC
            LIMIT $2
        `;

        const result = await client.query(query, [round, num_racers, userId]);

        if (result.rows.length === 0) {
            throw new Error(`No doodles found for round ${round}`);
        }

        // Convert sprite buffers to base64 strings
        const processedRows = result.rows.map(row => ({
            ...row,
            frame1: row.frame1 ? Buffer.from(row.frame1).toString('base64') : null,
            frame2: row.frame2 ? Buffer.from(row.frame2).toString('base64') : null
        }));

        return processedRows;

    } catch (err) {
        console.error('Error getting top doodles for race:', err);
        throw new Error(`Failed to get top doodles for race: ${err.message}`);
    }
}

module.exports = {
    getDoodlesForRace,
    getTopDoodlesForRace
};
