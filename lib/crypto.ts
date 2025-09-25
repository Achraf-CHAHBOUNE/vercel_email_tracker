export async function generateHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
  try {
    const expectedSignature = await generateHMAC(data, secret);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

export async function buildSignedURL(baseUrl: string, params: Record<string, string>, secret: string): Promise<string> {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const signature = await generateHMAC(queryString, secret);
  return `${baseUrl}?${queryString}&sig=${signature}`;
}