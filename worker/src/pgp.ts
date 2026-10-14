// Mirrors isPGPEncrypted in pkg/server/validation.go: the body must be an
// ASCII-armored "PGP MESSAGE" block with a non-empty payload, a valid CRC24
// checksum when one is present, and nothing after the END line.

const BEGIN = '-----BEGIN PGP MESSAGE-----';
const END = '-----END PGP MESSAGE-----';
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export function isPGPEncrypted(content: string): boolean {
  if (!content || !content.trimEnd().endsWith(END)) return false;

  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  let i = lines.findIndex(line => line.trimEnd() === BEGIN);
  if (i < 0) return false;
  i++;

  // Armor headers ("Version: ...") end at the first blank line.
  while (i < lines.length && lines[i].trim() !== '') {
    if (!/^[^:\s]+: /.test(lines[i])) return false;
    i++;
  }
  if (i >= lines.length) return false;
  i++;

  let body = '';
  let checksum: string | undefined;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('-----')) break;
    if (line.startsWith('=') && line.length === 5) {
      checksum = line.slice(1);
      continue;
    }
    body += line;
  }
  if (i >= lines.length || lines[i].trim() !== END) return false;
  if (lines.slice(i + 1).some(line => line.trim() !== '')) return false;

  const data = decodeBase64(body);
  if (!data || data.length === 0) return false;
  if (checksum !== undefined) {
    const sum = decodeBase64(checksum);
    if (!sum || sum.length !== 3) return false;
    const expected = (sum[0] << 16) | (sum[1] << 8) | sum[2];
    if (crc24(data) !== expected) return false;
  }
  return true;
}

function decodeBase64(text: string): Uint8Array | null {
  if (text.length % 4 !== 0 || !BASE64.test(text)) return null;
  try {
    return Uint8Array.from(atob(text), c => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// RFC 4880 section 6.1.
function crc24(data: Uint8Array): number {
  let crc = 0xb704ce;
  for (const byte of data) {
    crc ^= byte << 16;
    for (let bit = 0; bit < 8; bit++) {
      crc <<= 1;
      if (crc & 0x1000000) crc ^= 0x1864cfb;
    }
  }
  return crc & 0xffffff;
}
