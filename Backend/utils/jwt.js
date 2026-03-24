const jwt = require("jsonwebtoken");

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error("Invalid or expired token");
    }
};

/**
 * Get common cookie options
 */
const getCookieOptions = () => {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
    };
};

/**
 * Sign admin token
 */
const signAdminToken = (admin) => {
    const payload = {
        id: admin.id,
        email: admin.email,
        role: "admin",
        is_super_admin: !!admin.is_super_admin,
    };
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || "1d" }
    );
};

/**
 * Set admin token cookie
 */
const setAdminCookie = (res, token) => {
    const maxAge = (parseInt(process.env.JWT_ADMIN_COOKIE_DAYS, 10) || 1) * 24 * 60 * 60 * 1000;
    res.cookie("admin_token", token, { ...getCookieOptions(), maxAge });
};

/**
 * Clear admin token cookie
 */
const clearAdminCookie = (res) => {
    res.clearCookie("admin_token", getCookieOptions());
};

module.exports = {
    verifyToken,
    signAdminToken,
    setAdminCookie,
    clearAdminCookie,
    getCookieOptions,
};
