const express = require('express');
const router = express.Router();
const { queryAll } = require('../database/db');

router.get('/', (req, res) => {
  try {
    const customers = queryAll('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
