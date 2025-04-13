import React, { useEffect, useState } from "react";
import forge from "node-forge";
import { useTranslation } from "react-i18next";

const ManuelScanner = () => {
  const { t } = useTranslation();
  const [key, setKey] = useState<any>();
  const [decryptedResult, setDecryptedResult] = useState<string | null>(null);
  const [text, setText] = useState("");
  const handleDecrypt = async (encryptedData: string) => {
    try {
      // 1. Load keys
      const privateKeyPem = JSON.parse(key.privateKey);
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

      // 2. Parse encrypted JSON
      const parsedJSON = JSON.parse(encryptedData);

      // 3. Decode base64 components
      const decodedEncryptedAesKey = forge.util.decode64(parsedJSON.key); // binary string
      const decodedIv = forge.util.decode64(parsedJSON.iv); // binary string
      const decodedEncryptedMessage = forge.util.decode64(parsedJSON.data); // binary string
      // 4. Convert AES key to buffer then decrypt it
      const encryptedKeyBuffer = forge.util.createBuffer(
        decodedEncryptedAesKey,
        "raw"
      );

      const decryptedAesKey = privateKey.decrypt(
        encryptedKeyBuffer.getBytes(),
        "RSA-OAEP"
      );
      // 🔐 Ensure 32-byte AES key
      if (decryptedAesKey.length !== 32) {
        throw new Error(`Invalid AES key length: ${decryptedAesKey.length}`);
      }

      // convert to raw usable key
      const aesKeyRaw = forge.util
        .createBuffer(decryptedAesKey, "raw")
        .getBytes();

      // decrypt message
      const decipher = forge.cipher.createDecipher("AES-CBC", aesKeyRaw);

      decipher.start({ iv: decodedIv });
      decipher.update(forge.util.createBuffer(decodedEncryptedMessage));

      const success = decipher.finish();

      if (!success) throw new Error("AES decryption failed");

      const decryptedUtf8 = forge.util.decodeUtf8(decipher.output.getBytes());

      const decryptedJSON = JSON.parse(decryptedUtf8);
      setDecryptedResult(decryptedJSON);
      return decryptedJSON;
    } catch (err) {
      console.error("❌ Decryption failed:", err);
      return "Failed to decrypt!";
    }
  };
  const onChange = (e: any) => {
    setText(e.target.value);
    handleDecrypt(e.target.value);
  };
  useEffect(() => {
    window.electronAPI.send("get-keys");
    window.electronAPI.receive(
      "keys-loaded",
      (keys: { privateKey: string; publicKey: string; id: number }[]) => {
        setKey(keys[0]);
      }
    );
  }, []);
  return (
    <div style={{ padding: "10px" }}>
      <h1 className="text-2xl mb-4">{t("scan.barcodeScanner")}</h1>
      <div className="input-group">
        <input className="customWidth" onChange={onChange} value={text} />
      </div>
      {decryptedResult && <p>{JSON.stringify(decryptedResult, null, 2)}</p>}
    </div>
  );
};

export default ManuelScanner;
