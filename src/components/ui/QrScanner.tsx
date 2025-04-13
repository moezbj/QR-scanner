import React, { useEffect, useRef, useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

import forge from "node-forge";
import { t } from "i18next";

const { util, pki, cipher } = forge;

function QrScanner() {
  const scannerRef = useRef(null);
  const [data, setData] = useState("Not Found");
  const [torchOn, setTorchOn] = useState(false);
  const [key, setKey] = useState<any>();
  const [hasPermission, setHasPermission] = useState(false);
  const [webCamOn, setWebCamOn] = useState(false);
  const [decryptedResult, setDecryptedResult] = useState<string | null>(null);
  const [decrypted, setDecrypt] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    window.electronAPI.send("get-keys");
    window.electronAPI.receive(
      "keys-loaded",
      (keys: { privateKey: string; publicKey: string; id: number }[]) => {
        setKey(keys[0]);
      }
    );
  }, []);
  const [errorCam, setErrorCam] = useState<string | null>(null);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
        });
        stream.getTracks().forEach((track) => track.stop());
        setHasPermission(true);
      } catch (err: any) {
        setErrorCam(`Camera access denied: ${err.message}`);
      }
    };

    checkCamera();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      console.log(
        "Video inputs:",
        devices.filter((d) => d.kind === "videoinput")
      );
    });

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        console.log("CAMERA WORKS");
      })
      .catch((err) => {
        console.error("CAMERA ERROR", err);
      });
  }, []);

  if (errorCam) return <div className="error">{errorCam}</div>;
  if (!hasPermission) return <div>Requesting camera access...</div>;

  const handleDecrypt = async (encryptedData: string) => {
    try {
      // 1. Load keys
      if (!key) {
        setError("Clé privée non fournie pour décrypter le QR code");
        return;
      }
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
      setDecrypt(encryptedData);
      setIsScanning(false); // Stop the scanner
      setWebCamOn(false);
      return decryptedJSON;
    } catch (err) {
      console.error("❌ Decryption failed:", err);
      setError(`❌ ${t("scan.failedDecryption")} ${t('scan.msgFailed')}`);
      setIsScanning(false); // Stop the scanner in case of failure
      return "Failed to decrypt!";
    }
  };
  console.log("error", error);
  return (
    <div
      className="qr-scanner"
      style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}
    >
      <h1>{t("scan.QRSCANNER")}</h1>

      <div style={{ margin: "20px" }}>
        <button
          onClick={() => {
            setWebCamOn(!webCamOn);
            setError("");
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: webCamOn ? "#ff4444" : "#43D",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {webCamOn ? t("scan.turnOff") : t("scan.turnON")}
        </button>
      </div>
      {webCamOn && (
        <div
          className="scanner-container"
          style={{
            width: "100%",
            maxWidth: "500px",
            margin: "0 auto",
            border: "2px solid #333",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {webCamOn && (
            <>
              <BarcodeScannerComponent
                ref={scannerRef}
                width="100%"
                height="100%"
                facingMode={"user"}
                onUpdate={(err, result) => {
                  if (result) {
                    const resultText = (result as any).text;
                    // Auto-attempt decryption if keys are provided
                    handleDecrypt(resultText);
                  } else {
                    setData("Not Found");
                    setDecryptedResult(null);
                  }
                }}
              />
              {/* Overlay */}
              {/*  <div className="qr-scanner-overlay">
                <div className="qr-backdrop"></div>
                <div className="qr-scan-square"></div>
              </div> */}
            </>
          )}
        </div>
      )}
      {decrypted && (
        <div
          style={{
            margin: "20px",
            padding: "15px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            maxWidth: 500,
            lineBreak: "anywhere",
          }}
        >
          <p>{decrypted}</p>
        </div>
      )}
      {decryptedResult && (
        <div
          style={{
            margin: "20px",
            padding: "15px",
            border: "1px solid #ddd",
            borderRadius: "5px",
          }}
        >
          <h3>Decrypted Data:</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(decryptedResult, null, 2)}
          </pre>
        </div>
      )}
      {error && (
        <div
          style={{
            color: "red",
            backgroundColor: "#fff",
            margin: "20px 0",
            border: "1px solid red",
            padding: "15px",
            borderRadius: "20px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default QrScanner;
