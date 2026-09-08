/**
 * Client-side high performance image compressor.
 * Downscales 8-15MB phone camera photos to ~250KB before network transmission.
 * Critical for field officers in remote rural zones with 2G/3G intermittent signal.
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<File> {
  // If server-side or not an image that can be compressed, pass through
  if (typeof window === "undefined" || !file.type.startsWith("image/") || file.type.includes("svg")) {
    return file;
  }

  // If already under 350KB, no compression necessary
  if (file.size <= 350 * 1024) {
    return file;
  }

  const maxWidth = options.maxWidth || 1600;
  const maxHeight = options.maxHeight || 1600;
  const quality = options.quality ?? 0.78;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
