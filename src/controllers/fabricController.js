const Fabric = require('../models/Fabric');

// @desc    Get all fabrics (with optional filters)
// @route   GET /api/fabrics
exports.getFabrics = async (req, res) => {
  try {
    const { type, gender, maxPrice } = req.query;
    const filter = { isActive: true };

    if (type) filter.type = type;
    if (gender) filter.suitableFor = gender;
    if (maxPrice) filter.pricePerMeter = { $lte: Number(maxPrice) };

    const fabrics = await Fabric.find(filter);
    res.status(200).json(fabrics);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single fabric by ID
// @route   GET /api/fabrics/:id
exports.getFabricById = async (req, res) => {
  try {
    const fabric = await Fabric.findById(req.params.id);
    if (!fabric) return res.status(404).json({ message: 'Fabric not found' });
    res.status(200).json(fabric);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create new fabric (Admin)
// @route   POST /api/fabrics
exports.createFabric = async (req, res) => {
  try {
    const fabric = await Fabric.create(req.body);
    res.status(201).json(fabric);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update fabric (Admin)
// @route   PUT /api/fabrics/:id
exports.updateFabric = async (req, res) => {
  try {
    const fabric = await Fabric.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!fabric) return res.status(404).json({ message: 'Fabric not found' });
    res.status(200).json(fabric);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete fabric (Admin)
// @route   DELETE /api/fabrics/:id
exports.deleteFabric = async (req, res) => {
  try {
    const fabric = await Fabric.findByIdAndDelete(req.params.id);
    if (!fabric) return res.status(404).json({ message: 'Fabric not found' });
    res.status(200).json({ message: 'Fabric deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};