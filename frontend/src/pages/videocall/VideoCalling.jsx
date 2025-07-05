import React, { useEffect, useRef, useState } from "react";
import socketApi from "../../API/socket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import MessageIcon from "@mui/icons-material/Message";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import RemoteVideo from "./components/RemoteVideo";

const VideoCalling = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  
  const [username, setUsername] = useState(location.state?.username || "");
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [chat, setChat] = useState(false);
  const bottomRef = useRef(null);

  // Video calling state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [peerConnections, setPeerConnections] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);

  // Refs for video elements
  const localVideoRef = useRef(null);

  const initializeMedia = async () => {
    try {
      console.log("🎥 Requesting media access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("✅ Media stream obtained:", stream);
      console.log("📹 Video tracks:", stream.getVideoTracks());
      console.log("🎤 Audio tracks:", stream.getAudioTracks());

      setLocalStream(stream);
      setMediaReady(true);

      // Ensure video element is ready before assigning stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("📺 Local video ref assigned");

        // Add event listeners for debugging
        localVideoRef.current.onloadedmetadata = () => {
          console.log("🎬 Local video metadata loaded");
          localVideoRef.current
            .play()
            .catch((e) => console.error("Play failed:", e));
        };

        localVideoRef.current.oncanplay = () => {
          console.log("▶️ Local video can play");
        };

        localVideoRef.current.onerror = (e) => {
          console.error("❌ Local video error:", e);
        };
      } else {
        console.error("❌ Local video ref not found");
      }

      return stream;
    } catch (e) {
      console.error(`❌ Error accessing media devices:`, e);
      alert(`Could not access camera/microphone: ${e.message}`);
      return null;
    }
  };

  const createPeerConnection = (socketId) => {
    console.log(`🔗 Creating peer connection for ${socketId}`);

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    if (localStream) {
      console.log(`📤 Adding local tracks to peer connection for ${socketId}`);
      localStream.getTracks().forEach((track) => {
        console.log(`📡 Adding track:`, track.kind, track.enabled);
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log(`📥 Received remote track from ${socketId}:`, event);
      const [remoteStream] = event.streams;
      console.log("🎥 Remote stream:", remoteStream);
      console.log("📹 Remote video tracks:", remoteStream.getVideoTracks());

      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(socketId, remoteStream);
        console.log("🗺️ Updated remote streams map:", newMap);
        return newMap;
      });
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 Sending ICE candidate to ${socketId}`);
        socketApi.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
          to: socketId,
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(
        `🔄 Connection state changed for ${socketId}:`,
        peerConnection.connectionState
      );
    };

    return peerConnection;
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
  };

  const sendMessage = () => {
    if (currentMessage.trim()) {
      const messageData = {
        roomId,
        message: currentMessage,
        username,
        timestamp: new Date().toISOString(),
      };

      socketApi.emit("send-message-event", messageData);
      setMessages((prev) => [...prev, messageData]);
      setCurrentMessage("");
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`📹 Video ${videoTrack.enabled ? "enabled" : "disabled"}`);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎤 Audio ${audioTrack.enabled ? "enabled" : "disabled"}`);
      }
    }
  };

  const cleanupCall = () => {
    console.log("🧹 Cleaning up call resources...");

    peerConnections.forEach((pc, socketId) => {
      console.log(`🔌 Closing peer connection for ${socketId}`);
      pc.close();
    });

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log(`🛑 Stopping ${track.kind} track`);
        track.stop();
      });
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setLocalStream(null);
    setRemoteStreams(new Map());
    setPeerConnections(new Map());
    setMediaReady(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);

    socketApi.emit("leave-call", { roomId });
    socketApi.disconnect();
  };

  const leaveCall = async () => {
    console.log("📞 Leaving call...");

    await cleanupCall();
    navigate("/");
  };

  // Initialize media when component mounts
  useEffect(() => {
    console.log("🚀 Component mounted, initializing media...");
    initializeMedia();

    return () => {
      console.log("🧹 Component unmounting, cleaning up...");
      cleanupCall();
    };
  }, []);

  // Handle username prompt
  useEffect(() => {
    if (!username) {
      const enteredUsername = prompt("Enter a username");
      if (enteredUsername) {
        setUsername(enteredUsername);
      }
    }
  }, [username]);

  // Socket event handlers
  useEffect(() => {
    if (roomId && username && mediaReady) {
      console.log(`🏠 Joining room ${roomId} as ${username}`);

      socketApi.off("user-joined");
      socketApi.off("receive-message-event");
      socketApi.off("connect");

      const handleUserJoined = async ({
        username: joinedUsername,
        socketId,
      }) => {
        console.log(`👋 ${joinedUsername} joined the room with ${socketId}`);

        const peerConnection = createPeerConnection(socketId);
        setPeerConnections(
          (prev) => new Map(prev.set(socketId, peerConnection))
        );

        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log(`📤 Sending offer to ${socketId}`);

          socketApi.emit("offer", {
            roomId,
            offer,
            to: socketId,
          });
        } catch (error) {
          console.error("❌ Error creating offer:", error);
        }
      };

      const handleMessageReceived = (messageData) => {
        setMessages((prevMessage) => {
          const exists = prevMessage.some((msg) => msg.id === messageData.id);
          if (!exists) {
            return [...prevMessage, messageData];
          }
          return prevMessage;
        });
      };

      const handleConnect = () => {
        console.log("🔌 Socket connected:", socketApi.id);
        socketApi.emit("join-call", { roomId, username });
      };

      socketApi.on("user-joined", handleUserJoined);
      socketApi.on("receive-message-event", handleMessageReceived);
      socketApi.on("connect", handleConnect);

      if (!socketApi.connected) {
        socketApi.connect();
      } else {
        socketApi.emit("join-call", { roomId, username });
      }

      return () => {
        socketApi.off("user-joined", handleUserJoined);
        socketApi.off("receive-message-event", handleMessageReceived);
        socketApi.off("connect", handleConnect);
      };
    }
  }, [roomId, username, mediaReady, localStream]);

  // WebRTC signaling handlers
  useEffect(() => {
    const handleOffer = async ({ offer, from }) => {
      console.log(`📥 Received offer from ${from}`);
      console.log("📋 Offer details:", offer);

      const peerConnection = createPeerConnection(from);
      setPeerConnections((prev) => new Map(prev.set(from, peerConnection)));

      try {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log(`📤 Sending answer to ${from}`);

        socketApi.emit("answer", {
          roomId,
          answer,
          to: from,
        });
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    };

    const handleAnswer = async ({ answer, from }) => {
      console.log(`📥 Received answer from ${from}`);
      console.log("📋 Answer details:", answer);

      const peerConnection = peerConnections.get(from);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(answer);
          console.log(`✅ Set remote description for ${from}`);
        } catch (error) {
          console.error("❌ Error setting remote description:", error);
        }
      }
    };

    const handleIceCandidate = async ({ candidate, from }) => {
      console.log(`🧊 Received ICE candidate from ${from}`);

      const peerConnection = peerConnections.get(from);
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(candidate);
          console.log(`✅ Added ICE candidate for ${from}`);
        } catch (error) {
          console.error("❌ Error adding ICE candidate:", error);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      console.log(`👋 User left: ${socketId}`);

      const peerConnection = peerConnections.get(socketId);
      if (peerConnection) {
        peerConnection.close();
        setPeerConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      }

      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    };

    socketApi.on("offer", handleOffer);
    socketApi.on("answer", handleAnswer);
    socketApi.on("ice-candidate", handleIceCandidate);
    socketApi.on("user-left", handleUserLeft);

    return () => {
      socketApi.off("offer", handleOffer);
      socketApi.off("answer", handleAnswer);
      socketApi.off("ice-candidate", handleIceCandidate);
      socketApi.off("user-left", handleUserLeft);
    };
  }, [localStream, peerConnections, roomId]);

  // Auto-scroll messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      <div className="main flex  text-white min-h-screen">
        <div className="playerGround relative flex-1">
          {/* Debug Info */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded text-xs z-10">
            <div>Media Ready: {mediaReady ? "✅" : "❌"}</div>
            <div>Local Stream: {localStream ? "✅" : "❌"}</div>
            <div>Remote Streams: {remoteStreams.size}</div>
            <div>Peer Connections: {peerConnections.size}</div>
          </div>

          {/* Local Video */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`local-video absolute top-4 ${chat ? "right-105" : "right-4"} w-48 h-36 rounded-lg border-2 border-white shadow-lg bg-gray-800`}
            style={{
              transform: "scaleX(-1)", // Mirror effect
              objectFit: "cover",
            }}
          />

          {/* Remote Videos Container */}
          <div className="remote-videos-container w-full h-full px-30 flex flex-wrap justify-center items-center p-4">
            {remoteStreams.size === 0 ? (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">📹</div>
                <div>Waiting for other participants...</div>
              </div>
            ) : (
              Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                <div key={socketId} className="relative m-2">
                  <RemoteVideo stream={stream} socketId={socketId} />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {socketId.slice(0, 8)}...
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Controls */}
          <div className="controls fixed bottom-0 left-0 right-0 py-4 bg-bgS bg-opacity-75 backdrop-blur-sm">
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full text-white transition-colors ${
                  isVideoEnabled
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-red-600 hover:bg-red-500"
                }`}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              </button>

              <button
                onClick={toggleAudio}
                className={`p-4 rounded-full text-white transition-colors ${
                  isAudioEnabled
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-red-600 hover:bg-red-500"
                }`}
                title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
              </button>

              <button
                onClick={leaveCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                title="Leave call"
              >
                <CallEndIcon />
              </button>

              <button
                onClick={() => setChat(!chat)}
                className="p-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                title="Toggle chat"
              >
                <MessageIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        {!!chat && (
          <div
            className={`transition-all duration-2000 ease-in-out z-50 backdrop-blur-sm shadow-xl border-l border-gray-200 w-full sm:w-[400px] h-full fixed top-0 ${
              chat ? "right-0 opacity-100" : "-right-full opacity-0"
            }`}
          >
            <div className={`flex flex-col h-full`}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className="bg-bgS p-3 rounded-lg flex justify-between text-sm"
                  >
                    <span className="text-EPin">
                      {msg.username}:
                      <span className="text-white"> {msg.message}</span>
                    </span>

                    <span className="text-gray-500 text-xs">
                      {new Date(msg.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t flex items-center gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-EPin"
                />
                <button
                  onClick={sendMessage}
                  className="bg-EPin text-white px-4 py-2 rounded-full hover:bg-EPin transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoCalling;
