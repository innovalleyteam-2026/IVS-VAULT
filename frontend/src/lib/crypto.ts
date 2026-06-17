import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getSecretKeyBuffer = (): Buffer => {
  const secret = process.env.VAULT_ENCRYPTION_SECRET;
  return crypto.createHash('sha256').update(secret || 'fallback-secret-key-generation').digest();
};

export function encryptPayload(plainText: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getSecretKeyBuffer(), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err: any) {
    throw new Error("System cipher encryption error execution: " + err.message);
  }
}

export function decryptPayload(cipherText: string): string {
  try {
    const [ivHex, encryptedHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getSecretKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return "**********";
  }
}