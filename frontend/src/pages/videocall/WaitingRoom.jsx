import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../API/socket";

const WaitingRoom = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const handleJoinCall = () => {
    if (!username.trim() || !roomId.trim()) return alert("Fill all fields");
    const finalRoomId = roomId || Math.random().toString(36).substring(2, 10);
    socket.emit("join-call", finalRoomId);
    navigate(`/video-call/${finalRoomId}`, { state: { username } });
  };

  const handleRoomKey = () => {
    setRoomId(Math.random().toString(36).substring(2, 10));
  };

  useEffect(() => {
    const getUserConsentAndStream = async () => {
      const consent = window.confirm(
        "Do you allow access to your camera and microphone for video calling?"
      );
      if (!consent) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.log("failed to get Media in waitingRoom : ", err);
      }
    };

    console.log(roomId);
    getUserConsentAndStream();
  }, []);

  return (
    <div>
      <h1 className="text-7xl">Welcome!!! Enter a Username</h1>
      <label htmlFor="roomId" className="text-4xl block mt-8">
        Room ID:
      </label>
      <input
        type="text"
        id="roomId"
        name="roomId"
        value={roomId}
        placeholder="Enter RoomId"
        className="border rounded-2xl text-4xl ml-3 border-gray-50 pl-5 mt-8"
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button
        onClick={handleRoomKey}
        className="bg-bgS text-3xl text-EPin px-4 py-3 rounded-2xl ml-3"
      >
        Generate Room-key
      </button>
      <label htmlFor="username" className="text-4xl block mt-6">
        Username:
      </label>
      <input
        type="text"
        id="username"
        name="username"
        value={username}
        placeholder="Enter your name"
        className="border rounded-2xl text-4xl ml-3 border-gray-50 pl-5"
        onChange={(e) => setUsername(e.target.value)}
      />
      <button
        onClick={handleJoinCall}
        className="bg-bgS text-3xl text-EPin px-4 py-3 rounded-2xl ml-3"
      >
        Join Call
      </button>
      <div>
        <video
          ref={videoRef}
          autoPlay
          muted
          className="w-80 h-60 border rounded-2xl"
        ></video>
      </div>
    </div>
  );
};

export default WaitingRoom;
