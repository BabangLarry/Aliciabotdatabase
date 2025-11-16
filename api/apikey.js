const express = require('express');
const axios = require('axios');
const { verifyToken } = require('./auth');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set, child, update } = require('firebase/database');

const router = express.Router();

// Firebase configuration (same as auth.js)
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

// Get or Create API Key
router.get('/', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `atlantic_keys/${username}`));
    
    if (snapshot.exists()) {
      const apiData = snapshot.val();
      res.json({
        success: true,
        api_key: apiData.api_key,
        saldo: apiData.saldo || 0,
        ip_whitelist: apiData.ip_whitelist || [],
        created_at: apiData.created_at
      });
    } else {
      // Generate new API key
      const newApiKey = 'atlantic_' + require('crypto').randomBytes(16).toString('hex');
      const apiData = {
        api_key: newApiKey,
        saldo: 0,
        ip_whitelist: [],
        created_at: new Date().toISOString(),
        username: username
      };
      
      await set(ref(database, `atlantic_keys/${username}`), apiData);
      
      res.json({
        success: true,
        api_key: newApiKey,
        saldo: 0,
        ip_whitelist: [],
        created_at: apiData.created_at
      });
    }
  } catch (error) {
    console.error('API Key error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Refresh API Key
router.post('/refresh', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const newApiKey = 'atlantic_' + require('crypto').randomBytes(16).toString('hex');
    
    const updates = {
      api_key: newApiKey,
      updated_at: new Date().toISOString()
    };
    
    await update(ref(database, `atlantic_keys/${username}`), updates);
    
    res.json({
      success: true,
      api_key: newApiKey,
      message: 'API Key berhasil di-refresh'
    });
  } catch (error) {
    console.error('Refresh API Key error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update IP Whitelist
router.post('/whitelist', verifyToken, async (req, res) => {
  try {
    const { ip_addresses } = req.body;
    const username = req.user.username;
    
    if (!Array.isArray(ip_addresses)) {
      return res.status(400).json({ success: false, error: 'IP addresses harus array' });
    }
    
    await update(ref(database, `atlantic_keys/${username}`), {
      ip_whitelist: ip_addresses,
      whitelist_updated: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'IP whitelist berhasil diupdate',
      ip_whitelist: ip_addresses
    });
  } catch (error) {
    console.error('Whitelist error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Check Atlantic Balance
router.get('/saldo', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `atlantic_keys/${username}`));
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'API Key tidak ditemukan' });
    }
    
    const apiData = snapshot.val();
    
    // Get balance from Atlantic API
    const balanceResponse = await axios.post('https://atlantich2h.com/profile', 
      new URLSearchParams({ api_key: apiData.api_key }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    if (balanceResponse.data.status) {
      const saldo = balanceResponse.data.data.balance;
      
      // Update saldo in database
      await update(ref(database, `atlantic_keys/${username}`), {
        saldo: saldo,
        last_checked: new Date().toISOString()
      });
      
      res.json({
        success: true,
        saldo: saldo,
        currency: 'IDR'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Gagal mengambil saldo dari Atlantic'
      });
    }
  } catch (error) {
    console.error('Saldo check error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
