console.log('Starting test...');

try {
  const { retrieveTechnicalQuestions, retrieveBehavioralQuestions } = await import('./src/services/retrieval.js');
  console.log('Module loaded successfully');

  const jdAnalysis = {
    technicalFocus: ['React', 'Node.js'],
    skills: ['React', 'Node.js', 'MongoDB', 'REST API'],
    keywords: ['frontend', 'backend', 'database'],
    behavioralFocus: ['teamwork', 'leadership']
  };

  console.log('\n=== Technical Questions ===');
  const techQs = retrieveTechnicalQuestions({ jdAnalysis, limit: 5 });
  console.log(`Found ${techQs.length} questions`);
  techQs.forEach((q, i) => {
    console.log(`\nQ${i+1}: ${q.text.substring(0, 80)}...`);
    console.log(`  matchedTerms: [${q.matchedTerms.join(', ')}]`);
  });

  console.log('\n\n=== Behavioral Questions ===');
  const behavQs = retrieveBehavioralQuestions({ jdAnalysis, limit: 3 });
  console.log(`Found ${behavQs.length} questions`);
  behavQs.forEach((q, i) => {
    console.log(`\nQ${i+1}: ${q.text.substring(0, 80)}...`);
    console.log(`  matchedTerms: [${q.matchedTerms.join(', ')}]`);
  });
} catch (err) {
  console.error('Error:', err);
}
console.log('Starting test...');

try {
  const { retrieveTechnicalQuestions, retrieveBehavioralQuestions } = await import('./src/services/retrieval.js');
  console.log('Module loaded successfully');

  const jdAnalysis = {
    technicalFocus: ['React', 'Node.js'],
    skills: ['React', 'Node.js', 'MongoDB', 'REST API'],
    keywords: ['frontend', 'backend', 'database'],
    behavioralFocus: ['teamwork', 'leadership']
  };

  console.log('\n=== Technical Questions ===');
  const techQs = retrieveTechnicalQuestions({ jdAnalysis, limit: 5 });
  console.log(`Found ${techQs.length} questions`);
  techQs.forEach((q, i) => {
    console.log(`\nQ${i+1}: ${q.text.substring(0, 80)}...`);
    console.log(`  matchedTerms: [${q.matchedTerms.join(', ')}]`);
  });

  console.log('\n\n=== Behavioral Questions ===');
  const behavQs = retrieveBehavioralQuestions({ jdAnalysis, limit: 3 });
  console.log(`Found ${behavQs.length} questions`);
  behavQs.forEach((q, i) => {
    console.log(`\nQ${i+1}: ${q.text.substring(0, 80)}...`);
    console.log(`  matchedTerms: [${q.matchedTerms.join(', ')}]`);
  });
} catch (err) {
  console.error('Error:', err);
}
import { retrieveTechnicalQuestions, retrieveBehavioralQuestions } from './src/services/retrieval.js';

const jdAnalysis = {
  technicalFocus: ['React', 'Node.js'],
  skills: ['React', 'Node.js', 'MongoDB', 'REST API'],
  keywords: ['frontend', 'backend', 'database'],
  behavioralFocus: ['teamwork', 'leadership']
};

console.log('=== Technical Questions ===');
const techQs = retrieveTechnicalQuestions({ jdAnalysis, limit: 5 });
techQs.forEach((q, i) => {
  console.log(`\nQ${i+1}: ${q.text.substring(0, 80)}...`);
  console.log(`  matchedTerms: [${q.matchedTerms.join(', ')}]`);
});

console.log('\n\n=== Behavioral Questions ===');
const behavQs = retrieveBehavioralQuestions({ jdAnalysis, limit: 3 });
behavQs.forEach((q, i) => {
  console.log(`\nQ${i+1}: ${q.text.substring(0, 80)}...`);
  console.log(`  matchedTerms: [${q.matchedTerms.join(', ')}]`);
});
