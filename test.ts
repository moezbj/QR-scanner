import fs from "fs";
import path from  "path";

export function isExistFile(uploadDir:string, fileName:string, isImage:boolean) {
  // Read all files in the upload directory
  const files = fs.readdirSync(uploadDir);
  const fileObjects = files
    .map((file) => ({
      name: file,
      path: path.join(uploadDir, file),
    }))
    .filter((file) => {
      // Split the file name by the `|` symbol and compare the part before it
      const fileNameBeforePipe = isImage
        ? file.name.trim()
        : file.name.split("~")[0].trim();
        console.log('fileName', fileName)

        console.log('fileNameBeforePipe', fileNameBeforePipe)

      const isFileNameMatch =
        (isImage ? fileNameBeforePipe.split(".")[0] : fileNameBeforePipe) ===
        fileName.split(".")[0];

      return isFileNameMatch;
    });
  return fileObjects;
}
