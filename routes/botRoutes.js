const express = require('express');
const { hisabAssistant } = require('../controllers/botController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();
router.post('/assist', protect, hisabAssistant); 
module.exports = router;