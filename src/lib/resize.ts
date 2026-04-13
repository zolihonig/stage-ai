// Resize images client-side before sending to API
// Real estate photos can be 5-15MB as base64 which hits Vercel's 4.5MB limit
// Resize to max 2048px on longest side — still plenty for staging quality

const MAX_DIMENSION = 2048;

export function resizeImageForApi(dataUrl: string): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      // Only resize if larger than max
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w > h) {
          h = Math.round((h / w) * MAX_DIMENSION);
          w = MAX_DIMENSION;
        } else {
          w = Math.round((w / h) * MAX_DIMENSION);
          h = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      // Always output as JPEG for consistency and smaller size
      const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = resizedDataUrl.split(",")[1];

      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.src = dataUrl;
  });
}
