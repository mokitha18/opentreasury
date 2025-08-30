const express = require('express');
const app = express();
const pool = require('./database');  // Make sure you have the correct path to the database file
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to parse incoming JSON data and enable CORS
app.use(express.json());
app.use(cors());

// JWT middleware to protect routes
const jwtMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];  // Extract token from the header

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, 'your_jwt_secret');
        req.user = decoded;  // Attach decoded user info to the request object
        next();  // Proceed to the next route
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// POST route to register a new user
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    // Check if username already exists
    const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
});

// POST route to log in
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Check if user exists
    const [user] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (user.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user[0].password_hash);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user[0].id, role: user[0].role }, 'your_jwt_secret', { expiresIn: '1h' });

    res.json({ message: 'Login successful', token });
});

// GET route to fetch events
app.get('/events', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route to add a new event (protected route)
app.post('/events', jwtMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });  // Only admin can add events
    }

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

// GET route to fetch transactions
app.get('/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route to add a new transaction (protected route)
app.post('/transactions', jwtMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });  // Only admin can add transactions
    }

    const { event_name, amount, date } = req.body;

    if (!event_name || amount === undefined || !date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
