import api from './client';

/**
 * Uploads a single binary file via direct multipart/form-data to the server disk.
 * The server writes the stream directly to server/uploads/<companyCode>/<subfolder>/<filename>
 * and returns the relative URL (/uploads/...) with NO Base64 encoding.
 *
 * @param {File|Blob} file - The raw file object from the file input
 * @param {Object} options - Upload options { subfolder, category, prefix }
 * @returns {Promise<{ name: string, url: string, type: string, size: number }>}
 */
export async function uploadFile(file, options = {}) {
  const { subfolder = 'cust-proofs', category = 'doc', prefix = 'file' } = options;

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.jpg');
  formData.append('subfolder', subfolder);
  formData.append('category', category);
  formData.append('prefix', prefix);

  const res = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return res.data.data;
}

/**
 * Uploads multiple binary files via direct multipart/form-data to the server disk.
 *
 * @param {FileList|Array<File>} files - Array of raw file objects
 * @param {Object} options - Upload options { subfolder, category, prefix }
 * @returns {Promise<Array<{ name: string, url: string, type: string, size: number }>>}
 */
export async function uploadMultipleFiles(files, options = {}) {
  const { subfolder = 'cust-proofs', category = 'doc', prefix = 'doc' } = options;
  const fileArray = Array.from(files || []);
  if (!fileArray.length) return [];

  const formData = new FormData();
  for (const f of fileArray) {
    formData.append('files', f, f.name || 'upload.jpg');
  }
  formData.append('subfolder', subfolder);
  formData.append('category', category);
  formData.append('prefix', prefix);

  const res = await api.post('/upload/multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return res.data.data;
}
