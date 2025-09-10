import asyncHandler from "../utils/asyncHandler.js"
import { apiError } from "../utils/ApiError.js"
import User from "../models/user.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating refresh and access tokens");
    }
}

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
        $or: [{ username }, { email }] // object array
    });

    if (existedUser) {
        throw new apiError(409, "User with this email or username already existing")
    }

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log(avatar);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
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

    if (!createdUser) {
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

    const { email, username, password } = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully."))
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new apiError(401, "Unauthorized request");
    }
    try {

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new apiError(401, "Invalid refresh token.")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", options)
            .cookie("newrefreshToken", options)
            .json(
                new ApiResponse(200, { accessToken, refreshToken: newrefreshToken }, "Access token refreshed successfully")
            )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await findById(user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiError(400, "Wrong old Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully."))
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    return res.status(200)
        .json(200, currentUser, "Current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new apiError(400, "All fields are required")
    }

    User.findByIdAndUpdate(req.user?._id, {}, {
        $set: {
            fullName: fullName,
            email,

        }
    },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully."))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
        return new apiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        return new apiError(400, "Avatar while uploading avatar on cloudinary");
    }

    await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    }, {
        new: true
    }
    ).select("-password")
    

    return res.status(200)
        .json(ApiResponse(200, user,"Avatar updated successfully"))
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverLocalPath = req.files?.path

    if (!coverLocalPath) {
        return new apiError(400, "Avatar file is missing")
    }

    const cover = await uploadOnCloudinary(coverLocalPath);
    if (!cover) {
        return new apiError(400, "Avatar while uploading avatar on cloudinary");
    }

    await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, {
        new: true
    }
    ).select("-password");

    return res.status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"))
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage };