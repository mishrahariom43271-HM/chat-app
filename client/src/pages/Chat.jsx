import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import api from "../api";

const nameColors = ["#f47b67", "#5865f2", "#57f287", "#eb459e", "#fee75c", "#00c2ff", "#a78bfa"];
function colorFor(name) {
    if (!name) return "#949ba4";
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return nameColors[Math.abs(hash) % nameColors.length];
}

function Avatar({ name, size }) {
    const letter = name?.[0]?.toUpperCase() || "?";
    const dim = size || 40;
    return (
        <div
            style={{ width: dim, height: dim, backgroundColor: colorFor(name) }}
            className="rounded-full text-white flex items-center justify-center font-semibold shrink-0"
        >
            {letter}
        </div>
    );
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupReactions(reactions, myId) {
    const map = {};
    (reactions || []).forEach((r) => {
        if (!map[r.emoji]) map[r.emoji] = { count: 0, mine: false };
        map[r.emoji].count += 1;
        if (r.user === myId) map[r.emoji].mine = true;
    });
    return map;
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) { }
}

const quickEmojis = ["👍", "❤️", "😂", "🔥", "😮"];

function Chat() {
    const navigate = useNavigate();
    const [myRooms, setMyRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomPrivate, setNewRoomPrivate] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState("");
    const [myId, setMyId] = useState(null);
    const [myUsername, setMyUsername] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [roomMembers, setRoomMembers] = useState([]);
    const [roomCreator, setRoomCreator] = useState(null);
    const [showRequests, setShowRequests] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const typingTimeout = useRef(null);
    const fileInputRef = useRef(null);
    const bottomRef = useRef(null);
    const myIdRef = useRef(null);
    const searchTimeout = useRef(null);

    useEffect(() => {
        myIdRef.current = myId;
    }, [myId]);

    const loadRooms = () => {
        api.get("/rooms").then((res) => setMyRooms(res.data));
        api.get("/rooms/all").then((res) => setAllRooms(res.data));
    };

    useEffect(() => {
        api.get("/auth/me").then((res) => {
            setMyId(res.data._id);
            setMyUsername(res.data.username);
        });
        loadRooms();
        socket.connect();

        socket.on("receive_message", (data) => {
            setMessages((prev) => [...prev, data]);
            if (data.sender?._id !== myIdRef.current) {
                playNotificationSound();
            }
        });

        socket.on("online_users", (list) => setOnlineUsers(list));
        socket.on("user_typing", (payload) => setTypingUser(payload.username));
        socket.on("user_stop_typing", () => setTypingUser(""));

        socket.on("messages_read", (payload) => {
            const messageIds = payload.messageIds;
            const readerId = payload.readerId;
            setMessages((prev) =>
                prev.map((m) =>
                    messageIds.includes(m._id) ? { ...m, readBy: [...(m.readBy || []), readerId] } : m
                )
            );
        });

        socket.on("reaction_updated", (payload) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === payload.messageId ? { ...m, reactions: payload.reactions } : m
                )
            );
        });

        const pollInterval = setInterval(loadRooms, 8000);

        return () => {
            socket.off("receive_message");
            socket.off("online_users");
            socket.off("user_typing");
            socket.off("user_stop_typing");
            socket.off("messages_read");
            socket.off("reaction_updated");
            socket.disconnect();
            clearInterval(pollInterval);
        };
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        if (!activeRoom || messages.length === 0 || !myId) return;
        const unread = messages
            .filter((m) => m.sender?._id !== myId && !(m.readBy || []).includes(myId))
            .map((m) => m._id);
        if (unread.length > 0) {
            socket.emit("mark_read", { roomId: activeRoom._id, messageIds: unread });
        }
    }, [messages, activeRoom, myId]);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchQuery.trim() === "") {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }
        searchTimeout.current = setTimeout(() => {
            api.get("/rooms/search?q=" + encodeURIComponent(searchQuery)).then((res) => {
                setSearchResults(res.data);
                setShowSearchDropdown(true);
            });
        }, 300);
    }, [searchQuery]);

    const openRoom = async (room) => {
        setActiveRoom(room);
        setTypingUser("");
        setHasMore(true);
        setShowRequests(false);
        setShowSearchDropdown(false);
        setSearchQuery("");
        socket.emit("join_room", room._id);
        const res = await api.get("/messages/" + room._id);
        setMessages(res.data);
        if (res.data.length < 20) setHasMore(false);
        const mres = await api.get("/rooms/" + room._id + "/members");
        setRoomMembers(mres.data.members);
        setRoomCreator(mres.data.createdBy);
    };

    const loadOlderMessages = async () => {
        if (!activeRoom || messages.length === 0) return;
        setLoadingMore(true);
        const oldest = messages[0].createdAt;
        const res = await api.get("/messages/" + activeRoom._id + "?before=" + oldest);
        setMessages((prev) => [...res.data, ...prev]);
        if (res.data.length < 20) setHasMore(false);
        setLoadingMore(false);
    };

    const createRoom = async () => {
        if (newRoomName.trim() === "") return;
        await api.post("/rooms", { name: newRoomName, isPrivate: newRoomPrivate });
        setNewRoomName("");
        setNewRoomPrivate(false);
        loadRooms();
    };

    const joinRoom = async (room) => {
        await api.post("/rooms/" + room._id + "/join");
        loadRooms();
        openRoom(room);
    };

    const requestJoinRoom = async (room) => {
        try {
            await api.post("/rooms/" + room._id + "/request-join");
            loadRooms();
            const res = await api.get("/rooms/search?q=" + encodeURIComponent(searchQuery));
            setSearchResults(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Could not send request");
        }
    };

    const openRequestsPanel = async () => {
        if (!activeRoom) return;
        const res = await api.get("/rooms/" + activeRoom._id + "/requests");
        setJoinRequests(res.data);
        setShowRequests(true);
    };

    const respondRequest = async (userId, action) => {
        await api.post("/rooms/" + activeRoom._id + "/requests/" + userId, { action: action });
        const res = await api.get("/rooms/" + activeRoom._id + "/requests");
        setJoinRequests(res.data);
        const mres = await api.get("/rooms/" + activeRoom._id + "/members");
        setRoomMembers(mres.data.members);
        loadRooms();
    };

    const sendMessage = () => {
        if (text.trim() === "" || !activeRoom) return;
        socket.emit("send_message", { text: text, roomId: activeRoom._id });
        socket.emit("stop_typing", activeRoom._id);
        setText("");
    };

    const handleTyping = (e) => {
        setText(e.target.value);
        if (!activeRoom) return;
        socket.emit("typing", activeRoom._id);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit("stop_typing", activeRoom._id);
        }, 1500);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeRoom) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            socket.emit("send_message", {
                text: "",
                roomId: activeRoom._id,
                fileUrl: res.data.url,
                fileType: res.data.type,
            });
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleLogout = async () => {
        await api.post("/auth/logout");
        socket.disconnect();
        navigate("/login");
    };

    const handleDeleteRoom = async () => {
        if (!activeRoom) return;
        const confirmed = window.confirm('Delete room "' + activeRoom.name + '"? This cannot be undone.');
        if (!confirmed) return;
        try {
            await api.delete("/rooms/" + activeRoom._id);
            setActiveRoom(null);
            setMessages([]);
            loadRooms();
        } catch (err) {
            alert(err.response?.data?.message || "Could not delete room");
        }
    };

    const handleLeaveRoom = async () => {
        if (!activeRoom) return;
        const confirmed = window.confirm('Leave "' + activeRoom.name + '"? You will need to join again to come back.');
        if (!confirmed) return;
        try {
            await api.post("/rooms/" + activeRoom._id + "/leave");
            setActiveRoom(null);
            setMessages([]);
            loadRooms();
        } catch (err) {
            alert(err.response?.data?.message || "Could not leave room");
        }
    };

    const addReaction = (messageId, emoji) => {
        if (!activeRoom) return;
        socket.emit("add_reaction", { messageId: messageId, roomId: activeRoom._id, emoji: emoji });
    };

    const myRoomIds = myRooms.map((r) => r._id);
    const joinableRooms = allRooms.filter((r) => !myRoomIds.includes(r._id));
    const onlineSet = new Set(onlineUsers);
    const isRoomAdmin = activeRoom && activeRoom.createdBy === myId;

    return (
        <div className="flex h-screen bg-[#313338] text-gray-100 font-sans">
            <div className="w-60 bg-[#2b2d31] flex flex-col">
                <div className="h-12 flex items-center justify-between px-4 border-b border-black/30 shadow-sm">
                    <h1 className="font-semibold text-white text-sm truncate">Chat App</h1>
                    <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-400 transition">
                        Logout
                    </button>
                </div>

                <div className="p-3 border-b border-black/20 relative">
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                        placeholder="Search rooms..."
                        className="w-full bg-[#1e1f22] text-sm rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-500 transition-shadow"
                    />
                    {showSearchDropdown && (
                        <div className="absolute left-3 right-3 top-full mt-1 bg-[#1e1f22] border border-black/40 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto animate-fadein">
                            {searchResults.length === 0 ? (
                                <p className="text-xs text-gray-500 px-3 py-2">No rooms found</p>
                            ) : (
                                searchResults.map((room) => {
                                    const isMember = myRoomIds.includes(room._id);
                                    const isPending = (room.pendingRequests || []).includes(myId);
                                    return (
                                        <div
                                            key={room._id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-[#2b2d31] transition"
                                        >
                                            <span className="flex items-center gap-1.5 text-sm text-gray-200 truncate">
                                                {room.isPrivate ? "🔒" : "#"} {room.name}
                                            </span>
                                            {isMember ? (
                                                <button
                                                    onClick={() => openRoom(room)}
                                                    className="text-[11px] bg-[#5865f2] hover:bg-[#4752c4] active:scale-95 text-white px-2 py-0.5 rounded transition"
                                                >
                                                    Open
                                                </button>
                                            ) : room.isPrivate ? (
                                                <button
                                                    onClick={() => requestJoinRoom(room)}
                                                    disabled={isPending}
                                                    className="text-[11px] bg-[#4e5058] hover:bg-[#5c5e66] active:scale-95 disabled:opacity-50 text-gray-200 px-2 py-0.5 rounded transition"
                                                >
                                                    {isPending ? "Requested" : "Request"}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => joinRoom(room)}
                                                    className="text-[11px] bg-[#4e5058] hover:bg-[#5c5e66] active:scale-95 text-gray-200 px-2 py-0.5 rounded transition"
                                                >
                                                    Join
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3">
                    <div className="flex gap-1.5 mb-1.5">
                        <input
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="New room"
                            className="flex-1 bg-[#1e1f22] text-sm rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-500"
                        />
                        <button
                            onClick={createRoom}
                            className="bg-[#5865f2] hover:bg-[#4752c4] active:scale-95 text-white text-sm px-3 rounded transition"
                        >
                            +
                        </button>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 px-0.5">
                        <input
                            type="checkbox"
                            checked={newRoomPrivate}
                            onChange={(e) => setNewRoomPrivate(e.target.checked)}
                        />
                        Private room (join by request)
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto px-2">
                    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        My Rooms
                    </p>
                    {myRooms.map((room) => {
                        const isActive = activeRoom && activeRoom._id === room._id;
                        const pendingCount = (room.pendingRequests || []).length;
                        const showBadge = room.createdBy === myId && room.isPrivate && pendingCount > 0;
                        return (
                            <button
                                key={room._id}
                                onClick={() => openRoom(room)}
                                className={
                                    "w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 mb-0.5 transition-all duration-150 " +
                                    (isActive
                                        ? "bg-[#404249] text-white translate-x-0.5"
                                        : "text-gray-400 hover:bg-[#35373c] hover:text-gray-200 hover:translate-x-0.5")
                                }
                            >
                                <span className="text-gray-500 text-lg leading-none">{room.isPrivate ? "🔒" : "#"}</span>
                                <span className="text-sm truncate flex-1">{room.name}</span>
                                {showBadge && (
                                    <span className="text-[9px] bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                                        {pendingCount}
                                    </span>
                                )}
                                {room.createdBy === myId && (
                                    <span className="text-[9px] bg-[#5865f2]/30 text-[#b3b9ff] px-1.5 py-0.5 rounded">
                                        ADMIN
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {joinableRooms.length > 0 && (
                        <>
                            <p className="px-2 pt-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                Browse Rooms
                            </p>
                            {joinableRooms.map((room) => {
                                const isPending = (room.pendingRequests || []).includes(myId);
                                return (
                                    <div
                                        key={room._id}
                                        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#35373c] mb-0.5 transition"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-gray-400 truncate">
                                            <span className="text-gray-600 text-lg leading-none">{room.isPrivate ? "🔒" : "#"}</span>
                                            {room.name}
                                        </span>
                                        {room.isPrivate ? (
                                            <button
                                                onClick={() => requestJoinRoom(room)}
                                                disabled={isPending}
                                                className="text-[11px] bg-[#4e5058] hover:bg-[#5c5e66] active:scale-95 disabled:opacity-50 text-gray-200 px-2 py-0.5 rounded transition"
                                            >
                                                {isPending ? "Requested" : "Request"}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => joinRoom(room)}
                                                className="text-[11px] bg-[#4e5058] hover:bg-[#5c5e66] active:scale-95 text-gray-200 px-2 py-0.5 rounded transition"
                                            >
                                                Join
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                <div className="h-14 bg-[#232428] flex items-center gap-2 px-3">
                    <Avatar name={myUsername} size={32} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{myUsername}</p>
                        <p className="text-[11px] text-emerald-400">Online</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 relative">
                {activeRoom ? (
                    <>
                        <div className="h-12 flex items-center justify-between px-4 border-b border-black/30 shadow-sm">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-400 text-xl">{activeRoom.isPrivate ? "🔒" : "#"}</span>
                                <h2 className="font-semibold text-white truncate">{activeRoom.name}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {isRoomAdmin && activeRoom.isPrivate && (
                                    <button
                                        onClick={openRequestsPanel}
                                        className="text-xs text-gray-300 hover:text-white border border-gray-500/40 hover:border-gray-400 px-3 py-1 rounded transition"
                                    >
                                        Requests
                                    </button>
                                )}
                                {isRoomAdmin ? (
                                    <button
                                        onClick={handleDeleteRoom}
                                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400 px-3 py-1 rounded transition"
                                    >
                                        Delete Room
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleLeaveRoom}
                                        className="text-xs text-gray-300 hover:text-red-300 border border-gray-500/40 hover:border-red-400 px-3 py-1 rounded transition"
                                    >
                                        Leave Room
                                    </button>
                                )}
                            </div>
                        </div>

                        {showRequests && (
                            <div className="absolute right-4 top-16 bg-[#1e1f22] border border-black/40 rounded-xl shadow-lg w-72 p-4 z-20 animate-fadein">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-200 text-sm">Join Requests</h3>
                                    <button
                                        onClick={() => setShowRequests(false)}
                                        className="text-gray-500 hover:text-gray-300 text-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                                {joinRequests.length === 0 ? (
                                    <p className="text-xs text-gray-500">No pending requests</p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {joinRequests.map((u) => (
                                            <div key={u._id} className="flex items-center gap-2">
                                                <Avatar name={u.username} size={28} />
                                                <span className="text-sm text-gray-200 flex-1 truncate">{u.username}</span>
                                                <button
                                                    onClick={() => respondRequest(u._id, "accept")}
                                                    className="text-[11px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-2 py-0.5 rounded transition"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => respondRequest(u._id, "reject")}
                                                    className="text-[11px] bg-red-600 hover:bg-red-500 active:scale-95 text-white px-2 py-0.5 rounded transition"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {hasMore && (
                                <div className="text-center mb-3">
                                    <button
                                        onClick={loadOlderMessages}
                                        disabled={loadingMore}
                                        className="text-xs text-indigo-400 hover:underline disabled:text-gray-500"
                                    >
                                        {loadingMore ? "Loading..." : "Load older messages"}
                                    </button>
                                </div>
                            )}

                            {messages.length === 0 && !hasMore && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <p className="text-3xl mb-2">👋</p>
                                    <p className="text-sm">No messages yet. Say hi!</p>
                                </div>
                            )}

                            {messages.map((msg, index) => {
                                const isMine = msg.sender?._id === myId;
                                const readCount = (msg.readBy || []).filter((id) => id !== myId).length;
                                const isImage = msg.fileType && msg.fileType.indexOf("image/") === 0;
                                const uname = msg.sender?.username || "Unknown";
                                const grouped = groupReactions(msg.reactions, myId);
                                const fileLink = msg.fileUrl;

                                return (
                                    <div key={index} className="flex gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-black/10 group animate-fadein">
                                        <Avatar name={uname} size={38} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-semibold" style={{ color: colorFor(uname) }}>
                                                    {uname}
                                                </span>
                                                <span className="text-[11px] text-gray-500">{formatTime(msg.createdAt)}</span>
                                                {isMine && (
                                                    <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition">
                                                        {readCount > 0 ? "Read" : "Sent"}
                                                    </span>
                                                )}
                                                <div className="hidden group-hover:flex gap-1 ml-2">
                                                    {quickEmojis.map((emoji) => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => addReaction(msg._id, emoji)}
                                                            className="text-xs hover:scale-125 transition-transform"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {msg.fileUrl ? (
                                                isImage ? (
                                                    <img src={fileLink} alt="shared" className="rounded-lg max-w-xs mt-1 border border-black/20" />
                                                ) : (
                                                    <a href={fileLink} target="_blank" rel="noreferrer" className="text-indigo-400 underline text-sm">
                                                        View file
                                                    </a>
                                                )
                                            ) : (
                                                <p className="text-sm text-gray-100 break-words">{msg.text}</p>
                                            )}

                                            {Object.keys(grouped).length > 0 && (
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {Object.entries(grouped).map(([emoji, info]) => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => addReaction(msg._id, emoji)}
                                                            className={
                                                                "text-xs px-1.5 py-0.5 rounded-full border transition " +
                                                                (info.mine
                                                                    ? "bg-indigo-500/30 border-indigo-400 text-indigo-100"
                                                                    : "bg-[#404249] border-transparent text-gray-300 hover:border-gray-500")
                                                            }
                                                        >
                                                            {emoji} {info.count}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef}></div>
                        </div>

                        <div className="px-4 pb-4">
                            <p className="text-xs text-gray-500 h-4 px-1">
                                {typingUser ? typingUser + " is typing..." : ""}
                            </p>
                            <div className="bg-[#383a40] rounded-lg flex items-center gap-2 px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-500 transition-shadow">
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="text-gray-400 hover:text-gray-200 hover:scale-110 text-xl leading-none transition-transform"
                                    title="Attach file"
                                >
                                    +
                                </button>
                                <input
                                    value={text}
                                    onChange={handleTyping}
                                    onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                                    placeholder={uploading ? "Uploading file..." : "Message #" + activeRoom.name}
                                    disabled={uploading}
                                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="text-[#5865f2] hover:text-[#4752c4] active:scale-90 font-semibold text-sm transition-transform"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <p className="text-4xl mb-3">💬</p>
                        <p>Select or create a room to start chatting</p>
                    </div>
                )}
            </div>

            {activeRoom && (
                <div className="w-60 bg-[#2b2d31] px-3 py-4 overflow-y-auto hidden md:block">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                        Members — {roomMembers.length}
                    </p>
                    {roomMembers.map((m) => (
                        <div key={m._id} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-[#35373c] transition">
                            <div className="relative">
                                <Avatar name={m.username} size={32} />
                                {onlineSet.has(m.username) && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#2b2d31]"></span>
                                )}
                            </div>
                            <span className="text-sm text-gray-300 truncate flex-1">{m.username}</span>
                            {m._id === roomCreator && (
                                <span className="text-[9px] bg-[#5865f2]/30 text-[#b3b9ff] px-1.5 py-0.5 rounded">
                                    ADMIN
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Chat;