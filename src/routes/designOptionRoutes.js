const express = require('express');
const router = express.Router();
const {
  getDesignOptions,
  createDesignOption,
  updateDesignOption,
  deleteDesignOption,
} = require('../controllers/designOptionController');

router.get('/', getDesignOptions);
router.post('/', createDesignOption);
router.put('/:id', updateDesignOption);
router.delete('/:id', deleteDesignOption);

module.exports = router;