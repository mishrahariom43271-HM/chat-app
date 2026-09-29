import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const sendToken = (res, user, status = 200) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res
        .status(status)
        .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({ id: user._id, username: user.username, email: user.email });
};

export const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
        return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({ username, email, password });
    sendToken(res, user, 201);
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    sendToken(res, user);
};

export const logout = (req, res) => {
    res.clearCookie("token").json({ message: "Logged out" });
};