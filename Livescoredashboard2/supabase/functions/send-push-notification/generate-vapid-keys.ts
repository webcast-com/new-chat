// Generate VAPID keys for Web Push (RFC 8292).
// Run with:  deno run --allow-net generate-vapid-keys.ts
// (or in Node:  npx tsx generate-vapid-keys.ts)
//
// Prints the three values you need:
//   VAPID_PUBLIC_KEY  -> client env (VITE_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY -> edge function secret
//   VAPID_SUBJECT     -> mailto:you@example.com

function b64url(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
const privJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

const x = new Uint8Array(32);
const y = new Uint8Array(32);
const d = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  x[i] = parseInt(pubJwk.x!.slice(i * 2, i * 2 + 2), 16);
  y[i] = parseInt(pubJwk.y!.slice(i * 2, i * 2 + 2), 16);
  d[i] = parseInt(privJwk.d!.slice(i * 2, i * 2 + 2), 16);
}

const rawPub = new Uint8Array(65);
rawPub[0] = 4;
rawPub.set(x, 1);
rawPub.set(y, 33);

console.log("VAPID_PUBLIC_KEY=" + b64url(rawPub));
console.log("VAPID_PRIVATE_KEY=" + b64url(d));
console.log("VAPID_SUBJECT=mailto:admin@scorehub.com");
console.log("\nStore VAPID_PRIVATE_KEY + VAPID_SUBJECT as edge function secrets and");
console.log("set VITE_VAPID_PUBLIC_KEY in the frontend .env.");
