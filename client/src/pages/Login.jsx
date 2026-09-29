import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

function Login() {
    const [form, setForm] = useState({ email: "", password: "" });
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
            await api.post("/auth/login", form);
            navigate("/chat");
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#313338]">
            {/* Left: branding panel */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#5865f2] to-[#3b3f9e] items-center justify-center overflow-hidden">
                {/* decorative bubbles */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full"></div>
                <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-white/10 rounded-full"></div>

                <div className="relative z-10 px-12 max-w-md">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#5865f2] font-bold text-xl">
                            C
                        </div>
                        <span className="text-white font-bold text-xl">Chat App</span>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
                        Where your teams talk, in real time.
                    </h1>
                    <p className="text-indigo-100 text-sm mb-8">
                        Create rooms, share files, and stay in sync with instant messaging, typing indicators, and read receipts.
                    </p>

                    <ul className="space-y-3">
                        {[
                            "Real-time messaging with Socket.io",
                            "Group rooms with member management",
                            "File sharing & read receipts",
                        ].map((feature) => (
                            <li key={feature} className="flex items-center gap-3 text-white text-sm">
                                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs shrink-0">
                                    ✓
                                </span>
                                {feature}
                            </li>
                        ))}
                    </ul>

                    {/* mock chat bubble illustration */}
                    <div className="mt-10 bg-white/10 backdrop-blur rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] font-bold text-white">
                                A
                            </div>
                            <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs text-white">
                                Hey, room ban gaya!
                            </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <div className="bg-white text-[#3b3f9e] rounded-lg px-3 py-1.5 text-xs font-medium">
                                Great, joining now
                            </div>
                            <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] font-bold text-white">
                                B
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: form panel */}
            <div className="flex-1 flex items-center justify-center px-6">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
                        <div className="w-9 h-9 bg-[#5865f2] rounded-xl flex items-center justify-center text-white font-bold">
                            C
                        </div>
                        <span className="text-white font-bold text-lg">Chat App</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                    <p className="text-sm text-gray-400 mb-6">Login to continue chatting with your teams</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                className="mt-1 w-full bg-[#1e1f22] text-gray-100 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] placeholder:text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Password
                            </label>
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                className="mt-1 w-full bg-[#1e1f22] text-gray-100 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] placeholder:text-gray-600"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-60 text-white font-medium py-2.5 rounded-md transition"
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>

                    {error && (
                        <p className="text-red-400 text-sm mt-4 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    <p className="text-sm text-gray-400 mt-6 text-center">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-[#5865f2] font-medium hover:underline">
                            Register
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;