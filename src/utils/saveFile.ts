import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";

export const saveFile = async (
  file: File,
  folder: string
): Promise<string> => {
  const uploadDir = join(process.cwd(), "uploads", folder);
  

  await mkdir(uploadDir, { recursive: true });

  const ext = extname(file.name || "");
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${ext}`;

  const fullPath = join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(fullPath, buffer);


  return `/api/uploads/${folder}/${fileName}`;
};