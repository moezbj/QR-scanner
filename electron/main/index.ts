/* eslint-disable no-inner-declarations */
import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
} from "electron";
import path from "path";
import os from "node:os";
import * as XLSX from "xlsx";

import sqlite3 from "better-sqlite3";
import fs from "fs";
import { addFormattedDateToFileName } from "../../lib/addDateToName";

import { isExistFile } from "../../test";
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
const preload = path.join(__dirname, "../preload/index.mjs");

const indexHtml = path.join(RENDERER_DIST, "index.html");
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("electron-fiddle", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("electron-fiddle");
}

// Define the uploads path
const uploadDir = path.join(app.getPath("userData"), "uploads");
// Define the database path
const dbPath = path.join(app.getPath("userData"), "database", "database.db");
// Ensure the database directory exists
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
interface FetchUploadedFileResponse {
  success: boolean;
  message?: string;
  filePath?: string;
  data?: ExcelRow[];
  error?: string;
}
let db: sqlite3.Database;

// Function to initialize the database
function initializeDatabase() {
  db = sqlite3(dbPath);
  console.log(`Database opened successfully at: ${dbPath}`);

  try {
    // Create tables if they don't exist
    const createTablesQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );
          CREATE TABLE IF NOT EXISTS privateKeys (
            id  INTEGER PRIMARY KEY AUTOINCREMENT,
            privateKey TEXT NOT NULL UNIQUE,
            publicKey TEXT NOT NULL UNIQUE

  );
      `;

    // Execute the table creation query
    db.exec(createTablesQuery);
    // Insert default admin user if not already present
    const insertAdminUser = db.prepare(`
          INSERT OR IGNORE INTO users (name, email, password, role)
          VALUES ('admin', 'admin@example.com', 'admin123', 'admin');
        `);
    insertAdminUser.run();

    const insertSimpleUser = db.prepare(`
          INSERT OR IGNORE INTO users (name, email, password, role)
          VALUES ('simpleUser', 'user@example.com', 'password123', 'user');
        `);
    insertSimpleUser.run();

    console.log("Database initialized successfully.");
  } catch (error: any) {
    console.error("Error initializing database:", error.message);
    throw error;
  }
}

async function setupDatabase() {
  try {
    await initializeDatabase();
    console.log("Database setup completed. Ready for login.");
  } catch (error: any) {
    console.error("Error opening or initializing database:", error.message);
  }
}
let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;
interface ExcelRow {
  NUMERO_COMPTE: string;
  CODE_AGENCE: string;
  NOMBRE_CARNET: string;
  NOMBRE_FEUILLE: string;
  CODE_TRANSACTION: string;
  NOM_CLIENT: string;
  ADR_CLIENT: string;
  CODE_BANQUE: string;
  CODE_PAYS: string;
  NUMERO_DEBUT_CHEQUE: string;
  DEVISE: string;
  SERIE: string;
  RIB?: string;
  CMC7?: string;
}

interface UploadFileResponse {
  success: boolean;
  message?: string;
  error?: string;
  filePath?: string;
  data?: ExcelRow[];
}
function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"), // Use the built file, not the source file
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for some DOM APIs
    },
  });
  // Load the app in development or production mode
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.maximize();
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexHtml);
    mainWindow.maximize();
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadDir}`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    if (loadingWindow) {
      loadingWindow.close(); // Close the loading window
    }
    if (mainWindow) {
      mainWindow.show();
      mainWindow.maximize();
    }
  });
}
// create loading window
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false, // Optional: Remove borders for a cleaner look
    alwaysOnTop: true, // Keep the loading screen on top
    backgroundColor: "#f0f0f0", // Match the background color with the loading screen
    show: true, // Show the loading window immediately
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  // and load the index.html of the app.
  if (VITE_DEV_SERVER_URL) {
    const loadingPath = path.join(app.getAppPath(), "public/loading.html");
    loadingWindow.loadFile(loadingPath);
  } else {
    const loadingPath = path.join(RENDERER_DIST, "loading.html");
    loadingWindow.loadFile(loadingPath);
  }
}

// Handle file selection
ipcMain.handle("select-file", async () => {
  if (mainWindow) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "PDF Files", extensions: ["pdf", "png", "jpeg", "jpg", "pdf"] }, // Restrict to PDF files
      ],
    });
    if (result.canceled || !result.filePaths.length) {
      return null; // No file selected
    }

    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const destPath = path.join(uploadDir, fileName);

    // Check if a file with the same name already exists in the upload directory
    if (fs.existsSync(destPath)) {
      console.log(`File already exists: ${destPath}`);
      return {
        success: false,
        error: `le fichier "${fileName}" existe déjà.`,
      };
    }

    // Copy the file to the upload directory
    fs.copyFileSync(filePath, destPath);
    console.log(`File uploaded: ${destPath}`);

    return result.filePaths[0];
  }

  // Return the selected file path
});
// Handle image upload
ipcMain.handle("upload-file-image", async (event, imagePath) => {
  try {
    // Show the file dialog to select a file

    const filePath = imagePath;
    const fileName = path.basename(imagePath);

    const destPath = path.join(uploadDir, fileName);

    // Check if a file with the same name already exists in the upload directory
    const isExist = isExistFile(uploadDir, fileName, true);
    if (isExist.length) {
      return {
        success: false,
        error: `le fichier "${fileName}" existe déjà.`,
      };
    }
    // Copy the file to the upload directory
    fs.copyFileSync(filePath, destPath);
    return {
      success: true,
      message: `File uploaded successfully`,
      filePath: "",
    };
  } catch (error: any) {
    console.error("Error uploading file:", error.message);
    return { success: false, error: error.message };
  }
});
// Handle fetching uploaded files
ipcMain.handle("fetch-uploaded-files", async (event) => {
  try {
    // Read all files in the upload directory
    const files = fs.readdirSync(uploadDir);

    // Map files to objects with name and path
    const fileObjects = files
      .map((file) => ({
        name: file,
        path: path.join(uploadDir, file),
      }))
      .filter((file) => {
        // Filter by Excel file extensions
        return /\.(xlsx|xls|xlt|xlsm|xlam|csv|pdf)$/i.test(file.name);
      });
    return fileObjects;
  } catch (error: any) {
    console.error("Error fetching uploaded files:", error.message);
    return [];
  }
});
// Handle delete file
ipcMain.handle("delete-file", (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
    return { success: true, message: "FILE_DELETED" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
// Handle file upload
ipcMain.handle(
  "upload-file",
  async (
    event: IpcMainInvokeEvent,
    selectFormat: string
  ): Promise<UploadFileResponse> => {
    try {
      // Show the file dialog to select a file
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ["openFile"],
        filters: [
          {
            name: "Microsoft Excel Files",
            extensions: ["xls", "xlsx"],
          },
        ],
      });

      // Check if the user canceled the dialog or no file was selected
      if (result.canceled || !result.filePaths.length) {
        return { success: false, message: "No file selected" };
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const newFileName = addFormattedDateToFileName(fileName);
      const newDestPath = path.join(uploadDir, newFileName);

      // Check if the file already exists
      const isExist = isExistFile(uploadDir, fileName, false);
      if (isExist.length) {
        return {
          success: false,
          error: `Le fichier "${fileName}" existe déjà.`,
        };
      }

      // Parse the Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Get the first sheet
      const worksheet = workbook.Sheets[sheetName];

      // Convert the worksheet to JSON
      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get raw data with headers

      // Extract column indices for required fields
      const headers: string[] = data[0].map((e) => e.trim()); // First row contains headers
      const fieldIndices: { [key: string]: number } = {
        NUMERO_COMPTE: headers.indexOf("numero de compte"),
        CODE_AGENCE: headers.indexOf("code agence"),
        NOMBRE_CARNET: headers.indexOf("nombre de carnet"),
        NOMBRE_FEUILLE: headers.indexOf("nombre de feuilles"),
        CODE_TRANSACTION: headers.indexOf("code transaction"),
        NOM_CLIENT: headers.indexOf("nom client"),
        ADR_CLIENT: headers.indexOf("adresse"),
        CODE_BANQUE: headers.indexOf("code bank"),
        CODE_PAYS: headers.indexOf("code pays"),
        NUMERO_DEBUT_CHEQUE: headers.indexOf("numero de debut"),
        DEVISE: headers.indexOf("devise"),
        SERIE: headers.indexOf("serie"),
        REF: headers.indexOf("ref int"),
      };
      console.log("fieldIndices", fieldIndices);

      // Check if all required columns exist
      const requiredColumns = [
        /*  "NUMERO_COMPTE",
        "CODE_AGENCE",
        "NOMBRE_CARNET",
        "NOMBRE_FEUILLE",
        "CODE_TRANSACTION",
        "NOM_CLIENT",
        "ADR_CLIENT",
        "CODE_BANQUE",
        "CODE_PAYS",
        "NUMERO_DEBUT_CHEQUE",
        "NUMERO_FIN_CHEQUE", */
        "numero de compte",
        "code agence",
        "nombre de carnet",
        "nombre de feuilles",
        "code transaction",
        "nom client",
        "adresse",
        "code bank",
        "code pays",
        "numero de debut",
        "devise",
        "serie",
        "ref int",
      ];

      const missingColumns = requiredColumns.filter(
        (col) => fieldIndices[col] === -1
      );

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}`
        );
      }

      // Helper function to validate fields
      function isValidField(value: any, type: string): boolean {
        if (value === null || value === undefined || value === "") {
          return false; // Disallow empty or null values
        }

        switch (type) {
          /*     case "NUMERO_COMPTE":
            return /^\d{10}$/.test(value); // Exactly 10 digits
          case "CODE_AGENCE":
            return /^\d{3}$/.test(value); // Exactly 3 digits
          case "NOMBRE_CARNET":
            return /^[1-9]\d*$/.test(value); // Positive integer
          case "NOMBRE_FEUILLE":
            return [1, 2, 3, 4, 5, 8, 25, 50, 100].includes(Number(value)); // Must be 25, 50, or 100
          case "CODE_TRANSACTION":
            return ["01", "02", "03"].includes(value); // Must be 01, 02, or 03
          case "NOM_CLIENT":
            return typeof value === "string" && value.length <= 50; // Maximum 50 characters
          case "CODE_BANQUE":
            return /^\d{3}$/.test(value); // Exactly 3 digits
          case "CODE_PAYS":
            return /^\d{3}$/.test(value); // Exactly 3 digits
          case "NUMERO_DEBUT_CHEQUE":
          case "NUMERO_FIN_CHEQUE":
            return /^\d{8}$/.test(value); // Exactly 8 digits
          default:
            return true; // Allow other fields for now
        } */
          case "numero de compte":
            return /^\d{11}$/.test(value); // Exactly 10 digits
          case "code agence":
            return /^\d{5}$/.test(value); // Exactly 3 digits
          case "nombre de carnet":
            return /^[1-9]\d*$/.test(value); // Positive integer
          case "nombre de feuilles":
            return [0o25, 0o50, 100].includes(Number(value)); // Must be 25, 50, or 100
          case "code transaction":
            return ["01", "02", "03"].includes(value); // Must be 01, 02, or 03
          case "nom client":
            return typeof value === "string" && value.length <= 50; // Maximum 50 characters
          case "code bank":
            return /^\d{5}$/.test(value); // Exactly 3 digits
          case "code pays":
            return /^\d{2}$/.test(value); // Exactly 3 digits
          case "numero de debut":
            return /^\d{6}$/.test(value); // Exactly 8 digits
          default:
            return true; // Allow other fields for now
        }
      }

      // Filter and map the data to extract required fields with validation
      const filteredData: ExcelRow[] = data.slice(1).reduce((result, row) => {
        function calculateCleRIB(row: any): string {
          const fullNumber =
            row[fieldIndices.CODE_BANQUE] +
            row[fieldIndices.CODE_AGENCE] +
            row[fieldIndices.NUMERO_COMPTE];
          const N = fullNumber * 100;
          const remainder = Number(N % 97);
          const cléControle = remainder === 0 ? 97 : 97 - remainder;
          return String(cléControle).padStart(2, "0");
        }
        function formatWithLeadingZeros(number: number, totalLength = 8) {
          // Convert number to string first
          const numStr = number.toString();
          // Add leading zeros to reach the desired length
          return numStr.padStart(totalLength, "0");
        }

        function generateCMC7(row: any, CLE_RIB: string): string {
          const ref = row[fieldIndices.REF].split("/")[0];
          const code = row[fieldIndices.REF].split("/")[1];
          const num = formatWithLeadingZeros(
            row[fieldIndices.NUMERO_DEBUT_CHEQUE]
          );
          const a = `<${num}${Number(row[fieldIndices.CODE_TRANSACTION])}>${row[fieldIndices.CODE_BANQUE]}${row[fieldIndices.CODE_AGENCE]}${row[fieldIndices.NUMERO_COMPTE]}${CLE_RIB}:${ref};${code}`;
          return a;
        }

        const rib = calculateCleRIB(row);
        const record: any = {
          NUMERO_COMPTE: row[fieldIndices.NUMERO_COMPTE],
          CODE_AGENCE: row[fieldIndices.CODE_AGENCE],
          NOM_CLIENT: row[fieldIndices.NOM_CLIENT],
          ADR_CLIENT: row[fieldIndices.ADR_CLIENT],
          CODE_BANQUE: row[fieldIndices.CODE_BANQUE],
        };
        // Validate all required fields
        const errors: string[] = [];
        Object.entries(record).forEach(([key, value]) => {
          if (key in fieldIndices && !isValidField(value, key)) {
            errors.push(`Invalid value for ${key}: "${value}"`);
          }
        });

        if (errors.length > 0) {
          throw new Error(
            `Validation failed for row: ${JSON.stringify(
              row
            )}\nErrors: ${errors.join(", ")}`
          );
        }

        // Add the valid record to the result
        result.push(record);
        return result;
      }, [] as ExcelRow[]);
      if (filteredData.length > 0) {
        try {
          // Copy the file to the upload directory
          fs.copyFileSync(filePath, newDestPath);

          // Rename the copied file with the new name
          // fs.renameSync(destPath, newDestPath);
          // console.log(`File renamed from ${destPath} to ${newDestPath}`);
        } catch (error) {
          console.error("Error during file operations:", error);
        }
        return {
          success: true,
          message: `File uploaded successfully: ${fileName}`,
          filePath: newDestPath,
          data: filteredData, // Send the extracted data back to the frontend
        };
      } else {
        return {
          success: false,
          message: "Error uploading file",
        };
      }
    } catch (error: any) {
      console.error("Error uploading file:", error.message);
      return { success: false, error: error.message };
    }
  }
);
// Handle fetching uploaded file

ipcMain.handle(
  "fetch-uploaded-file",
  async (
    event: IpcMainInvokeEvent,
    filter?: string
  ): Promise<FetchUploadedFileResponse> => {
    try {
      // Read all files in the upload directory
      const files = fs.readdirSync(uploadDir);

      // Map files to objects with name and path
      let fileObjects = files
        .map((file) => ({
          name: file,
          path: path.join(uploadDir, file),
        }))
        .filter((file) => {
          // Filter by Excel file extensions
          return /\.(xlsx|xls|xlt|xlsm|xlam|csv)$/i.test(file.name);
        });

      // Apply additional filtering by name if a filter is provided
      if (filter) {
        const nameFilter = filter.toLowerCase().trim(); // Normalize the filter
        fileObjects = fileObjects.filter((file) => {
          return file.name.toLowerCase().includes(nameFilter); // Filter by name
        });
      }

      if (fileObjects.length === 0) {
        return {
          success: false,
          error: "No matching files found.",
        };
      }

      // Parse the Excel file
      const workbook = XLSX.readFile(fileObjects[0].path);
      const sheetName = workbook.SheetNames[0]; // Get the first sheet
      const worksheet = workbook.Sheets[sheetName];

      // Convert the worksheet to JSON
      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get raw data with headers

      // Extract column indices for required fields
      const headers: string[] = data[0].map((e) => e.trim()); // First row contains headers
      const fieldIndices = {
        NUMERO_COMPTE: headers.indexOf("numero de compte"),
        CODE_AGENCE: headers.indexOf("code agence"),
        NOMBRE_CARNET: headers.indexOf("nombre de carnet"),
        NOMBRE_FEUILLE: headers.indexOf("nombre de feuilles"),
        CODE_TRANSACTION: headers.indexOf("code transaction"),
        NOM_CLIENT: headers.indexOf("nom client"),
        ADR_CLIENT: headers.indexOf("adresse"),
        CODE_BANQUE: headers.indexOf("code bank"),
        CODE_PAYS: headers.indexOf("code pays"),
        NUMERO_DEBUT_CHEQUE: headers.indexOf("numero de debut"),
        DEVISE: headers.indexOf("devise"),
        SERIE: headers.indexOf("serie"),
        REF: headers.indexOf("ref int"),
      };

      // Filter and map the data to extract required fields
      const filteredData: any[] = data.slice(1).map((row) => {
        function calculateCleRIB(row: any): string {
          const fullNumber =
            row[fieldIndices.CODE_BANQUE] +
            row[fieldIndices.CODE_AGENCE] +
            row[fieldIndices.NUMERO_COMPTE];
          const N = fullNumber * 100;
          const remainder = Number(N % 97);
          const cléControle = remainder === 0 ? 97 : 97 - remainder;
          return String(cléControle).padStart(2, "0");
        }

        function formatWithLeadingZeros(number: number, totalLength = 8) {
          // Convert number to string first
          const numStr = number.toString();
          // Add leading zeros to reach the desired length
          return numStr.padStart(totalLength, "0");
        }

        function generateCMC7(row: any, CLE_RIB: string): string {
          const ref = row[fieldIndices.REF].split("/")[0];
          const code = row[fieldIndices.REF].split("/")[1];

          const num = formatWithLeadingZeros(
            row[fieldIndices.NUMERO_DEBUT_CHEQUE]
          );
          const a = `<${num}${Number(row[fieldIndices.CODE_TRANSACTION])}>${row[fieldIndices.CODE_BANQUE]}${row[fieldIndices.CODE_AGENCE]}${row[fieldIndices.NUMERO_COMPTE]}${CLE_RIB}:${ref};${code}`;
          return a; /* `S3${row.NUMERO_CHEQUE || "021"}S3${
            row[fieldIndices.CODE_AGENCE]
          }S5${row[fieldIndices.CODE_BANQUE]}S1${
            row[fieldIndices.NUMERO_COMPTE]
          }${CLE_RIB}S2`; */
        }

        const rib = calculateCleRIB(row);

        return {
          NUMERO_COMPTE: row[fieldIndices.NUMERO_COMPTE],
          CODE_AGENCE: row[fieldIndices.CODE_AGENCE],
          NOMBRE_CARNET: row[fieldIndices.NOMBRE_CARNET],
          NOMBRE_FEUILLE: row[fieldIndices.NOMBRE_FEUILLE],
          CODE_TRANSACTION: row[fieldIndices.CODE_TRANSACTION],
          NOM_CLIENT: row[fieldIndices.NOM_CLIENT],
          ADR_CLIENT: row[fieldIndices.ADR_CLIENT],
          CODE_BANQUE: row[fieldIndices.CODE_BANQUE],
          CODE_PAYS: row[fieldIndices.CODE_PAYS],
          NUMERO_DEBUT_CHEQUE: row[fieldIndices.NUMERO_DEBUT_CHEQUE],
          DEVISE: row[fieldIndices.DEVISE],
          SERIE: row[fieldIndices.SERIE],
          RIB: rib,
          CMC7: generateCMC7(row, rib),
        };
      });

      return {
        success: true,
        message: "File fetched successfully",
        filePath: fileObjects[0].path,
        data: filteredData, // Send the extracted data back to the frontend
      };
    } catch (error: any) {
      console.error("Error fetching uploaded files:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);
setupDatabase();

app.whenReady().then(async () => {
  createLoadingWindow();

  // Call the setup function when the app starts
  // Simulate some asynchronous task (e.g., fetching data)
  setTimeout(() => {
    // Step 2: Create the main window after the task is done
    createWindow();
  }, 1300);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoadingWindow();
  }
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Communication
/* ipcMain.handle("insert-data", async (event, table, data) => {
  const columns = Object.keys(data).join(", ");
  const placeholders = Object.keys(data)
    .map(() => "?")
    .join(", ");
  const values = Object.values(data);

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  const stmt = db.prepare(sql);
  const result = stmt.run(values);
  return result.lastInsertRowid;
});

ipcMain.handle("query-data", async (event, sql, params) => {
  const stmt = db.prepare(sql);
  const rows = params ? stmt.all(params) : stmt.all();
  return rows;
}); */
// Listen for the 'authenticate-user' event from the renderer process
ipcMain.on("authenticate-user", (event, credentials) => {
  const { email, password } = credentials;
  try {
    // Prepare the SQL statement
    const stmt = db.prepare(
      "SELECT role FROM users WHERE email = ? AND password = ?"
    );
    const row = stmt.get(email, password);
    if (row) {
      console.log("row", row);
      // User exists, send the role back to the renderer process
      event.reply("authentication-result", { success: true, user: row });
    } else {
      // User does not exist
      event.reply("authentication-result", {
        success: false,
        message: "ERROR_CREDENTIALS",
      });
    }
  } catch (err: any) {
    console.error("Database query error:", err.message);
    event.reply("authentication-result", {
      success: false,
      message: "An error occurred.",
    });
  }
});
ipcMain.on("add-key", (event, data) => {
  db.prepare(
    "INSERT INTO PrivateKeys (privateKey ,publicKey ) VALUES (?,?)"
  ).run(data.privateKey, data.publicKey);
  event.reply("key-added");
});
// get key
ipcMain.on("get-keys", (event) => {
  const rows = db.prepare(`SELECT * FROM PrivateKeys`).all();
  event.reply("keys-loaded", rows);
});
// delete key
ipcMain.on("delete-key", (event, id) => {
  db.prepare("DELETE FROM PrivateKeys WHERE id = ?").run(id);
  event.reply("key-deleted");
});
