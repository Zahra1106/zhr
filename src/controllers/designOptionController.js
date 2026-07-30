const DesignOption = require('../models/DesignOption');

// @desc    Get design options (filter by category, gender, and clothing category)
// @route   GET /api/design-options
exports.getDesignOptions = async (req, res) => {
  try {
    const { category, gender, categoryId } = req.query;
    const baseFilter = { isActive: true };

    if (category) baseFilter.category = category;
    if (gender) baseFilter.suitableFor = gender;

    if (categoryId) {
      // First check if there are any options specifically tagged for this
      // clothing category (e.g. Bridal Wear). If so, ONLY those are shown —
      // generic options are hidden, so Bridal never sees plain/basic options.
      const specificOptions = await DesignOption.find({
        ...baseFilter,
        appliesToCategory: categoryId,
      }).sort({ displayOrder: 1 });

      if (specificOptions.length > 0) {
        return res.status(200).json(specificOptions);
      }

      // No category-specific options exist for this design category —
      // fall back to generic (appliesToCategory: null) ones.
      const genericOptions = await DesignOption.find({
        ...baseFilter,
        appliesToCategory: null,
      }).sort({ displayOrder: 1 });

      return res.status(200).json(genericOptions);
    }

    // No clothing category specified — just return everything matching filters
    const options = await DesignOption.find(baseFilter).sort({ displayOrder: 1 });
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create new design option (Admin)
// @route   POST /api/design-options
exports.createDesignOption = async (req, res) => {
  try {
    const option = await DesignOption.create(req.body);
    res.status(201).json(option);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update design option (Admin)
// @route   PUT /api/design-options/:id
exports.updateDesignOption = async (req, res) => {
  try {
    const option = await DesignOption.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!option) return res.status(404).json({ message: 'Design option not found' });
    res.status(200).json(option);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete design option (Admin)
// @route   DELETE /api/design-options/:id
exports.deleteDesignOption = async (req, res) => {
  try {
    const option = await DesignOption.findByIdAndDelete(req.params.id);
    if (!option) return res.status(404).json({ message: 'Design option not found' });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
const csv = require('csv-parser');
const { Readable } = require('stream');

// @desc    Bulk import design options from CSV
// @route   POST /api/design-options/bulk-import
exports.bulkImportDesignOptions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csv())
      .on('data', (row) => {
        const suitableFor = row.suitableFor
          ? row.suitableFor.split('|').map((g) => g.trim()).filter(Boolean)
          : ['women'];

        results.push({
          category: row.category,
          name: row.name,
          image: row.image || '',
          extraCost: Number(row.extraCost) || 0,
          suitableFor,
          displayOrder: Number(row.displayOrder) || 0,
        });
      })
      .on('end', async () => {
        try {
          const validResults = results.filter(
            (r) => r.name && r.name.trim() !== '' && r.category
          );

          if (validResults.length === 0) {
            return res.status(400).json({ message: 'No valid design options found in CSV' });
          }

          const DesignOption = require('../models/DesignOption');
          const inserted = await DesignOption.insertMany(validResults);
          res.status(201).json({
            message: `${inserted.length} design options imported successfully`,
            count: inserted.length,
          });
        } catch (err) {
          res.status(500).json({ message: 'Error saving design options', error: err.message });
        }
      })
      .on('error', (err) => {
        res.status(500).json({ message: 'Error parsing CSV', error: err.message });
      });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// @desc    One-time cleanup: fix bridal-named options that were imported
//          under generic categories, and remove duplicate entries.
// @route   POST /api/design-options/fix-bridal-categories
exports.fixBridalCategories = async (req, res) => {
  try {
    const categoryMap = {
      neck: 'bridalNeck',
      sleeve: 'bridalSleeve',
      shirtLength: 'bridalShirtLength',
      trouser: 'bridalTrouser',
      dupatta: 'bridalDupatta',
      embroidery: 'bridalEmbroidery',
      border: 'bridalBorder',
      print: 'bridalPrint',
    };

    // Names that should belong to Bridal (only these get moved/re-tagged)
    const bridalNamePatterns = [
      'bridal', 'sweetheart', 'sabyasachi', 'zardozi', 'kundan', 'dabka',
      'nagh work', 'tilla', 'gota', 'zari', 'gharara', 'sharara', 'farshi',
      'dhoti pant', 'paincha', 'kalamkari',
    ];

    const isBridalName = (name) => {
      const lower = name.toLowerCase();
      return bridalNamePatterns.some((p) => lower.includes(p));
    };

    let recategorized = 0;
    let duplicatesRemoved = 0;

    for (const [oldCat, newCat] of Object.entries(categoryMap)) {
      const docs = await DesignOption.find({ category: oldCat });

      for (const doc of docs) {
        if (isBridalName(doc.name)) {
          doc.category = newCat;
          await doc.save();
          recategorized++;
        }
      }
    }

    // Remove duplicates: same name + same category, keep the oldest one
    const allDocs = await DesignOption.find().sort({ createdAt: 1 });
    const seen = new Map();
    const toDelete = [];

    for (const doc of allDocs) {
      const key = `${doc.category}::${doc.name}`;
      if (seen.has(key)) {
        toDelete.push(doc._id);
      } else {
        seen.set(key, doc._id);
      }
    }

    if (toDelete.length > 0) {
      await DesignOption.deleteMany({ _id: { $in: toDelete } });
      duplicatesRemoved = toDelete.length;
    }

    res.status(200).json({
      message: `Cleanup complete: ${recategorized} options recategorized to bridal, ${duplicatesRemoved} duplicates removed`,
      recategorized,
      duplicatesRemoved,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};