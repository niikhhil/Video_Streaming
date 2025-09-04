import asyncHandler from "../utils/asyncHandler.js"
import { apiError } from "../utils/ApiError.js"
import User from "../models/user.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    /*  1. get username from frontend
        2. validation
        3. check if user already exists : username or email
        4. check for images
        5. check for avatar
        6. upload them to cloudinary
        7. create user object - create entry in db
        8. remove password and refresh token field from response 
        9. check for user creation 
        10. return res
     */

    const { fullName, email, username, password } = req.body;
    // console.log(fullName, email, username, password);

    if (!fullName || !email || !username || !password) {
        throw new apiError(400, "fullName, email, username and password are required fields.")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(existedUser) {
        throw new apiError(409, "User with this email or username already existing")
    }

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log(avatar);
    
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

const loginUser = asyncHandler(async (req, res) => {
    /*  1. get data from req.body
        2. username or email based loginUser
        3. check if user already exist / not exist
        4. exist -> password check / user not exit -> register page
        5. access and refresh token
        6. send cookies
    */

        const generateAccessAndRefreshTokens = async (userId) => {
            try {
                const user = await User.findById(userId);
                const accessToken = user.genrateAccessToken();
                const refreshToken = user.genrateRefreshToken();

                user.refreshToken = refreshToken;
                await user.save({validateBeforeSave: false });

                return {accessToken, refreshToken};

            } catch (error) {
                throw new apiError(500, "Something went wrong while generating refresh and access tokens");
            }
        }

        const {email, username, password} = req.body;

        if(!username || !email) {
            throw new apiError(400, "Username or email is required.")
        }

        const user = await User.findOne({
            $or: [{username}, {email}]
        });

        if(!user) {
            throw new apiError(404, "user does not exist");
        }
        
        const isPasswordValid = await user.isPasswordCorrect(password);
        if(!isPasswordValid) {
            throw new apiError(401, "Password Incorrect");
        }

        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
});



export { registerUser, loginUser };