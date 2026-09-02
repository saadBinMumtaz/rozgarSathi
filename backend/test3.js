import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
const JWT_SECRET = 'rozgar-sathi-hackathon-secret-key';
const API_BASE = 'http://localhost:5000/api';
console.log('TEST 3: Server-Side JWT Rejection');
console.log('='.repeat(50));
const testUserId = 'test_user_123';
const validToken = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '1h' });
console.log('Valid token generated');
const tamperedToken = jwt.sign({ userId: 'tampered' }, 'wrong_secret');
console.log('Tampered token generated');
const expiredToken = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '0s' });
await new Promise(r => setTimeout(r, 1000));
console.log('Expired token generated');
const testEndpoint = async (token, label) => {
  const url = API_BASE + '/auth/me';
  const res = await fetch(url, {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
  const data = await res.json();
  console.log(label + ': ' + res.status + ' - ' + (data.code || 'OK'));
  return res.status;
};
const tamperedStatus = await testEndpoint(tamperedToken, 'Tampered token');
const expiredStatus = await testEndpoint(expiredToken, 'Expired token');
const noTokenStatus = await testEndpoint(null, 'No token');
if (tamperedStatus === 401 || tamperedStatus === 403) { console.log('PASS: Tampered token rejected'); } else { console.log('FAIL: Tampered token not rejected'); }
if (expiredStatus === 401 || expiredStatus === 403) { console.log('PASS: Expired token rejected'); } else { console.log('FAIL: Expired token not rejected'); }
