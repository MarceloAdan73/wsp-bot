const express = require('express');
const router = express.Router();
const path = require('path');

const botPath = path.join(__dirname, '..', '..', 'bot', 'testHandler');
let testHandler;

function initTestBot() {
  try {
    console.log('Cargando testHandler desde:', botPath);
    testHandler = require(botPath);
    console.log('testHandler cargado:', typeof testHandler);
  } catch (e) {
    console.error('Error cargando testHandler:', e.message);
  }
}

initTestBot();

router.post('/message', async (req, res) => {
  try {
    const { message, phone } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!testHandler) {
      return res.status(500).json({ error: 'Test handler not loaded' });
    }

    const result = await testHandler.handleTestMessage(message, phone);
    res.json(result);
  } catch (error) {
    console.error('Error en test message:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/reset', (req, res) => {
  try {
    if (testHandler) {
      testHandler.resetStates();
    }
    res.json({ success: true, message: 'Estados reiniciados' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', (req, res) => {
  try {
    if (!testHandler) {
      return res.status(500).json({ error: 'Test handler not loaded' });
    }
    const notifications = testHandler.getNotifications();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/:id/read', (req, res) => {
  try {
    if (!testHandler) {
      return res.status(500).json({ error: 'Test handler not loaded' });
    }
    testHandler.markNotificationRead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;