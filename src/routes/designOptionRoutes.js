const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  getDesignOptions,
  createDesignOption,
  updateDesignOption,
  deleteDesignOption,
  bulkImportDesignOptions,
} = require('../controllers/designOptionController');

router.get('/', getDesignOptions);
router.post('/bulk-import', upload.single('file'), bulkImportDesignOptions);
router.post('/', createDesignOption);
router.put('/:id', updateDesignOption);
router.delete('/:id', deleteDesignOption);

module.exports = router;