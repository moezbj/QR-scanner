import React, { useState, useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import { useTranslation } from "react-i18next";
import { useMessage } from "@/hooks/message";
import Dropdown from "@/components/ui/dropdown";
import forge from "node-forge";
import "@/style/pages/create.css";
import { encryptHybrid } from "@/lib/crypt";

const { util } = forge;

interface UploadedFile {
  name: string;
  path: string;
}
const RSAKeyQRGenerator = () => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [format, setFormat] = useState("");
  const [key, setKey] = useState<any>();
  const [upLoading, setUploading] = useState(false);
  const [encryptedData, setEncryptedData] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);
  const [fileData, setFileData] = useState<any>();
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // setFileSelected(true);
    }
  };
  const handleFileUpload = async () => {
    const selectFormat = format;
    setUploading(true);
    const fileUploaded: {
      success: boolean;
      message: string;
      data: any[];
      error: any;
      filePath: string;
    } = await window.electronAPI.uploadFile(selectFormat);
    if (fileUploaded.success) {
      // setPathFile(fileUploaded.filePath);
      setFileData(fileUploaded.data);
      // setFilteredData(fileUploaded.data);
      generateTable(fileUploaded.data);
    } else {
      showMessage("error", t(fileUploaded.error));
    }
    setUploading(false);
  };
  const refreshUploadedFiles = async () => {
    try {
      const fetchedFiles = await window.electronAPI.fetchUploadedFiles();
      setFiles(fetchedFiles);
    } catch (error: any) {
      console.error("Error fetching uploaded files:", error.message);
    }
  };

  useEffect(() => {
    qrCodeInstance.current = new QRCodeStyling({
      width: 500, // Larger size
      height: 500,
      type: "svg",
      data: "",
      margin: 10,
      qrOptions: {
        errorCorrectionLevel: "H",
      },
      dotsOptions: {
        color: "#000000",
        type: "square",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
    });

    if (qrCodeRef.current) {
      qrCodeInstance.current.append(qrCodeRef.current);
    }

    // Generate initial data URL
    updateQrCodePreview();

    return () => {
      // Proper cleanup
      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = "";
      }
      qrCodeInstance.current = null;
    };
  }, []);
  useEffect(() => {
    window.electronAPI.send("get-keys");
    window.electronAPI.receive(
      "keys-loaded",
      (keys: { privateKey: string; publicKey: string; id: number }[]) => {
        setKey(keys[0]);
      }
    );
  }, []);
  useEffect(() => {
    refreshUploadedFiles();
  }, []);

  const encryptData = async (row: any) => {
    if (!key || !row) return;
    try {
      const d = await JSON.parse(key.publicKey);
      const encryptedPayload = encryptHybrid(row, d);
      setEncryptedData(encryptedPayload);
      if (qrCodeInstance.current) {
        qrCodeInstance.current.update({ data: encryptedPayload });
        const data = await qrCodeInstance.current.getRawData("png");
        if (data) setQrCodeDataUrl(URL.createObjectURL(data as any));
      }
    } catch (error) {
      console.error("Encryption failed:", error);
      alert("Encryption failed. Please check your input and keys.");
    }
  };

  function generateTable(filteredArray: any[]) {
    const tableBody = document.querySelector("#data-table tbody");
    const deleteButton = document.getElementById("data-table");
    const filterContainer = document.getElementById("filter-container");

    if (tableBody) {
      // Clear existing rows
      tableBody.innerHTML = "";

      if (filteredArray.length) {
        // Show the table and filter container
        if (deleteButton) deleteButton.style.display = "block";
        if (filterContainer) filterContainer.style.display = "flex";

        // Populate the table with data
        filteredArray.forEach((row: any) => {
          const tr = document.createElement("tr");
          const numeroCompteCell = document.createElement("td");
          numeroCompteCell.classList.add("th-st");
          numeroCompteCell.textContent = row.NUMERO_COMPTE || "N/A";
          tr.appendChild(numeroCompteCell);

          const nomClientCell = document.createElement("td");
          nomClientCell.classList.add("th-st");
          nomClientCell.textContent = row.NOM_CLIENT || "N/A";
          tr.appendChild(nomClientCell);

          const codeBanqueCell = document.createElement("td");
          codeBanqueCell.classList.add("th-st");
          codeBanqueCell.textContent = row.CODE_BANQUE || "N/A";
          tr.appendChild(codeBanqueCell);

          const codeAgenceCell = document.createElement("td");
          codeAgenceCell.classList.add("th-st");
          codeAgenceCell.textContent = row.CODE_AGENCE || "N/A";
          tr.appendChild(codeAgenceCell);

          const adrClientCell = document.createElement("td");
          adrClientCell.classList.add("th-st");
          adrClientCell.textContent = row.ADR_CLIENT || "N/A";
          tr.appendChild(adrClientCell);

          const serie = document.createElement("td");
          serie.classList.add("th-st");
          serie.textContent = row.SERIE || "N/A";
          tr.appendChild(serie);

          const buttonCell = document.createElement("td");
          buttonCell.classList.add("th-st");

          const btn = document.createElement("button");
          btn.classList.add("btnCreate");
          btn.title = "QR";
          btn.textContent = "QR"; // Add text to the button

          // Use "click" instead of "onclick" for addEventListener
          btn.addEventListener("click", function () {
            encryptData(row);
          });

          buttonCell.appendChild(btn);
          tr.appendChild(buttonCell);

          tableBody.appendChild(tr);
        });
      } else {
        // Display a message when no results are found
        const noResultsRow = document.createElement("tr");
        const noResultsCell = document.createElement("td");
        noResultsCell.setAttribute("colspan", "13"); // Adjust colspan based on the number of columns
        noResultsCell.textContent = "No results found.";
        noResultsCell.style.textAlign = "center";
        noResultsRow.appendChild(noResultsCell);
        tableBody.appendChild(noResultsRow);

        // Hide the delete button and filter container if no results are found
        if (deleteButton) deleteButton.style.display = "none";
        //if (filterContainer) filterContainer.style.display = "none";
      }
    }
  }
  // Generate data URL for preview
  const updateQrCodePreview = async () => {
    if (qrCodeInstance.current) {
      const data = await qrCodeInstance.current.getRawData("png");
      if (data) {
        setQrCodeDataUrl(URL.createObjectURL(data as any));
      }
    }
  };
  const handleFileItemClick = async (file: UploadedFile) => {
    const files = await window.electronAPI.fetchUploadedFile(file.name);
    if (files) {
      generateTable(files.data);
    }
  };
  // Handle file deletion
  const handleDeleteFile = async (file: UploadedFile) => {
    try {
      const result = await window.electronAPI.deleteFile(file.path);
      if (result.success) {
        showMessage("success", t("errors.deletedFile"));
        refreshUploadedFiles(); // Refresh the list after deletion
      } else {
        showMessage("error", `Error: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error deleting file:", error.message);
      showMessage("error", `Error: ${error.message}`);
    }
  };
  return (
    <div style={{ padding: "10px" }}>
      <div>
        <h2 className="text-2xl">QR Code</h2>
        <div className="flex">
          <Dropdown
            data={["-", "CMC7", "E13B"].map((r) => ({
              title: r.toString(),
              value: r.toString(),
            }))}
            setValue={setFormat}
            value={format}
            className="!w-52 mr-4"
          />
          <button
            id="select-file-button"
            className="btn-select-file"
            style={{ backgroundColor: "#43D" }}
            disabled={!format}
            onClick={handleFileUpload}
          >
            {t("scan.upload")}
          </button>
          <input
            type="file"
            id="file-input"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            id="delete-file-button"
            className="deleteBtn"
            style={{ display: "none" }}
          >
            {t("button.delete")}
          </button>
        </div>
        {files.map((file) => (
          <div
            key={file.name}
            className={`file-item`}
            onClick={() => handleFileItemClick(file)}
          >
            <span className={`file-name`}>{file.name}</span>
            <button
              className="delete-button mx-1 !w-36"
              style={{ backgroundColor: "#43D" }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file);
              }}
            >
              {t("button.delete")}
            </button>{" "}
          </div>
        ))}
        <table
          id="data-table"
          style={{
            display: "none",
            minHeight: "300px",
            maxHeight: "450px",
          }}
        >
          <thead>
            <tr className="th-st">
              <th className="th-st">{t("tableFile.NUMERO_COMPTE")}</th>
              <th className="th-st">{t("tableFile.NOM_CLIENT")}</th>
              <th className="th-st">{t("tableFile.CODE_BANQUE")}</th>
              <th className="th-st">{t("tableFile.CODE_AGENCE")}</th>
              <th className="th-st">{t("tableFile.ADR_CLIENT")}</th>
              <th className="th-st">{t("tableFile.SERIE")}</th>

              <th className="th-st">Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <div>
          {qrCodeDataUrl && (
            <>
              <h3>Image Preview:</h3>
              <img
                src={qrCodeDataUrl}
                alt="QR Code Preview"
                style={{
                  width: "200px",
                  height: "200px",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              />
              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={() => {
                    if (qrCodeInstance.current) {
                      qrCodeInstance.current.download({
                        name: "qrcode",
                        extension: "png",
                      });
                    }
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Download QR Code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RSAKeyQRGenerator;
