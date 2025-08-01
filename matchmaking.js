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
            SELECT d.doodle_id, d.running, d.climbing, d.swimming, d.jumping, d.stamina, u.name as name, u.frame1 as sprite1, u.frame2 as sprite2
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
            sprite1: row.sprite1 ? Buffer.from(row.sprite1).toString('base64') : null,
            sprite2: row.sprite2 ? Buffer.from(row.sprite2).toString('base64') : null
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
async function getTopDoodlesForRace(client, num_racers, round) {
    try {
        // Assumes you have a wins or performance metric in your doodles table
        const query = `
            SELECT d.*, u.name as user_name, u.img as user_img
            FROM doodles d
            LEFT JOIN users u ON d.user_id = u.user_id
            WHERE d.round = $1
            ORDER BY d.wins DESC, d.created_at ASC
            LIMIT $2
        `;
        
        const result = await client.query(query, [round, num_racers]);
        
        if (result.rows.length === 0) {
            throw new Error(`No doodles found for round ${round}`);
        }
        
        return result.rows;
        
    } catch (err) {
        console.error('Error getting top doodles for race:', err);
        throw new Error(`Failed to get top doodles for race: ${err.message}`);
    }
}

module.exports = {
    getDoodlesForRace,
    getTopDoodlesForRace
};
