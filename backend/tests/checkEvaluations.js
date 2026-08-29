import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Session from '../src/models/Session.model.js';

async function main() {
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  // Check completed sessions with evaluations per mode
  const modes = ['behavioral', 'technical', 'coding'];
  
  for (const mode of modes) {
    const sessions = await Session.find({ mode, status: 'completed' }).lean();
    let totalEvals = 0;
    let sessionsWithEvals = 0;
    
    for (const s of sessions) {
      const evals = (s.questions || []).map(q => q.evaluation).filter(Boolean);
      if (evals.length > 0) {
        sessionsWithEvals++;
        totalEvals += evals.length;
      }
    }
    
    console.log(`\n${mode.toUpperCase()}:`);
    console.log(`  Completed sessions: ${sessions.length}`);
    console.log(`  Sessions with evaluations: ${sessionsWithEvals}`);
    console.log(`  Total evaluations: ${totalEvals}`);
    
    // Show a sample evaluation
    for (const s of sessions) {
      const evals = (s.questions || []).map(q => q.evaluation).filter(Boolean);
      if (evals.length > 0) {
        const ev = evals[0];
        console.log(`  Sample eval: score=${ev.score}, strength="${(ev.strength || '').substring(0, 60)}", missing="${(ev.missing || '').substring(0, 60)}"`);
        break;
      }
    }
  }

  // Test what the dashboard would compute for the legacy recovery query
  console.log('\n=== Dashboard Simulation (with legacy recovery) ===');
  const allSessions = await Session.find({
    $or: [
      { userId: { $regex: /^user_/ } },
      { userId: { $regex: /^guest/ } }
    ]
  }).lean();
  
  console.log(`Total sessions found by recovery query: ${allSessions.length}`);
  
  const completedAll = allSessions.filter(s => s.status === 'completed');
  console.log(`Completed sessions: ${completedAll.length}`);
  
  for (const mode of modes) {
    const modeSessions = completedAll.filter(s => s.mode === mode);
    const evals = modeSessions.flatMap(s => 
      (s.questions || []).map(q => q.evaluation).filter(Boolean)
    );
    const avgScore = evals.length > 0 
      ? Math.round(evals.reduce((sum, e) => sum + (e.score || 0), 0) / evals.length)
      : 0;
    console.log(`  ${mode}: ${modeSessions.length} sessions, ${evals.length} evals, avg score: ${avgScore}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error('DB Error:', e.message); process.exit(1); });
