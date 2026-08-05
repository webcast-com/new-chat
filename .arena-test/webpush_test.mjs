// Round-trip test for the Web Push helper (RFC 8291/8292) using WebCrypto.
// Simulates: browser generates subscription (ECDH pair + auth secret),
// server encrypts + signs (the helper), browser decrypts + verifies JWT.
import { createHash, createHmac, verify as nodeVerify } from 'node:crypto';

const encoder = new TextEncoder();
const b64url = (input) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return Buffer.from(bin, 'binary').toString('base64url');
};
const b64urlDecode = (s) => new Uint8Array(Buffer.from(s, 'base64url'));

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

// --- 1. Server VAPID keypair ---
const serverPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
// Build raw 65-byte public key + raw 32-byte private from JWK
const serverJwk = await crypto.subtle.exportKey('jwk', serverPair.publicKey);
const serverPrivJwk = await crypto.subtle.exportKey('jwk', serverPair.privateKey);
const x = b64urlDecode(serverJwk.x), y = b64urlDecode(serverJwk.y);
const rawPub = new Uint8Array(65); rawPub[0] = 4; rawPub.set(x, 1); rawPub.set(y, 33);
const rawPriv = b64urlDecode(serverPrivJwk.d);
console.log('VAPID_PUBLIC_KEY =', b64url(rawPub));
console.log('VAPID_PRIVATE_KEY =', b64url(rawPriv));

// --- 2. Browser subscription (p256dh + auth) ---
const clientEcdh = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const clientPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', clientEcdh.publicKey));
const authSecret = crypto.getRandomValues(new Uint8Array(16));
console.log('p256dh =', b64url(clientPubRaw));
console.log('auth =', b64url(authSecret));

// --- 3. Import the helper and send ---
const { createVapidAuthorization, encryptPayload } = await import('../Livescoredashboard2/supabase/functions/send-push-notification/webpush.ts');
const audience = 'https://fcm.googleapis.com';
const message = JSON.stringify({ title: 'ScoreHub', body: 'Test goal alert!', icon: '/favicon.svg', url: '/' });

const authHeader = await createVapidAuthorization(audience, 'mailto:admin@scorehub.com', b64url(rawPub), b64url(rawPriv));
console.log('\nAuthorization header:', authHeader.slice(0, 80) + '...');

// Verify the JWT signature with node crypto (independent verifier)
const token = authHeader.split('vapid t=')[1].split(', k=')[0];
const [h, p, s] = token.split('.');
const sig = b64urlDecode(s);
const jwkPub = { kty: 'EC', crv: 'P-256', x: serverJwk.x, y: serverJwk.y };
const keyObj = await crypto.subtle.importKey('jwk', jwkPub, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keyObj, sig, encoder.encode(`${h}.${p}`));
console.log('JWT signature valid:', valid);
if (!valid) process.exit(1);

// Also decode the JWT claims
const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
console.log('JWT claims:', JSON.stringify(claims));
if (claims.aud !== audience) process.exit(1);

// --- 4. Encrypt + decrypt round-trip ---
const { body, headers } = await encryptPayload(b64url(clientPubRaw), b64url(authSecret), message);
console.log('Content-Encoding:', headers['Content-Encoding']);
console.log('Record length:', body.length);

// Browser-side decrypt (independent implementation)
const salt = body.slice(0, 16);
const rs = (body[16] << 24) | (body[17] << 16) | (body[18] << 8) | body[19];
const idLen = body[20];
const serverPub = body.slice(21, 21 + idLen);
const ciphertext = body.slice(21 + idLen);
console.log('rs:', rs, 'idLen:', idLen, 'serverPub[0]:', serverPub[0]);

const clientJwk = await crypto.subtle.exportKey('jwk', clientEcdh.publicKey);
const serverPubKey = await crypto.subtle.importKey('jwk', {
  kty: 'EC', crv: 'P-256',
  x: b64url(serverPub.slice(1, 33)), y: b64url(serverPub.slice(33, 65)),
}, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: serverPubKey }, clientEcdh.privateKey, 256));

const info = new Uint8Array(14 + 65 + 65);
info.set(encoder.encode('WebPush: info'), 0);
info.set(clientPubRaw, 14);
info.set(serverPub, 14 + 65);

const ikm = await hkdf(shared, authSecret, info, 32);
const cek = await hkdf(ikm, salt, encoder.encode('Content-Encoding: aes128gcm'), 16);
const nonce = await hkdf(ikm, salt, encoder.encode('Content-Encoding: nonce'), 12);

const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
const plain = new Uint8Array(await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv: nonce, additionalData: new Uint8Array([0, 0, (rs >> 8) & 255, rs & 255, 0]) },
  aesKey,
  ciphertext
));

// Unpad: strip trailing 0x00 then the 0x02 delimiter
let end = plain.length;
while (end > 0 && plain[end - 1] === 0) end--;
if (plain[end - 1] !== 2) { console.error('Missing padding delimiter'); process.exit(1); }
const decoded = new TextDecoder().decode(plain.slice(0, end - 1));
console.log('Decrypted payload:', decoded);
if (decoded !== message) { console.error('Payload mismatch'); process.exit(1); }

// --- 5. Wrong auth secret must fail (sanity) ---
const badAuth = crypto.getRandomValues(new Uint8Array(16));
const badIkm = await hkdf(shared, badAuth, info, 32);
const badCek = await hkdf(badIkm, salt, encoder.encode('Content-Encoding: aes128gcm'), 16);
const badNonce = await hkdf(badIkm, salt, encoder.encode('Content-Encoding: nonce'), 12);
let failed = false;
try {
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv: badNonce }, await crypto.subtle.importKey('raw', badCek, 'AES-GCM', false, ['decrypt']), ciphertext);
} catch { failed = true; }
console.log('Wrong auth rejected:', failed);

console.log('\n✅ All web-push crypto checks passed');
