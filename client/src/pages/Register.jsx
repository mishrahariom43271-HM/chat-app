import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

function Register() {
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/auth/register", form);
            navigate("/chat");
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#313338]">
            {/* Left: branding panel — different theme (green/teal gradient) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-500 to-teal-700 items-center justify-center overflow-hidden">
                <div className="absolute -top-16 -right-10 w-56 h-56 bg-white/10 rounded-full"></div>
                <div className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full"></div>
                <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white/10 rounded-full"></div>

                <div className="relative z-10 px-12 max-w-md">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xl">
                            C
                        </div>
                        <span className="text-white font-bold text-xl">Chat App</span>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
                        Your community is waiting for you.
                    </h1>
                    <p className="text-emerald-50 text-sm mb-8">
                        It takes less than a minute to create your account and jump into a room full of people talking about what you love.
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                            <p className="text-white font-bold text-lg">Free</p>
                            <p className="text-emerald-100 text-[11px]">Forever</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                            <p className="text-white font-bold text-lg">∞</p>
                            <p className="text-emerald-100 text-[11px]">Rooms</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 text-center">
                            <p className="text-white font-bold text-lg">Live</p>
                            <p className="text-emerald-100 text-[11px]">Real-time</p>
                        </div>
                    </div>

                    <div className="flex items-center -space-x-2">
                        {["bg-pink-400", "bg-yellow-400", "bg-indigo-400", "bg-red-400"].map((c, i) => (
                            <div
                                key={i}
                                className={"w-9 h-9 rounded-full border-2 border-teal-700 " + c + " flex items-center justify-center text-white text-xs font-bold"}
                            >
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                        <span className="text-emerald-50 text-xs pl-4">Join people already chatting</span>
                    </div>
                </div>
            </div>

            {/* Right: form panel */}
            <div className="flex-1 flex items-center justify-center px-6">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
                        <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
                            C
                        </div>
                        <span className="text-white font-bold text-lg">Chat App</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
                    <p className="text-sm text-gray-400 mb-6">Takes less than a minute</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Username
                            </label>
                            <input
                                name="username"
                                placeholder="yourname"
                                value={form.username}
                                onChange={handleChange}
                                className="mt-1 w-full bg-[#1e1f22] text-gray-100 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                className="mt-1 w-full bg-[#1e1f22] text-gray-100 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Password
                            </label>
                            <input
                                name="password"
                                type="password"
                                placeholder="Minimum 6 characters"
                                value={form.password}
                                onChange={handleChange}
                                className="mt-1 w-full bg-[#1e1f22] text-gray-100 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-md transition"
                        >
                            {loading ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    {error && (
                        <p className="text-red-400 text-sm mt-4 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    <p className="text-sm text-gray-400 mt-6 text-center">
                        Already have an account?{" "}
                        <Link to="/login" className="text-emerald-400 font-medium hover:underline">
                            Login instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;