const express = require('express');
const app = express();
const pool = require('./database');  // PostgreSQL pool (pg)
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware
app.use(express.json());
app.use(cors());

// JWT Middleware
const jwtMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];  // "Bearer token"
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Admin Role Middleware
const checkAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

// Register new user
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
            [username, hashedPassword, role]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Login user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Get all events
app.get('/events', jwtMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add new event (admin only)
app.post('/events', jwtMiddleware, checkAdmin, async (req, res) => {
    const { name, budget_allocated, amount_spent, status } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO events (name, budget_allocated, amount_spent, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, budget_allocated, amount_spent, status]
        );
        res.status(201).json({ message: 'Event added successfully', eventId: result.rows[0].id });
    } catch (error) {
        console.error('Error adding event:', error);
        res.status(500).json({ message: 'Error adding event', error: error.message });
    }
});

// Get all transactions
app.get('/transactions', jwtMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add new transaction (admin only)
app.post('/transactions', jwtMiddleware, checkAdmin, async (req, res) => {
    const { event_name, amount, date } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO transactions (event_name, amount, date) VALUES ($1, $2, $3) RETURNING id',
            [event_name, amount, date]
        );
        res.status(201).json({ message: 'Transaction added successfully', transactionId: result.rows[0].id });
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).json({ message: 'Error adding transaction', error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.send('OK');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
