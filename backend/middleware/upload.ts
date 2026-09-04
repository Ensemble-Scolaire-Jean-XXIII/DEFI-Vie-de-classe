import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Format d'image non supporté."));
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  multerUpload.single("image")(req, res, (err: any) => {
    if (err) return next(err);
    processUpload(req, res, next);
  });
};

const isPng = (b: Buffer) =>
  b.length > 8 &&
  b[0] === 0x89 &&
  b[1] === 0x50 &&
  b[2] === 0x4e &&
  b[3] === 0x47 &&
  b[4] === 0x0d &&
  b[5] === 0x0a &&
  b[6] === 0x1a &&
  b[7] === 0x0a;

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

const isGif = (b: Buffer) =>
  b.length > 6 && b.toString("ascii", 0, 6) === "GIF89a" ||
  b.length > 6 && b.toString("ascii", 0, 6) === "GIF87a";

const isWebp = (b: Buffer) =>
  b.length > 12 &&
  b.toString("ascii", 0, 4) === "RIFF" &&
  b.toString("ascii", 8, 12) === "WEBP";

const isValidImage = (b: Buffer) =>
  isPng(b) || isJpeg(b) || isGif(b) || isWebp(b);

const processUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file || !req.file.buffer) {
      return next();
    }

    if (!isValidImage(req.file.buffer)) {
      return next(new Error("Le fichier n'est pas une image valide."));
    }

    let sharp: any;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      const fallbackName = `${crypto.randomUUID()}.webp`;
      fs.writeFileSync(
        path.join(uploadsDir, fallbackName),
        req.file.buffer,
      );
      (req.file as any).filename = fallbackName;
      (req.file as any).path = path.join(uploadsDir, fallbackName);
      return next();
    }

    const resized = await sharp(req.file.buffer)
      .resize({ width: 500, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const hash = crypto.createHash("sha1").update(resized).digest("hex");
    const filename = `${hash}.webp`;
    const filepath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, resized);
    }

    (req.file as any).filename = filename;
    (req.file as any).path = filepath;
    next();
  } catch (error: any) {
    next(error);
  }
};

export const UPLOADS_DIR = uploadsDir;
