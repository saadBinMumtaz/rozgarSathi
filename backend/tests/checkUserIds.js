import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Session from '../src/models/Session.model.js';

async function main() {
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  
  const total = await Session.countDocuments();
  const legacy = await Session.countDocuments({ userId: { $regex: /^guest_/ } });
  const grouped = await Session.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const completed = await Session.countDocuments({ status: 'completed' });
  const completedByMode = await Session.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$mode', count: { $sum: 1 } } }
  ]);

  console.log('=== Session Database Status ===');
  console.log('Total sessions:', total);
  console.log('Completed sessions:', completed);
  console.log('Legacy guest_* sessions:', legacy);
  console.log('Completed by mode:', JSON.stringify(completedByMode));
  console.log('\nUserId groups (top 10):');
  for (const g of grouped) {
    console.log(`  ${g._id}: ${g.count} session(s)`);
  }

  // Test the dashboard query that the fix uses
  const testUserId = grouped.length > 0 ? grouped[0]._id : 'guest';
  const query = testUserId.startsWith('user_')
    ? { $or: [{ userId: testUserId }, { userId: { $regex: /^guest_/ } }] }
    : { userId: testUserId };
  const foundSessions = await Session.countDocuments(query);
  console.log(`\nDashboard query for userId="${testUserId}" would find: ${foundSessions} sessions`);

  await mongoose.disconnect();
}

main().catch(e => { console.error('DB Error:', e.message); process.exit(1); });
