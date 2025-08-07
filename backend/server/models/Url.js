const mongoose = require("mongoose");
const nanoid = require("nanoid");

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(
            v
          );
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },
    shortUrl: {
      type: String,
      required: true,
      default: nanoid.generate,
      unique: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    lastClickedAt: {
      type: Date,
    },
    meta: {
      isCustom: {
        type: Boolean,
        default: false,
      },
      expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }, // Auto-delete expired docs
      },
    },
    analytics: [
      {
        timestamp: { type: Date, default: Date.now },
        referrer: String,
        ip: String,
        userAgent: String,
        country: String,
        deviceType: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);


// checks if shorturl is taken
urlSchema.statics.isShortUrlTaken = async function(shortUrl){
    const url = await this.findOne({shortUrl});
    return !!url;
};

//indexing
urlSchema.index({shortUrl:1, createdBy: 1});
urlSchema.index({createdAt: 1});
urlSchema.index({'meta.expiresAt': 1});

urlSchema.methods.toJSON = function () {
  const url = this.toObject();
  delete url.__v;
  return url;
};

const Url = mongoose.model('Url', urlSchema);
module.exports = Url;