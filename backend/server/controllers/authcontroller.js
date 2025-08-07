const User = require("../models/User");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const config = require("../config/config");
const redis = require("../utils/redis");

//generate new tokens
const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwt.access_secret,
    { expiresIn: config.jwt.accessExpiration }
  );

  //generating new refresh token
  const refreshToken = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwt.refresh_secret,
    { expiresIn: config.jwt.refreshExpiration }
  );
  const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
  await redis.setex(`rt:${refreshToken}`, ttl, user._id.toString());
  return { accessToken, refreshToken };
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    //check if already existed
    if (await User.isEmailTaken(email)) {
      const error = new Error("Email already in use");
      error.status = 400;
      throw error;
    }
    // create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
    });

    const tokens = await generateTokens(user);
    await redis.setex
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid Credentials");
      error.status = 401;
      throw error;
    }
    // check password
    if (!(await user.isPasswordMatch(password))) {
      const error = new Error("Invalid Credentials");
      error.status = 401;
      throw error;
    }
    //generate tokens
    const tokens = await generateTokens(user);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh authentication tokens
 * @route   POST /api/v1/auth/refresh-tokens
 * @access  Private
 */

const handleRefreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(402).json({ success: false, message: 'Refresh token missing' });
        }

        const exists = await redis.get(`rt:${refreshToken}`);
        if(!exists){
          return res.status(403).json({success: false, message: 'Refresh Token reused or invalid'})
        } 

        const decoded = jwt.verify(refreshToken, config.jwt.refresh_secret);
        console.log("Decoded refresh token:", decoded);

        const user = await User.findById(decoded.sub);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        //Invalidate old refresh tokens
        await redis.del(`rt:${refreshToken}`);

        const tokens = await generateTokens(user);
        console.log("Generated accessToken:", tokens.accessToken);


        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: config.env === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            accessToken: tokens.accessToken,
        });
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};
/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try{
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer', '');
    if(!token) return res.status(401).json({success: false, message: 'Athentication token missing'});


    const decoded = jwt.verify(token,config.jwt.secret);
    const expiry = decoded.exp - Math.floor(Date.now()/1000);
    if(expiry <= 0) return res.status(400).json({success: false, message: 'Token already expired'});

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await redis.setex(`bl:${tokenHash}`, expiry, 'blacklisted');

    res.clearCookie('refreshToken');
    res.status(200).json({success: true, message: 'Logged out successfully'})
  }catch (error){
    next (error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
module.exports = {
  register,
  login,
  handleRefreshToken,
  logout,
};
