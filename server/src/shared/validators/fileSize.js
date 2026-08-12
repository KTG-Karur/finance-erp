// Uploads arrive as base64 data URLs (client reads files via FileReader.
// readAsDataURL — see e.g. client/src/finance/borrowers/CustomerFormPage.jsx).
// The client already checks file size before encoding, but that's only a UX
// nicety — a direct API call skips it entirely, so this is the real boundary.
export function estimateBase64Bytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Part = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = (base64Part.match(/=+$/) || [''])[0].length;
  return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
}

export function assertMaxFileSize(dataUrl, maxBytes, fieldLabel = 'File') {
  if (!dataUrl) return;
  const bytes = estimateBase64Bytes(dataUrl);
  if (bytes > maxBytes) {
    const err = new Error(`${fieldLabel} is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`);
    err.statusCode = 400;
    throw err;
  }
}
