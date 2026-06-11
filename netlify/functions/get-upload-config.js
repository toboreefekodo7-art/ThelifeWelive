const { json } = require("./lib/supabase");

exports.handler = async () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "";
  const folder = process.env.CLOUDINARY_FOLDER || "tlwl/story-submissions";
  const maxFileSize = Number(process.env.CLOUDINARY_MAX_FILE_SIZE || 104857600);

  if (!cloudName || !uploadPreset) {
    return json(200, {
      configured: false,
      message: "Cloudinary uploads are not configured yet. Paste a video link for now."
    });
  }

  return json(200, {
    configured: true,
    cloudName,
    uploadPreset,
    folder,
    maxFileSize
  });
};
