/**
 * AES-256-GCM symmetric encryption utility.
 *
 * GCM (Galois/Counter Mode) là chế độ AEAD — vừa mã hoá vừa xác thực tính
 * toàn vẹn của ciphertext thông qua authTag 16-byte. Nếu ciphertext bị sửa,
 * decrypt sẽ throw lỗi ngay lập tức.
 *
 * Format lưu DB: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *   - iv:       12 bytes random (96-bit, chuẩn GCM)
 *   - authTag:  16 bytes (128-bit)
 *   - cipher:   N bytes (bằng độ dài plaintext)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;      // 96-bit IV (GCM best practice)
const TAG_BYTES = 16;     // 128-bit auth tag

function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY phải là chuỗi hex 64 ký tự (32 bytes) trong .env',
        );
    }
    return Buffer.from(hex, 'hex');
}

/**
 * Mã hoá plaintext bằng AES-256-GCM.
 * @returns Chuỗi dạng "iv_hex:authTag_hex:ciphertext_hex"
 */
export function encrypt(plainText: string): string {
    const key = getKey();
    const iv = randomBytes(IV_BYTES);

    const cipher = createCipheriv(ALGORITHM, key, iv, {
        authTagLength: TAG_BYTES,
    });

    const encrypted = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');
}

/**
 * Giải mã chuỗi đã được mã hoá bởi `encrypt()`.
 * @throws Error nếu format sai hoặc authTag không khớp (data bị giả mạo).
 * @returns Plaintext gốc
 */
export function decrypt(encryptedString: string): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
        throw new Error('Encrypted string format không hợp lệ (expected iv:authTag:cipher)');
    }

    const [ivHex, authTagHex, cipherHex] = parts;

    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const cipherText = Buffer.from(cipherHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(authTag);

    try {
        const decrypted = Buffer.concat([
            decipher.update(cipherText),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    } catch {
        throw new Error('Giải mã thất bại: authTag không khớp (dữ liệu có thể bị giả mạo)');
    }
}
