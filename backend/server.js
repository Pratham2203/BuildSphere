import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            'https://build-sphere-frontend.vercel.app', // Deployed frontend
            'http://localhost:3000', // Local development
        ],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket','polling'], // Force WebSocket transport
});

// Redis Adapter (Uncomment if using Redis for scalability)
// import { createAdapter } from '@socket.io/redis-adapter';
// import { createClient } from 'redis';
// const pubClient = createClient({ url: process.env.REDIS_URL });
// const subClient = pubClient.duplicate();
// await pubClient.connect();
// await subClient.connect();
// io.adapter(createAdapter(pubClient, subClient));

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Socket authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }

        socket.project = await projectModel.findById(projectId);
        if (!socket.project) {
            return next(new Error('Project not found'));
        }

        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return next(new Error('Invalid token'));
        }

        socket.user = decoded;
        next();
    } catch (error) {
        next(error);
    }
});

// Socket event handlers
io.on('connection', (socket) => {
    socket.roomId = socket.project._id.toString();
    console.log('A user connected:', socket.user.email);

    // Join the room for the project
    socket.join(socket.roomId);

    // Handle project messages
    socket.on('project-message', async (data) => {
        try {
            const message = data.message;
            const aiIsPresentInMessage = message.includes('@ai');
            socket.broadcast.to(socket.roomId).emit('project-message', data);

            if (aiIsPresentInMessage) {
                const prompt = message.replace('@ai', '');
                const result = await generateResult(prompt);

                io.to(socket.roomId).emit('project-message', {
                    message: result,
                    sender: {
                        _id: 'ai',
                        email: 'AI',
                    },
                });
            }
        } catch (error) {
            console.error('Error handling project-message:', error.message);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.email);
        socket.leave(socket.roomId);
    });

    // Handle errors
    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

io.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
