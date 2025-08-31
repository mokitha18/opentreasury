const express = require('express');
const app = express();
const pool = require('./database');  // Import MySQL database connection
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware
app.use(express.json());  // To parse incoming JSON data
app.use(cors());  // To allow cross-origin requests

// JWT Middleware to check authentication
const jwtMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];  // "Bearer token"

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');  // Verify token
        req.user = decoded;  // Attach user info to request object
        next();  // Proceed to the next route
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Admin Role Middleware to restrict access
const checkAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();  // Proceed if the user is an admin
};

// POST route to register a new user
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
});

// POST route to log in (generate JWT token)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const [user] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (user.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user[0].password_hash);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user[0].id, role: user[0].role }, 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
});

// GET route to fetch all events (accessible to all users)
app.get('/events', jwtMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route to add a new event (admin only)
app.post('/events', jwtMiddleware, checkAdmin, async (req, res) => {
    const { name, budget_allocated, amount_spent, status } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO events (name, budget_allocated, amount_spent, status) VALUES (?, ?, ?, ?)',
            [name, budget_allocated, amount_spent, status]
        );
        res.status(201).json({ message: 'Event added successfully', eventId: result.insertId });
    } catch (error) {
        console.error('Error adding event:', error);
        res.status(500).json({ message: 'Error adding event', error: error.message });
    }
});

// GET route to fetch all transactions (accessible to all users)
app.get('/transactions', jwtMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route to add a new transaction (admin only)
app.post('/transactions', jwtMiddleware, checkAdmin, async (req, res) => {
    const { event_name, amount, date } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO transactions (event_name, amount, date) VALUES (?, ?, ?)',
            [event_name, amount, date]
        );
        res.status(201).json({ message: 'Transaction added successfully', transactionId: result.insertId });
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).json({ message: 'Error adding transaction', error: error.message });
    }
});
// health check route
app.get('/health', (req, res) => {
    res.send('OK');
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
