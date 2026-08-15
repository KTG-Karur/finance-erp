import fs from 'fs';
import path from 'path';

const MIME_EXT_MAP = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

function sanitizeCode(code) {
  if (!code) return 'default';
  return String(code).trim().replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase() || 'default';
}

export const COMPANY_UPLOAD_SUBFOLDERS = [
  'customer',
  'cust-proofs',
  'nominee-proofs',
  'company-info',
  'staff',
  'investors',
  'collections'
];

/**
 * Pre-creates all categorized upload directories on disk for a company.
 */
export async function ensureCompanyUploadDirectories(companyCode) {
  const cleanCode = sanitizeCode(companyCode);
  for (const folder of COMPANY_UPLOAD_SUBFOLDERS) {
    const dirPath = path.resolve(process.cwd(), 'uploads', cleanCode, folder);
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Given any string that contains an /uploads/ path — whether the stored relative
 * form ('/uploads/KTG/company-info/x.png') or an absolute URL the client may
 * send back after rendering ('https://api-host/uploads/KTG/company-info/x.png')
 * — returns the canonical relative path. Plain external URLs / other strings are
 * passed through untouched so we never mutate non-upload data.
 */
function normalizeUploadPath(value) {
  const idx = value.indexOf('/uploads/');
  if (idx === -1) return value;
  return value.slice(idx);
}

/**
 * Saves a Base64 data URL to server/uploads/<companyCode>/<subfolder>/<filename>
 * and returns the relative URL path (/uploads/<companyCode>/<subfolder>/<filename>).
 * If the input is already a URL or path, it normalizes any /uploads/ occurrence
 * back to the relative form so stored DB values are never host-locked.
 */
export async function saveBase64File(dataUrlOrPath, companyCode = 'default', subfolder = 'images', prefix = 'file') {
  if (!dataUrlOrPath || typeof dataUrlOrPath !== 'string') {
    return dataUrlOrPath || null;
  }

  const trimmed = dataUrlOrPath.trim();
  // Already a file URL or path — normalize a resubmitted /uploads/ path back to
  // relative form (see normalizeUploadPath above)
  if (!trimmed.startsWith('data:')) {
    return normalizeUploadPath(trimmed);
  }

  // Parse data URL format: data:<mime-type>;base64,<data>
  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    return trimmed;
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const ext = MIME_EXT_MAP[mimeType] || 'jpg';

  const cleanCompanyCode = sanitizeCode(companyCode);
  const cleanSubfolder = String(subfolder).trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'images';
  const cleanPrefix = String(prefix).trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';

  const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const targetDir = path.resolve(process.cwd(), 'uploads', cleanCompanyCode, cleanSubfolder);

  await fs.promises.mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.promises.writeFile(filePath, buffer);

  // Return standard URL path accessible via Fastify static route
  return `/uploads/${cleanCompanyCode}/${cleanSubfolder}/${filename}`;
}

/**
 * Iterates through a documents array (e.g. KYC documents) and converts any base64 payloads to disk files.
 * Automatically routes nominee/guarantor documents to 'nominee-proofs' and customer KYC to 'cust-proofs'.
 */
export async function processDocumentsArray(docs, companyCode = 'default') {
  if (!docs) return null;

  let parsed = docs;
  let isJsonString = false;
  if (typeof docs === 'string') {
    try {
      parsed = JSON.parse(docs);
      isJsonString = true;
    } catch {
      return docs;
    }
  }

  if (!Array.isArray(parsed)) {
    return docs;
  }

  const updated = await Promise.all(
    parsed.map(async (doc, idx) => {
      if (!doc || typeof doc !== 'object') return doc;

      const fileField = doc.file || doc.file_url || doc.url || doc.data;
      if (fileField && typeof fileField === 'string' && fileField.startsWith('data:')) {
        const cat = String(doc.category || doc.type || doc.document_type || `doc_${idx}`).toUpperCase();
        const isNomineeOrGuarantor = cat.includes('NOMINEE') || cat.includes('GUARANTOR');
        const targetSubfolder = isNomineeOrGuarantor ? 'nominee-proofs' : 'cust-proofs';
        const prefix = isNomineeOrGuarantor ? `nominee_${cat}` : `kyc_${cat}`;

        const diskUrl = await saveBase64File(fileField, companyCode, targetSubfolder, prefix);
        return {
          ...doc,
          file: diskUrl,
          file_url: diskUrl,
          url: diskUrl
        };
      }
      // Non-base64 doc: keep as-is, but normalize any resubmitted absolute
      // /uploads/ URL back to the relative stored form.
      if (fileField && typeof fileField === 'string' && fileField.includes('/uploads/')) {
        const rel = normalizeUploadPath(fileField);
        return {
          ...doc,
          file: rel,
          file_url: rel,
          url: rel,
          data: rel
        };
      }
      return doc;
    })
  );

  return isJsonString ? JSON.stringify(updated) : updated;
}

/**
 * Recursively calculates the total disk size in bytes of a folder.
 */
export async function getDirectorySizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let totalBytes = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalBytes += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        totalBytes += stat.size;
      }
    }
  } catch {
    return 0;
  }
  return totalBytes;
}

/**
 * Formats bytes into a human-readable string (e.g. 1.25 MB, 450 KB).
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Returns the storage stats for a single company's uploads directory.
 */
export async function getCompanyStorageStats(companyCode) {
  const cleanCode = sanitizeCode(companyCode);
  const companyDir = path.resolve(process.cwd(), 'uploads', cleanCode);
  const bytes = await getDirectorySizeBytes(companyDir);
  return {
    bytes,
    formatted: formatBytes(bytes)
  };
}

/**
 * Returns the total storage stats for the entire server/uploads folder.
 */
export async function getTotalUploadsStorageStats() {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const bytes = await getDirectorySizeBytes(uploadsDir);
  return {
    bytes,
    formatted: formatBytes(bytes)
  };
}
