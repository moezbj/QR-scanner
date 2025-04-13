import React, { useEffect, useState } from "react";
import forge from "node-forge";
import { useTranslation } from "react-i18next";

const { pki } = forge;

// Generate keypair (for demo purposes, replace with saved key in production)

const Settings = () => {
  const { t } = useTranslation();

  const [privateKey, setPrivateKey] = useState<any>();
  const [publicKey, setPublicKey] = useState<any>();
  const [keys, setKeys] = useState<
    { privateKey: string; publicKey: string; id: number }[]
  >([]);
  const [keySize, setKeySize] = useState<2048 | 1024 | 4096>(2048);
  const [loading, setLoading] = useState(false);
  const [loadingSaving, setLoadingSaving] = useState(false);

  // Generate RSA key pair
  const generateKeys = () => {
    setLoading(true);
    const keypair = pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const publicKeyPem = pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = pki.privateKeyToPem(keypair.privateKey);
    setPrivateKey(privateKeyPem);
    setPublicKey(publicKeyPem);
    setLoading(false);
  };
  // Download private key as file
  const downloadPrivateKey = () => {
    const element = document.createElement("a");
    const file = new Blob([privateKey], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "private_key.pem";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  const saveKey = () => {
    setLoadingSaving(true);
    window.electronAPI.send("add-key", {
      privateKey: JSON.stringify(privateKey),
      publicKey: JSON.stringify(publicKey),
    });
    window.electronAPI.receive("key-added", () => {
      window.electronAPI.send("get-keys");
      setLoadingSaving(false);
    });
  };
  const handleDeleteKey = (id: number) => {
    window.electronAPI.send("delete-key", id);
    window.electronAPI.send("get-keys");
    window.electronAPI.receive(
      "keys-loaded",
      (keys: { privateKey: string; publicKey: string; id: number }[]) => {
        setKeys(keys);
      }
    );
  };
  useEffect(() => {
    window.electronAPI.send("get-keys");
    window.electronAPI.receive(
      "keys-loaded",
      (keys: { privateKey: string; publicKey: string; id: number }[]) => {
        setKeys(keys);
      }
    );
  }, []);
  return (
    <div style={{ padding: "10px" }}>
      <h1 className="text-2xl mb-4">{t("scan.generator")}</h1>

      <div style={{ marginBottom: "20px" }}>
        <label>
          {t("scan.keySize")}:
          <select
            value={keySize}
            onChange={(e) =>
              setKeySize(parseInt(e.target.value) as 2048 | 1024 | 4096)
            }
            style={{
              marginLeft: "10px",
              backgroundColor: "transparent",
              border: "1px solid  #fff",
              borderRadius: "10px",
              padding: "10px  20px",
            }}
          >
            <option value="1024">1024 bits</option>
            <option value="2048">2048 bits ({t("scan.recommended")})</option>
            <option value="4096">4096 bits ({t("scan.secure")})</option>
          </select>
        </label>

        <button
          onClick={generateKeys}
          style={{
            marginLeft: "20px",
            padding: "8px 16px",
            backgroundColor: "#43D",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? t('scan.loading') : t('scan.generate')}
        </button>
      </div>

      {privateKey && (
        <div style={{ marginTop: "30px" }}>
          <h2>{t("scan.privateKey")}</h2>
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              marginBottom: "20px",
              wordBreak: "break-all",
              maxHeight: "200px",
              overflowY: "auto",
              color: "#000",
            }}
          >
            <pre>{"pems"}</pre>
          </div>

          <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
            <button
              onClick={downloadPrivateKey}
              style={{
                padding: "8px 16px",
                backgroundColor: "#43D",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {`${t("scan.download")} ${t("scan.privateKey")}`}
            </button>
            <button
              onClick={saveKey}
              style={{
                padding: "8px 16px",
                backgroundColor: "#43D",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {loadingSaving
                ? t("scan.loading")
                : `${t("scan.save")} ${t("scan.privateKey")}`}
            </button>
          </div>
        </div>
      )}

      {publicKey && (
        <div style={{ marginTop: "30px" }}>
          <h2>Public Key</h2>
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              wordBreak: "break-all",
              maxHeight: "200px",
              overflowY: "auto",
              color: "#000",
            }}
          >
            <pre>{"pem"}</pre>
          </div>
        </div>
      )}
      <h3 className="text-lg mb-4">{t('scan.storedKey')}</h3>

      {keys.map(({ privateKey, publicKey, id }) => (
        <div
          key={id}
          style={{
            backgroundColor: "#f5f5f5",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
            wordBreak: "break-all",
            maxHeight: "200px",
            overflowY: "auto",
            color: "#000",
          }}
        >
          <button
            onClick={() => handleDeleteKey(id)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#43D",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {t("button.delete")}
          </button>
          <pre>{JSON.parse(privateKey)}</pre>
        </div>
      ))}
    </div>
  );
};

export default Settings;
