import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(config.encryption.key.padEnd(32).slice(0, 32));

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password + config.jwt.secret).digest('hex');
};
