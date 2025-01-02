import Redis from 'ioredis';

const redisClient = new Redis({
    host: 'redis-14215.c212.ap-south-1-1.ec2.redns.redis-cloud.com',
    port: 14215,
    password: '3B07NU4hcxZYsfoZSDR6qbK5G4wPnGSP',
});


redisClient.on('connect', () => {
    console.log('Redis connected');
})
redisClient.on('error', (err) => {
    
    console.error('Redis error:', err);
});

export default redisClient;