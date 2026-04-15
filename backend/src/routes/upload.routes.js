const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notes.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const upload = require('../config/multer');

router.post('/', authenticateToken, upload.array('media', 5), notesController.uploadMedia);

module.exports = router;
