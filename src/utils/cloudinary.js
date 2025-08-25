import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }
        //upload the file on cloudniary
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // file has uploaded successfully
        fs.unlinkSync(localFilePath);
        return uploadResult;

    } catch (error) {
        console.error("Cloudinary upload error ", error);
        fs.unlinkSync(localFilePath); // remove the localy saved temporary file as the upload failed
        return null;
    }
}

export { uploadOnCloudinary };