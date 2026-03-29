/**
 * Downloads a JSON payload as a local file.
 * @param {import('./contracts.js').ExportPayload} payload
 */
export function downloadPayload(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = payload.generatedAt.replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `${payload.toolId}-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

