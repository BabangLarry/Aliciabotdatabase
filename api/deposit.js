const express = require('express');
const axios = require('axios');
const { verifyToken } = require('./auth');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, child } = require('firebase/database');

const router = express.Router();

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

// Create Deposit via Atlantic
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { nominal, type = 'ewallet', method = 'qris' } = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (!nominal || nominal < 1000) {
      return res.status(400).json({ success: false, error: 'Nominal minimal 1000' });
    }

    // Get user's API key
    const username = req.user.username;
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `atlantic_keys/${username}`));
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'API Key tidak ditemukan' });
    }

    const apiData = snapshot.val();
    
    // Check IP whitelist
    if (apiData.ip_whitelist && apiData.ip_whitelist.length > 0) {
      if (!apiData.ip_whitelist.includes(clientIP)) {
        return res.status(403).json({ 
          success: false, 
          error: 'IP tidak diizinkan',
          your_ip: clientIP,
          allowed_ips: apiData.ip_whitelist
        });
      }
    }

    // Generate unique reff_id
    const reff_id = 'REF' + Date.now() + Math.random().toString(36).substr(2, 5);

    // Call Atlantic API
    const atlanticResponse = await axios.post(
      'https://atlantich2h.com/deposit/create',
      new URLSearchParams({
        api_key: apiData.api_key,
        reff_id: reff_id,
        nominal: nominal.toString(),
        type: type,
        metode: method
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Atlantic-Manager/1.0'
        },
        timeout: 30000
      }
    );

    if (atlanticResponse.data.status) {
      res.json({
        success: true,
        data: atlanticResponse.data.data,
        api_key: apiData.api_key,
        saldo: apiData.saldo
      });
    } else {
      res.status(400).json({
        success: false,
        error: atlanticResponse.data.message || 'Gagal membuat deposit'
      });
    }

  } catch (error) {
    console.error('Deposit create error:', error);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: error.response.data?.message || 'Atlantic API error'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Server error: ' + error.message 
      });
    }
  }
});

// Check Deposit Status
router.get('/status/:depositId', verifyToken, async (req, res) => {
  try {
    const { depositId } = req.params;
    const username = req.user.username;

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `atlantic_keys/${username}`));
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'API Key tidak ditemukan' });
    }

    const apiData = snapshot.val();

    const statusResponse = await axios.post(
      'https://atlantich2h.com/deposit/status',
      new URLSearchParams({
        api_key: apiData.api_key,
        id: depositId
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(statusResponse.data);

  } catch (error) {
    console.error('Deposit status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
