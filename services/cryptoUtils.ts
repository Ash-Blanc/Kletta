// Simple obfuscation to prevent plain-text storage of keys
// Note: This is NOT high-security encryption. It relies on a client-side fixed key.
// In a real production app, use Web Crypto API with user-derived keys.

const SECRET_SALT = "kletta-agent-workspace-2025-salt";

export const encrypt = (text: string): string => {
  if (!text) return "";
  try {
    const chars = text.split('');
    const saltChars = SECRET_SALT.split('');
    const encrypted = chars.map((c, i) => 
      c.charCodeAt(0) ^ saltChars[i % saltChars.length].charCodeAt(0)
    );
    // Return as hex string with prefix
    return 'enc:' + encrypted.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error("Encryption failed", e);
    return text;
  }
};

export const decrypt = (text: string): string => {
  if (!text) return "";
  
  // Check for prefix
  if (!text.startsWith('enc:')) {
      return text; // Return original if not encrypted
  }

  const payload = text.slice(4); // Remove 'enc:'

  // Check if it looks like our hex string (even length, hex chars)
  if (!/^[0-9a-f]+$/i.test(payload) || payload.length % 2 !== 0) {
      return text; 
  }

  try {
    const saltChars = SECRET_SALT.split('');
    let decrypted = "";
    for (let i = 0; i < payload.length; i += 2) {
        const hex = payload.substr(i, 2);
        const charCode = parseInt(hex, 16);
        const saltChar = saltChars[(i / 2) % saltChars.length].charCodeAt(0);
        decrypted += String.fromCharCode(charCode ^ saltChar);
    }
    return decrypted;
  } catch (e) {
    console.error("Decryption failed", e);
    return text;
  }
};
