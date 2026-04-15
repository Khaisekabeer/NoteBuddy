const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notes.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, notesController.getNotes);
router.post('/', authenticateToken, notesController.createNote);
router.put('/:id', authenticateToken, notesController.updateNote);
router.delete('/:id', authenticateToken, notesController.deleteNote);

router.patch('/:id/reveal', authenticateToken, notesController.revealNote);
router.patch('/:id/unreveal', authenticateToken, notesController.unrevealNote);
router.patch('/:id/seen', authenticateToken, notesController.markAsSeen);
router.patch('/:id/like', authenticateToken, notesController.likeNote);
router.patch('/:id/unlike', authenticateToken, notesController.unlikeNote);

module.exports = router;
