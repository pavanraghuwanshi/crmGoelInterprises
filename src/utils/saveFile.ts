import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";

export const saveFile = async (
  file: File,
  folder: string
): Promise<string> => {
  const uploadDir = join(process.cwd(), "uploads", folder);

  await mkdir(uploadDir, { recursive: true });

  const ext = extname(file.name);
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}${ext}`;

  const filePath = join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  return `/uploads/${folder}/${fileName}`;
};