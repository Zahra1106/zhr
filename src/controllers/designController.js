const SavedDesign = require('../models/SavedDesign');
const Fabric = require('../models/Fabric');
const DesignOption = require('../models/DesignOption');

// Fixed charges (business logic - aap in values ko baad mein admin panel se editable bana sakte hain)
const TAILORING_CHARGE = 1500;
const BRAND_CHARGE = 1000;
const DELIVERY_CHARGE = 300;

// @desc    Calculate price based on selected design (without saving)
// @route   POST /api/designs/calculate-price
exports.calculatePrice = async (req, res) => {
  try {
    const { fabricId, fabricMeters, optionIds } = req.body;
    // optionIds = array of DesignOption _id's selected by user (neck, sleeve, etc.)

    if (!fabricId) {
      return res.status(400).json({ message: 'Fabric is required' });
    }

    const fabric = await Fabric.findById(fabricId);
    if (!fabric) return res.status(404).json({ message: 'Fabric not found' });

    const meters = fabricMeters || 3;
    const fabricCost = fabric.pricePerMeter * meters;

    let optionsCost = 0;
    if (optionIds && optionIds.length > 0) {
      const options = await DesignOption.find({ _id: { $in: optionIds } });
      optionsCost = options.reduce((sum, opt) => sum + (opt.extraCost || 0), 0);
    }

    const totalPrice =
      fabricCost + optionsCost + TAILORING_CHARGE + BRAND_CHARGE + DELIVERY_CHARGE;

    res.status(200).json({
      breakdown: {
        fabricCost,
        optionsCost,
        tailoringCharge: TAILORING_CHARGE,
        brandCharge: BRAND_CHARGE,
        deliveryCharge: DELIVERY_CHARGE,
      },
      estimatedTotal: totalPrice,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save a finalized design
// @route   POST /api/designs
exports.saveDesign = async (req, res) => {
  try {
    const {
      gender, category, fabric, selectedColor, options,
      fabricMeters, designName,
    } = req.body;

    const fabricData = await Fabric.findById(fabric);
    if (!fabricData) return res.status(404).json({ message: 'Fabric not found' });

    const meters = fabricMeters || 3;
    const fabricCost = fabricData.pricePerMeter * meters;

    let optionsCost = 0;
    const optionValues = options ? Object.values(options).filter(Boolean) : [];
    if (optionValues.length > 0) {
      const opts = await DesignOption.find({ _id: { $in: optionValues } });
      optionsCost = opts.reduce((sum, opt) => sum + (opt.extraCost || 0), 0);
    }

    const estimatedPrice =
      fabricCost + optionsCost + TAILORING_CHARGE + BRAND_CHARGE + DELIVERY_CHARGE;

    const design = await SavedDesign.create({
      user: req.user.id,
      gender,
      category,
      fabric,
      selectedColor,
      options,
      fabricMeters: meters,
      estimatedPrice,
      designName,
    });

    res.status(201).json(design);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all designs of logged-in user
// @route   GET /api/designs/my-designs
exports.getMyDesigns = async (req, res) => {
  try {
    const designs = await SavedDesign.find({ user: req.user.id })
      .populate('fabric')
      .populate('category')
      .sort({ createdAt: -1 });
    res.status(200).json(designs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single design by ID
// @route   GET /api/designs/:id
exports.getDesignById = async (req, res) => {
  try {
    const design = await SavedDesign.findById(req.params.id)
      .populate('fabric')
      .populate('category');
    if (!design) return res.status(404).json({ message: 'Design not found' });
    res.status(200).json(design);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a design
// @route   DELETE /api/designs/:id
exports.deleteDesign = async (req, res) => {
  try {
    const design = await SavedDesign.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!design) return res.status(404).json({ message: 'Design not found' });
    res.status(200).json({ message: 'Design deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// @desc    Update an existing saved design
// @route   PUT /api/designs/:id
exports.updateDesign = async (req, res) => {
  try {
    const {
      gender, category, fabric, selectedColor, options,
      fabricMeters, designName,
    } = req.body;

    const fabricData = await Fabric.findById(fabric);
    if (!fabricData) return res.status(404).json({ message: 'Fabric not found' });

    const meters = fabricMeters || 3;
    const fabricCost = fabricData.pricePerMeter * meters;

    let optionsCost = 0;
    const optionValues = options ? Object.values(options).filter(Boolean) : [];
    if (optionValues.length > 0) {
      const opts = await DesignOption.find({ _id: { $in: optionValues } });
      optionsCost = opts.reduce((sum, opt) => sum + (opt.extraCost || 0), 0);
    }

    const TAILORING_CHARGE = 1500;
    const BRAND_CHARGE = 1000;
    const DELIVERY_CHARGE = 300;
    const estimatedPrice =
      fabricCost + optionsCost + TAILORING_CHARGE + BRAND_CHARGE + DELIVERY_CHARGE;

    const design = await SavedDesign.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        gender, category, fabric, selectedColor, options,
        fabricMeters: meters, estimatedPrice, designName,
      },
      { new: true }
    );

    if (!design) return res.status(404).json({ message: 'Design not found' });

    res.status(200).json(design);
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