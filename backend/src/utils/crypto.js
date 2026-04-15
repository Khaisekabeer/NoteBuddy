const CryptoJS = require('crypto-js');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key';

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (hash) => {
  try {
    const bytes = CryptoJS.AES.decrypt(hash, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return 'Decryption Error';
  }
};

module.exports = { encrypt, decrypt };
