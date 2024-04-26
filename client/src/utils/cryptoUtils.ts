import scrypt from 'scrypt-js';
import { Kyber768 } from 'crystals-kyber-js';

export const generateNTRUKeys = async (decryptionKey: Uint8Array): Promise<{ privateKey: string, publicKey: string }> => {
    const kyber = new Kyber768();
    const [publicKey, privateKey] = await kyber.generateKeyPair();
    return {
        privateKey: Buffer.from(privateKey).toString('base64'),
        publicKey: Buffer.from(publicKey).toString('base64'),
    };
};

export const encryptPrivateKey = (privateKey: string, decryptionKey: Uint8Array): string => {
    const key = enc.Hex.parse(Buffer.from(decryptionKey).toString('hex'));
    const encrypted = AES.encrypt(privateKey, key, { mode: enc.CBC });
    return encrypted.toString();
};

export const hashPassword = (password: string, salt: Uint8Array, N: number, r: number, p: number, dkLen: number): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, N, r, p, dkLen, (error: any, progress: any, key: any) => {
            if (error) {
                reject(new Error("Calculating the scrypt hash of the password failed. Try again. Detailed error: " + error.toString()));
            } else if (key) {
                resolve(key);
            }
        });
    });
};
