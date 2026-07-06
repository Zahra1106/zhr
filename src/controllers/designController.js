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