// fixGroomCategoryTagging.js
//
// One-time fix: the groom-wear design options (neck / sleeve / shirtLength /
// trouser / embroidery / border / print / sideCutStyle / backStyle) were
// imported through the generic "Design Options" admin page, which doesn't
// tag a clothing category — so they all ended up with appliesToCategory:
// null ("All Categories"). That made them the fallback for EVERY men's
// category, not just Groom Wear / Prince Coat.
//
// This script re-tags just those groom-specific option names to the correct
// Category so they only show for Groom Wear / Prince Coat.
//
// HOW TO RUN:
//   1. Place this file in the backend project root (next to server.js)
//   2. Make sure your .env has MONGO_URI set (same one the server uses)
//   3. Run:  node fixGroomCategoryTagging.js "Prince Coat"
//      (replace "Prince Coat" with your exact category name if different)
//
// It's safe to run more than once — already-tagged items are simply skipped.

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const DesignOption = require('./src/models/DesignOption');

const GROOM_OPTION_NAMES = [
  // neck
  'Classic Sherwani Collar', 'Nehru Collar', 'Band Collar with Embroidery',
  'Mandarin Collar', 'Round Neck Kurta', 'Chinese Collar Heavy Work',
  'Open Collar Sherwani Neck', 'Embellished Stand Collar',
  // sleeve
  'Full Sleeve Zari Cuff', 'Embroidered Cuff Sleeve', 'Plain Full Sleeve',
  'Button Cuff Sleeve', 'Roll-Up Sleeve', 'Heavy Work Cuff Sleeve',
  // shirtLength
  'Short Kurta Length', 'Knee Length Sherwani', 'Long Sherwani (Below Knee)',
  'Floor Length Sherwani', 'Asymmetric Groom Length',
  // trouser
  'Churidar Pajama', 'Straight Shalwar', 'Dhoti Style Pant',
  'Slim Fit jeans', 'Traditional Paincha',
  // embroidery
  'Zari Groom Work', 'Dabka Work', 'Tilla Work', 'Gota Patti Work',
  'Resham Embroidery', 'Sequins Groom Work', 'Traditional Hand Work',
  // border
  'Zari Border', 'Gota Border', 'Tilla Border', 'Hand Embroidered Border',
  // print
  'Traditional Motif Print', 'Mughal Print', 'Floral Print', 'Gold Foil Print',
  // sideCutStyle
  'Straight Side Cut', 'Curved Side Slit', 'High Side Slit (Sherwani Style)',
  'Angled Front Cut', 'Traditional Kurta Side Cut', 'Double Slit Panel Cut',
  'Asymmetric Side Cut', 'Layered Side Panel Cut',
  // backStyle
  'Plain Back', 'Embroidered Back Panel', 'Center Back Slit',
  'Box Pleated Back', 'Fitted Waist Back', 'Cape Style Back',
  'Zari Work Back Yoke', 'Long Flowy Back Panel',
];

async function run() {
  const categoryName = process.argv[2] || 'Prince Coat';

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env — aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const category = await Category.findOne({
    name: new RegExp(categoryName, 'i'),
  });

  if (!category) {
    console.error(`No category matching "${categoryName}" found. Check the name and try again.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Target category: "${category.name}" (${category._id})`);

  const result = await DesignOption.updateMany(
    {
      name: { $in: GROOM_OPTION_NAMES },
      appliesToCategory: null,
    },
    { $set: { appliesToCategory: category._id } }
  );

  console.log(`Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);

  // Sanity check: list anything from the name list that still wasn't found
  // at all (e.g. typo, or never imported).
  const stillMissing = [];
  for (const name of GROOM_OPTION_NAMES) {
    const exists = await DesignOption.exists({ name });
    if (!exists) stillMissing.push(name);
  }
  if (stillMissing.length) {
    console.log('\nNames not found in DB at all (check spelling/import):');
    stillMissing.forEach((n) => console.log('  -', n));
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
