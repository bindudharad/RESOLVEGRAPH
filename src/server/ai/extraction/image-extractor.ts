import fs from 'node:fs/promises';
import path from 'node:path';
import { BoundingBox } from '../schemas/extraction.schema';

export interface ImageInspectionResult {
  mimeType: string;
  base64DataUrl: string;
  fileSizeBytes: number;
  filename: string;
}

export class ImageExtractor {
  /**
   * Reads an image file and converts to base64 data URL for vision models.
   */
  public static async prepareImageForVision(filePath: string): Promise<ImageInspectionResult> {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    const base64 = fileBuffer.toString('base64');
    const base64DataUrl = `data:${mimeType};base64,${base64}`;

    return {
      mimeType,
      base64DataUrl,
      fileSizeBytes: fileBuffer.byteLength,
      filename: path.basename(filePath)
    };
  }

  /**
   * Validates and normalizes bounding box coordinates to 0-1000 scale.
   */
  public static normalizeBoundingBox(box: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    label?: string;
  }): BoundingBox {
    return {
      ymin: Math.max(0, Math.min(1000, Math.round(box.ymin))),
      xmin: Math.max(0, Math.min(1000, Math.round(box.xmin))),
      ymax: Math.max(0, Math.min(1000, Math.round(box.ymax))),
      xmax: Math.max(0, Math.min(1000, Math.round(box.xmax))),
      label: box.label
    };
  }
}
