import forge from "node-forge";

const { pki } = forge;

export function encryptHybrid(row: any, publicKeyPem: any): string {
  const publicKey = pki.publicKeyFromPem(publicKeyPem);

  // 1. Convert data to string
  const message = JSON.stringify(row);

  // 2. Generate AES key & IV
  const aesKey = forge.random.getBytesSync(32); // AES-256 = 32 bytes
  const iv = forge.random.getBytesSync(16); // 16 bytes for AES-CBC

  // 3. Encrypt the message using AES
  const aesCipher = forge.cipher.createCipher("AES-CBC", aesKey);
  aesCipher.start({ iv });
  aesCipher.update(forge.util.createBuffer(forge.util.encodeUtf8(message)));
  aesCipher.finish();
  const encryptedMessage = aesCipher.output.getBytes(); // binary

  // 4. Encrypt the AES key with RSA (this is the correct step!)
  const encryptedAesKey = publicKey.encrypt(aesKey, "RSA-OAEP");

  // 5. Return base64 JSON payload
  return JSON.stringify({
    key: forge.util.encode64(encryptedAesKey), // ✅ this is the AES key
    iv: forge.util.encode64(iv),
    data: forge.util.encode64(encryptedMessage), // ✅ this is the message
  });
}
