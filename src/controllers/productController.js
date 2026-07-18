const Product = require('../models/Product');
const csv = require('csv-parser');
const { Readable } = require('stream');

// @desc    Get all products (with filters)
// @route   GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const { gender, category, featured } = req.query;
    const filter = { isActive: true };

    if (gender) filter.gender = gender;
    if (category) filter.category = category;
    if (featured) filter.isFeatured = true;

    const products = await Product.find(filter)
      .populate('category')
      .sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create product (Admin)
// @route   POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update product (Admin)
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Bulk import products from CSV
// @route   POST /api/products/bulk-import
exports.bulkImportProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csv())
      .on('data', (row) => {
        // Parse sizes format: "S:10,M:15,L:8"
        const sizes = row.sizes
          ? row.sizes.split(',').map((s) => {
              const [size, stock] = s.split(':');
              return { size: size.trim(), stock: Number(stock?.trim()) || 0 };
            })
          : [];

        // Parse images format: "url1|url2|url3"
        const images = row.images
          ? row.images.split('|').map((i) => i.trim()).filter(Boolean)
          : [];

        results.push({
          name: row.name,
          description: row.description || '',
          price: Number(row.price) || 0,
          discountPercent: Number(row.discount) || 0,
          gender: row.gender || 'women',
          fabric: row.fabric || '',
          sizes,
          images,
          isFeatured: row.featured?.toLowerCase() === 'true',
        });
      })
      .on('end', async () => {
        try {
          // Filter out empty/invalid rows (e.g. trailing blank lines in CSV)
          const validResults = results.filter(
            (r) => r.name && r.name.trim() !== '' && r.price
          );

          if (validResults.length === 0) {
            return res.status(400).json({ message: 'No valid products found in CSV' });
          }

          const inserted = await Product.insertMany(validResults);
          res.status(201).json({
            message: `${inserted.length} products imported successfully`,
            count: inserted.length,
          });
        } catch (err) {
          res.status(500).json({ message: 'Error saving products', error: err.message });
        }
      })
      .on('error', (err) => {
        res.status(500).json({ message: 'Error parsing CSV', error: err.message });
      });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};