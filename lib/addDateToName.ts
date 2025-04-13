import { getFormattedDate } from "./formatDate";

export function addFormattedDateToFileName(fileName:string) {
  // Split the file name into base name and extension
  const parts = fileName.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid file name: No extension found.");
  }

  const baseName = parts.slice(0, -1).join("."); // Reconstruct the base name if there are multiple dots
  const extension = parts[parts.length - 1]; // Get the last part as the extension

  // Get the formatted date
  const formattedDate = getFormattedDate();

  // Combine the base name, formatted date, and extension
  return `${baseName}${formattedDate}.${extension}`;
}
