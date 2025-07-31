const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Doodle Derby Server!',
        status: 'Server is running successfully'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Doodle Derby Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see the server`);
});

module.exports = app;
