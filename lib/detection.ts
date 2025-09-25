export function isEmailProxy(userAgent: string): boolean {
  const proxyPatterns = [
    'googleimageproxy',
    'apple/cfnetwork',
    'mozilla/5.0 (compatible; yahoo! slurp',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'whatsapp',
    'telegrambot'
  ];
  
  const ua = userAgent.toLowerCase();
  return proxyPatterns.some(pattern => ua.includes(pattern));
}

export function isSecurityScanner(userAgent: string): boolean {
  const scannerPatterns = [
    'proofpoint',
    'mimecast',
    'barracuda',
    'ironport',
    'symantec',
    'sophos',
    'trendmicro',
    'urlscanner',
    'safelink',
    'checkpoint',
    'fortinet',
    'fireeye',
    'msft-gc',
    'microsoft office',
    'outlook',
    'atp/',
    'defender'
  ];
  
  const ua = userAgent.toLowerCase();
  return scannerPatterns.some(pattern => ua.includes(pattern));
}