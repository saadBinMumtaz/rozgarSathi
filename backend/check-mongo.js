import { MongoClient } from 'mongodb';

async function run() {
  const client = await MongoClient.connect('mongodb://localhost:27017/rozgar-sathi');
  const db = client.db();
  
  // Check Google OAuth users
  const googleUsers = await db.collection('users').find({ googleId: { $exists: true } }).toArray();
  console.log('Google OAuth users:', googleUsers.length);
  console.log(JSON.stringify(googleUsers, null, 2));
  
  // Check guest sessions
  const guestSessions = await db.collection('sessions').find({ 
    userId: { $regex: /^guest_/ } 
  }).limit(5).toArray();
  console.log('\nSample guest sessions:', guestSessions.length);
  console.log(JSON.stringify(guestSessions, null, 2));
  
  // Check authenticated sessions
  const authSessions = await db.collection('sessions').find({ 
    authenticated: true 
  }).limit(5).toArray();
  console.log('\nAuthenticated sessions:', authSessions.length);
  console.log(JSON.stringify(authSessions, null, 2));
  
  await client.close();
}

run().catch(console.error);
