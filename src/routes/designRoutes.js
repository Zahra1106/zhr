const express = require('express');
const router = express.Router();

const {
  calculatePrice,
  saveDesign,
  getMyDesigns,
  getDesignById,
  deleteDesign,
  updateDesign,
} = require('../controllers/designController');
const { protect } = require('../middleware/authMiddleware');

router.post('/calculate-price', calculatePrice);
router.post('/', protect, saveDesign);
router.get('/my-designs', protect, getMyDesigns);
router.get('/:id', getDesignById);
router.delete('/:id', protect, deleteDesign);
router.put('/:id', protect, updateDesign);

module.exports = router;