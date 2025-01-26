const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();
const JWT_SECRET = '5hbJJF+uPFaAs2QVO/PQx+vB+WpX0HmAzrbqJoj';

// Rejestracja użytkownika
router.post('/register', async (req, res) => {
  const { username, name, email, phone_number, password } = req.body;

  try {
    const userCheck = await pool.query('SELECT * FROM owners WHERE email = $1 OR username = $2', [email, username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).send({ error: 'User with this email or username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO owners (username, name, email, phone_number, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING owner_id, username, email',
      [username, name, email, phone_number, hashedPassword]
    );

    res.status(201).send({ message: 'User registered successfully.', user: result.rows[0] });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).send({ error: 'Error during registration.' });
  }
});

// Logowanie użytkownika
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCheck = await pool.query('SELECT * FROM owners WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(400).send({ error: 'Invalid email or password.' });
    }

    const user = userCheck.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).send({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { owner_id: user.owner_id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).send({ message: 'Login successful.', token, user: { owner_id: user.owner_id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send({ error: 'Error during login.' });
  }
});

// Pobieranie danych użytkownika
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).send({ user: decoded });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(401).send({ error: 'Invalid token.' });
  }
});

module.exports = router;
