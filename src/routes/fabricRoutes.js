const express = require('express');
const router = express.Router();
const {
  getFabrics,
  getFabricById,
  createFabric,
  updateFabric,
  deleteFabric,
} = require('../controllers/fabricController');

router.get('/', getFabrics);
router.get('/:id', getFabricById);
router.post('/', createFabric);
router.put('/:id', updateFabric);
router.delete('/:id', deleteFabric);

module.exports = router;