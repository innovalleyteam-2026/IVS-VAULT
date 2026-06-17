// AES-256 Encryption Utility using crypto-js
const CryptoJS = require('crypto-js');
require('dotenv').config();

const SECRET_KEY = process.env.VAULT_ENCRYPTION_SECRET || 'fallback_secret_key_32_characters_max';

/**
 * Encrypt a plain-text password before storing in Supabase database
 * @param {string} text 
 * @returns {string} Encrypted Cipher String
 */
function encryptPassword(text) {
    try {
        if (!text) return '';
        return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    } catch (error) {
        console.error("Encryption Failure:", error.message);
        throw new Error("Unable to securely encrypt credentials.");
    }
}

/**
 * Decrypt a cipher password string fetched from database
 * @param {string} cipherText 
 * @returns {string} Original Plain-Text string
 */
function decryptPassword(cipherText) {
    try {
        if (!cipherText) return '';
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (!originalText) throw new Error("Key verification mismatch.");
        return originalText;
    } catch (error) {
        console.error("Decryption Failure:", error.message);
        throw new Error("Authentication failed or corrupted secret key.");
    }
}

module.exports = {
    encryptPassword,
    decryptPassword
};
