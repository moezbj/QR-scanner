import { contextBridge, ipcRenderer } from "electron";

console.log("Preload script loaded"); // Debugging: Check if preload script runs

contextBridge.exposeInMainWorld("electronAPI", {
  insertData: (table: any, data: any) =>
    ipcRenderer.invoke("insert-data", table, data),
  queryData: (sql: any, params: any) =>
    ipcRenderer.invoke("query-data", sql, params),
  uploadFile: (event: any, selectFormat: any) =>
    ipcRenderer.invoke("upload-file", event, selectFormat),
  fetchUploadedFiles: () => ipcRenderer.invoke("fetch-uploaded-files"),
  fetchUploadedFile: (name: any) =>
    ipcRenderer.invoke("fetch-uploaded-file", name),
  deleteFile: (filePath: any) => ipcRenderer.invoke("delete-file", filePath),

  send: (channel: any, data: any) => {
    // Whitelist channels
    const validChannels = [
      "authenticate-user",
      "add-key",
      "get-keys",
      "delete-key",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: any, func: any) => {
    // Whitelist channels
    const validChannels = [
      "authentication-result",
      "key-added",
      "keys-loaded",
      "key-deleted",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  off: (channel: any) => {
    ipcRenderer.removeAllListeners(channel); // Remove all listeners for the channel
  },
});
