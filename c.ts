import cloudinary from "cloudinary";

// Server-only config. Never use NEXT_PUBLIC_* for the api_secret — that prefix
// inlines the value into the client bundle, leaking the Cloudinary secret.
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryV2 = cloudinary.v2;