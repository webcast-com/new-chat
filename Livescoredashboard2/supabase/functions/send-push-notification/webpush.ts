// Web Push helper for Supabase Edge Functions (Deno / WebCrypto)
// Implements RFC 8292 (VAPID JWT, ES256) and RFC 8291 (aes128gcm encryption)
// without external dependencies.
//
// Env vars:
//   VAPID_SUBJECT       e.g. mailto:admin@scorehub.com
//   VAPID_PUBLIC_KEY    base64url raw 65-byte uncompressed P-256 public key (0x04 || x || y)
//   VAPID_PRIVATE_KEY   base64url raw 32-byte P-256 private key

const encoder = new TextEncoder();

function b64urlEncode(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

/** Build the VAPID Authorization header value (RFC 8292). */
export async function createVapidAuthorization(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string
): Promise<string> {
  const pub = b64urlDecode(publicKeyB64);
  if (pub.length !== 65 || pub[0] !== 4) {
    throw new Error("VAPID_PUBLIC_KEY must be the raw 65-byte uncompressed P-256 point");
  }
  const x = b64urlEncode(pub.slice(1, 33));
  const y = b64urlEncode(pub.slice(33, 65));

  const d = b64urlEncode(b64urlDecode(privateKeyB64));

  const header = b64urlEncode(encoder.encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = b64urlEncode(encoder.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput)
  ));
  // WebCrypto returns r||s as raw 32-byte halves already for P-256
  return `vapid t=${signingInput}.${b64urlEncode(sig)}, k=${publicKeyB64}`;
}

/** Encrypt a payload for a push subscription (RFC 8291, single aes128gcm record). */
export async function encryptPayload(
  clientPublicKeyB64: string, // p256dh
  authSecretB64: string,      // auth
  payload: string
): Promise<{ body: Uint8Array; headers: Record<string, string> }> {
  const clientPub = b64urlDecode(clientPublicKeyB64);
  const authSecret = b64urlDecode(authSecretB64);
  if (clientPub.length !== 65 || clientPub[0] !== 4) {
    throw new Error("p256dh must be the raw 65-byte uncompressed P-256 point");
  }
  const x = b64urlEncode(clientPub.slice(1, 33));
  const y = b64urlEncode(clientPub.slice(33, 65));

  const clientKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y },
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Ephemeral server keypair
  const serverPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverPair.publicKey));

  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverPair.privateKey,
    256
  ));

  // HKDF info: "WebPush: info" || 0x00 || ua_public || as_public
  const info = new Uint8Array(14 + 65 + 65);
  info.set(encoder.encode("WebPush: info"), 0);
  info.set(clientPub, 14);
  info.set(serverPubRaw, 14 + 65);

  const ikm = await hkdf(shared, authSecret, info, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, encoder.encode("Content-Encoding: aes128gcm"), 16);
  const nonce = await hkdf(ikm, salt, encoder.encode("Content-Encoding: nonce"), 12);

  // Payload with padding delimiter (0x02) and zero padding
  const plainBytes = encoder.encode(payload);
  const padded = new Uint8Array(plainBytes.length + 1 + 1);
  padded.set(plainBytes, 0);
  padded[plainBytes.length] = 2; // padding delimiter
  // trailing zeros already 0

  const recordSize = 4096;
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce as BufferSource, additionalData: new Uint8Array([0, 0, recordSize >> 8, recordSize & 255, 0]) },
    await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]),
    padded
  );

  const ciphertext = new Uint8Array(cipher);
  // aes128gcm record: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
  const body = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length);
  body.set(salt, 0);
  body[16] = (recordSize >> 24) & 255;
  body[17] = (recordSize >> 16) & 255;
  body[18] = (recordSize >> 8) & 255;
  body[19] = recordSize & 255;
  body[20] = 65;
  body.set(serverPubRaw, 21);
  body.set(ciphertext, 21 + 65);

  return { body, headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" } };
}

export interface PushMessage {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  url?: string;
  requireInteraction?: boolean;
}

export interface PushDeliveryResult {
  ok: boolean;
  status?: number;
  removed?: boolean;
  error?: string;
}

/**
 * Send a push notification to a subscription.
 * Returns { removed: true } when the endpoint is gone (404/410) so callers can
 * deactivate the subscription row.
 */
export async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  message: PushMessage,
  vapid: { subject: string; publicKey: string; privateKey: string }
): Promise<PushDeliveryResult> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const authorization = await createVapidAuthorization(
      audience,
      vapid.subject,
      vapid.publicKey,
      vapid.privateKey
    );
    const { body, headers } = await encryptPayload(subscription.p256dh_key, subscription.auth_key, JSON.stringify(message));

    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        TTL: "86400",
        Urgency: "normal",
        ...headers,
      },
      body,
    });

    if (res.status === 201 || res.status === 202 || res.status === 200) {
      return { ok: true, status: res.status };
    }
    if (res.status === 404 || res.status === 410) {
      return { ok: false, status: res.status, removed: true };
    }
    if (res.status === 429) {
      return { ok: false, status: res.status, error: "Rate limited" };
    }
    return { ok: false, status: res.status, error: await res.text().catch(() => "") };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
