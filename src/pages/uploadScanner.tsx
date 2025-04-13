import React, { useEffect, useState } from "react";
import jsQR from "jsqr";
import forge from "node-forge";
import { t } from "i18next";

const QrImageUploader: React.FC = () => {
  const [key, setKey] = useState<any>();
  const [decryptedResults, setDecryptedResults] = useState<any[]>([]);

  const decodeQRCodeFromImage = async (image: File) => {
    // Create a FileReader to read the uploaded image
    const reader = new FileReader();
    return new Promise<{ data: string; img: any }>((resolve, reject) => {
      reader.onload = (e: any) => {
        const imageData = e.target.result;
        // Create an image element to hold the uploaded image
        const img = new Image();
        img.onload = () => {
          // Create a canvas to extract image data for QR decoding
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Set canvas size to match image dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            // Get image data from the canvas
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const code = jsQR(imageData.data, img.width, img.height); // Decode the QR code from image data
            if (code) {
              const d = { data: code.data, img: e.target.result };
              resolve(d); // Return the decoded QR code data
            } else {
              reject(new Error("QR code not found in image."));
            }
          }
        };
        img.onerror = (err) => reject(err);
        img.src = imageData; // Load the image data into the img element
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(image); // Read the uploaded file as a data URL
    });
  };

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
      return decryptedJSON;
    } catch (err) {
      console.error("❌ Decryption failed:", err);
      return "Failed to decrypt!";
    }
  };
  const handleUploadImages = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const results: any[] = [];

      // Process each image
      for (const file of files) {
        try {
          const decodedQRCode: { data: string; img: any } =
            await decodeQRCodeFromImage(file);
          console.log("decodedQRCode", decodedQRCode);
          const decryptedData = await handleDecrypt(decodedQRCode.data);
          results.push({ data: decryptedData, image: decodedQRCode.img });
        } catch (error) {
          console.error(`Failed to process image: ${file.name}`, error);
        }
      }

      setDecryptedResults(results);
    }
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
      <h1 className="text-2xl mb-4">{t('scan.uploadFile')}</h1>
      <input
        type="file"
        multiple
        accept="image/*"
        className="customWidth"
        onChange={handleUploadImages}
      />
      <input
        type="file"
        id="file-input"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        onChange={handleUploadImages}
      />
      <div>
        {decryptedResults.length > 0 && (
          <ul>
            {decryptedResults.map((result, index) => (
              <li key={index}>
                <img
                  width={200}
                  height={200}
                  className="my-4"
                  src={result.image}
                />
                <p>{JSON.stringify(result.data)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QrImageUploader;
