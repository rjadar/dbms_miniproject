// Run with mongosh mongodb://localhost:27018 database/mongodb/seed.js
db = db.getSiblingDB('impact_demo');
db.component_notes.updateOne(
  { componentName: 'payment-service' },
  { $set: { componentName: 'payment-service', tags: ['payments', 'sensitive'],
    note: 'Uses the payment provider adapter; review before changing the order contract.', updatedAt: new Date() } },
  { upsert: true }
);
