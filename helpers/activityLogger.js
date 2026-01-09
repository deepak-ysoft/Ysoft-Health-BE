const sql = require("mssql");
const geoip = require("geoip-lite");
const { connectToDatabase } = require("../config/config");

const logActivity = async ({ type, ip, title, metadata = {} }) => {
  try {
    const pool = await connectToDatabase();

    let userId = metadata?.userId || null;

    let enrichedMetadata = { ...metadata };

    // 🌍 ADD LOCATION ONLY ON LOGIN
    if (type === "LOGIN" && ip && ip !== "::1" && ip !== "127.0.0.1") {
      const geo = geoip.lookup(ip);

      if (geo) {
        enrichedMetadata.location = {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
        };
      }
    }

    const request = pool
      .request()
      .input("ActivityType", sql.NVarChar(50), type)
      .input("IPAddress", sql.NVarChar(50), ip)
      .input("Title", sql.NVarChar(255), title)
      .input(
        "Metadata",
        sql.NVarChar(sql.MAX),
        JSON.stringify(enrichedMetadata)
      );

    if (userId) {
      request.input("UserId", sql.UniqueIdentifier, userId);
    }

    await request.execute("pwa_LogActivity");
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
};

module.exports = { logActivity };
