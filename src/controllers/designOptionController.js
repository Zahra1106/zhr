const DesignOption = require('../models/DesignOption');

// @desc    Get design options (filter by category, e.g. ?category=neck)
// @route   GET /api/design-options
exports.getDesignOptions = async (req, res) => {
  try {
    const { category, gender } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (gender) filter.suitableFor = gender;

    const options = await DesignOption.find(filter).sort({ displayOrder: 1 });
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