# Doodle Derby Server

A Node.js Express server for the Doodle Derby application.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd DoodleDerbyServer
```

2. Install dependencies:
```bash
npm install
```

### Running the Server

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on port 3000 by default. You can access it at:
- Main endpoint: http://localhost:3000
- Health check: http://localhost:3000/health

### Environment Variables

You can set the following environment variables:
- `PORT`: Server port (default: 3000)

### Scripts

- `npm start`: Start the server in production mode
- `npm run dev`: Start the server in development mode with nodemon
- `npm test`: Run tests (not implemented yet)

## API Endpoints

- `GET /` - Welcome message and server status
- `GET /health` - Health check endpoint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
