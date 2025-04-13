export interface IVersionsAPI {
  node: () => string;
  chrome: () => string;
  electron: () => string;
}

export interface IElectronAPI {
  setTitle: (title: string) => void;
  openFile: () => Promise<string>;
  send: (channel: string, params?: any) => void;
  receive: (channel: string, callback: any) => void;
  onUpdateCounter: (callback: (value: number) => void) => void;
  fetchUploadedFiles: () => any[];
  fetchUploadedFile: (file: string) => {
    success: boolean;
    message: string;
    data: any;
    error: any;
    filePath: string;
  };
  fetchUploadedPDFFile: (file: string) => {
    success: boolean;
    message: string;
    data: any;
    error: any;
    filePath: string;
  };
  uploadFile: (file?: string) => {
    success: boolean;
    message: string;
    data: any;
    error: any;
    filePath: string;
  };
  deleteFile: (path: string) => {
    success: boolean;
    message: string;
    error: any;
  };
  uploadPDF: (
    d: any,
    n: string,
  ) => {
    success: boolean;
    message: string;
    data: any;
    error: any;
    filePath: string;
  };
  detectPrinters: () => any;
  printPdf: (file: string, printer: string) => any;
  uploadImage: (p: path) => {
    success: boolean;
    message: string;
    data: any;
    error: any;
    filePath: string;
  };
}

declare global {
  interface Window {
    versions: IVersionsAPI;
    electronAPI: IElectronAPI;
  }
}
