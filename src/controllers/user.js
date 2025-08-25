import asyncHandler from "../utils/asyncHandler.js"
import { apiError } from "../utils/ApiError.js"
import User from "../models/user.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    /* get username from frontend
    validation
    check if user already exists : username or email
    check for images
    check for avatar
    upload them to cloudinary
    create user object - create entry in db
    remove password and refresh token field from response 
    check for user creation 
    return res */

    const { fullName, email, username, password } = req.body;
    console.log(fullName, email, username, password);

    if (!fullName || !email || !username || !password) {
        throw new apiError(400, "fullName, email, username and password are required fields.")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(existedUser) {
        throw new apiError(409, "User with this email or username already existing")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log(avatar);
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new apiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new apiError(500, "Something went wrong while registeing the user")
    }
    else {
        return res.status(201).json(
            new ApiResponse(200, createdUser, "User Registered Successfully.")
        )
    }
});



export { registerUser };