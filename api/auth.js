const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, child } = require('firebase/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHjFB_zoF32mpoakAzwI2PqH9w2RDKlZo",
  authDomain: "zlynzeeoffc.firebaseapp.com",
  databaseURL: "https://zlynzeeoffc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "zlynzeeoffc",
  storageBucket: "zlynzeeoffc.firebasestorage.app",
  messagingSenderId: "818301361213",
  appId: "1:818301361213:web:fc8d4fdbb540f94ce75e54",
  measurementId: "G-ETB7ZWYZH6"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password diperlukan' });
    }

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users/${username}`));
    
    if (!snapshot.exists()) {
      return res.status(401).json({ success: false, error: 'User tidak ditemukan' });
    }

    const userData = snapshot.val();
    
    // Simple password check (you can use bcrypt for better security)
    if (userData.password !== password) {
      return res.status(401).json({ success: false, error: 'Password salah' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: username,
        userId: userData.userId || username 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: token,
      user: {
        username: username,
        name: userData.name || username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token diperlukan' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token tidak valid' });
  }
};

module.exports = { router, verifyToken };
