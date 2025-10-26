const DATA_URL_REGEX = /^data:(?<mime>image\/(png|jpeg|jpg|webp));base64,(?<data>[A-Za-z0-9+/=]+)$/;

export const parseDataUrl = (dataUrl) => {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match || !match.groups) {
    throw new Error("Invalid image data URL");
  }

  const { mime, data } = match.groups;
  return {
    mimeType: mime,
    buffer: Buffer.from(data, "base64"),
  };
};

export const bufferToDataUrl = (buffer, mimeType = "image/png") => {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
};
