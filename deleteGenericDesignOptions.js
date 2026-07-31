// deleteGenericDesignOptions.js
//
// Deletes ALL design options that are "generic" (appliesToCategory: null,
// i.e. shown for "All Categories"). Options tagged to a specific category
// (Bridal Wear, Prince Coat / Groom Wear, or any other) are NOT touched.
//
// Use this before re-importing a fresh "normal" design options CSV, so you
// don't end up with duplicates or stale/wrong entries mixed in.
//
// HOW TO RUN:
//   1. Place this file in the backend project root (next to server.js)
//   2. Make sure your .env has MONGO_URI set (same one the server uses)
//   3. Run:  node deleteGenericDesignOptions.js
//      (add --confirm at the end to actually delete; without it, the
//       script only shows you a preview/count so nothing is deleted by
//       accident)
//
//      Preview:  node deleteGenericDesignOptions.js
//      Delete:   node deleteGenericDesignOptions.js --confirm

require('dotenv').config();
const mongoose = require('mongoose');
const DesignOption = require('./src/models/DesignOption');

async function run() {
  const shouldDelete = process.argv.includes('--confirm');

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env — aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const filter = { appliesToCategory: null };

  const matching = await DesignOption.find(filter).select('category name suitableFor');
  console.log(`Found ${matching.length} generic ("All Categories") design options:`);
  matching.forEach((d) =>
    console.log(`  - [${d.category}] ${d.name}  (suitableFor: ${(d.suitableFor || []).join(', ')})`)
  );

  if (!shouldDelete) {
    console.log(`\nThis was a PREVIEW only — nothing was deleted.`);
    console.log(`Run again with --confirm to actually delete these ${matching.length} options:`);
    console.log(`  node deleteGenericDesignOptions.js --confirm`);
  } else {
    const result = await DesignOption.deleteMany(filter);
    console.log(`\nDeleted ${result.deletedCount} generic design options.`);
    console.log('Bridal Wear and Prince Coat (Groom) tagged options were NOT touched.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});