const encoder = new TextEncoder();

// Retrieve the session secret from environment variables
const getSecretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured in environment variables");
  }
  return secret;
};

/**
 * Sign a payload into a JWT using HMAC SHA-256 via Web Crypto API.
 */
export async function signJWT(payload: { email: string }, expiresInSeconds = 60 * 60 * 24): Promise<string> {
  const secret = getSecretKey();
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  const encodedPayload = btoa(JSON.stringify({ ...payload, exp }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${data}.${encodedSignature}`;
}

/**
 * Verify a JWT using HMAC SHA-256 via Web Crypto API.
 * Returns the payload if valid, or null if invalid or expired.
 */
export async function verifyJWT(token: string): Promise<{ email: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  
  try {
    const secret = getSecretKey();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const data = `${header}.${payload}`;
    const sigBytes = new Uint8Array(
      atob(signature.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map(c => c.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    
    // Check expiration
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return { email: decodedPayload.email };
  } catch (error) {
    console.error("JWT Verification failed:", error);
    return null;
  }
}
