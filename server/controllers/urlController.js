const Url = require("../models/Url");
const logger = require("../utils/logger");
const { nanoid } = require("nanoid");
const validator = require("validator");
const redis = require("../utils/redis");

/**
 * @desc    Create a short URL
 * @route   POST /api/urls
 * @access  Private
 */
const createShortUrl = async (req, res, next) => {
  try {
    let { originalUrl, customAlias, expiresAt } = req.body;
    const userId = req.user.id;

    //Normalize URL
    if (!/^https?:\/\//i.test(originalUrl)) {
      originalUrl = `https://${originalUrl}`;
    }

    if (!validator.isURL(originalUrl)) {
      const error = new Error("Invalid URL format");
      error.statusCode = 400;
      throw error;
    }

    // Check for existing URL

    const existingUrl = await Url.findOne({ originalUrl, createdBy: userId });
    if (existingUrl) {
      return res.status(200).json({ success: true, data: existingUrl });
    }

    const shortUrl = nanoid(6);

    const url = await Url.create({
      //create a new document
      originalUrl,
      shortUrl,
      createdBy: userId,
      clicks: 0,
      meta: { expiresAt },
    });

    // Redis TTL Setup
    // Convert IST time string to UTC manually
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();

      const ttlseconds = Math.floor((expirationTime - currentTime) / 1000);

      if (ttlseconds > 0) {
        await redis.setex(`url:${shortUrl}`, ttlseconds, "expired");
      } else {
        console.warn("🚫 expiresAt is in the past or too soon:", expiresAt);
        const error = new Error("Expiration time must be in the future");
        error.statusCode = 400;
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        originalUrl: url.originalUrl,
        shortUrl: url.shortUrl,
        clicks: url.clicks,
        createdAt: url.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Redirect to original URL
 * GET /:code
 * Public
 */
const redirectUrl = async (req, res, next) => {
  try {
    const { code } = req.params;

    const redisKeyExists = await redis.get(`url:${code}`);
    if (!redisKeyExists) {
      return res
        .status(410)
        .json({ success: false, message: "This URL has expired" });
    }

    const url = await Url.findOneAndUpdate(
      { shortUrl: code },
      { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } },
      { new: true }
    );

    if (!url) {
      const error = new Error("URL not found");
      error.statusCode = 404;
      throw error;
    }

    const analyticsData = {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referrer"),
    };

    await Url.updateOne(
      { _id: url._id },
      { $push: { analytics: analyticsData } }
    );

    res.redirect(url.originalUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * Get URL statistics
 * GET /api/urls/:code/stats
 * Private (Owner only)
 */
const getUrlStats = async (req, res, next) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    const url = await Url.findOne({ shortUrl: code, createdBy: userId }); //.select('+analytics');

    if (!url) {
      const error = new Error("URL not found or unauthorized");
      error.statusCode = 404;
      throw error;
    }

    const analytics = url.analytics || [];

    const stats = {
      totalClicks: url.clicks,
      topReferrers: getTopItems(analytics, "referrer"),
      devices: getDeviceBreakdown(analytics),
      lastClicked: url.lastClickedAt,
      createdAt: url.createdAt,
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// Helpers
const getTopItems = (analytics, field) => {
  const counts = analytics.reduce((acc, item) => {
    const key = item?.[field] || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
};

const getDeviceBreakdown = (analytics) => {
  const devices = { mobile: 0, desktop: 0, tablet: 0, bot: 0, other: 0 };
  analytics.forEach(({ userAgent }) => {
    if (!userAgent) return devices.other++;

    const ua = userAgent.toLowerCase();

    if (ua.includes("mobile")) devices.mobile++;
    else if (ua.includes("tablet")) devices.tablet++;
    else if (ua.includes("bot")) devices.bot++;
    else if (ua.includes("mozilla") || ua.includes("chrome")) devices.desktop++;
    else devices.other++;
  });
  return devices;
};

module.exports = {
  createShortUrl,
  redirectUrl,
  getUrlStats,
};
