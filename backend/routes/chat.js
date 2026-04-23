const router = require('express').Router();
const { chat, report } = require('../controllers/chatController');

router.post('/', chat);
router.post('/report', report);

module.exports = router;
