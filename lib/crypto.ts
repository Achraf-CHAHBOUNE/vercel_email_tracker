import crypto from 'crypto';

export function generateHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

export function buildSignedURL(baseUrl: string, params: Record<string, string>, secret: string): string {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const signature = generateHMAC(queryString, secret);
  return `${baseUrl}?${queryString}&sig=${signature}`;
}