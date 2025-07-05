import React, { useEffect, useRef, useState } from "react";
import socketApi from "../../API/socket";
import { useLocation, useParams } from "react-router-dom";
import MessageIcon from "@mui/icons-material/Message";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import RemoteVideo from "./components/RemoteVideo";

const VideoCallPage = () => {
  const location = useLocation();
  const { roomId } = useParams();
  const [username, setUsername] = useState(location.state?.username || "");
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chat, setChat] = useState(false);
  const bottomRef = useRef(null);

  // Video calling state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [peerConnections, setPeerConnections] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState([]);

  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (e) {
      console.error(`error accessing media devices ${e}`);
    }
  };

  const createPeerConnection = (socketId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      const [remoteStreams] = event.streams;
      setRemoteStreams((prev) => new Map(prev.set(socketId, remoteStreams)));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketApi.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
          to: socketId,
        });
      }
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
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    peerConnections.forEach((pc) => pc.close());

    socketApi.emit("leave-call", { roomId });
  };

  useEffect(() => {
    if (!username) {
      const enteredUsername = prompt("Enter a username");
      if (enteredUsername) {
        setUsername(enteredUsername);
      }
    }
  }, [username]);

  useEffect(() => {
    if (roomId && username) {
      socketApi.off("user-joined");
      socketApi.off("receive-message-event");
      socketApi.off("connect");

      const handleUserJoined = async ({ username, socketId }) => {
        console.log(`${username} joined the room with ${socketId}`);

        const peerConnection = createPeerConnection(socketId);
        setPeerConnections(
          (prev) => new Map(prev.set(socketId, peerConnection))
        );

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socketApi.emit("offer", {
          roomId,
          offer,
          to: socketId,
        });
      };

      const handleMessageReceived = (messageData) => {
        setMessages((prevMessage) => {
          const exists = prevMessage.some((msg) => {
            console.log(msg, msg.id, messageData, messageData.id);
            msg.id === messageData.id;
          });
          if (!exists) {
            return [...prevMessage, messageData];
          }
          return prevMessage;
        });
      };

      const handleConnect = () => {
        console.log("Socket connected:", socketApi.id);
        socketApi.emit("join-call", { roomId, username });
      };

      // Add listeners
      socketApi.on("user-joined", handleUserJoined);
      socketApi.on("receive-message-event", handleMessageReceived);
      socketApi.on("connect", handleConnect);

      // Connect if not connected
      if (!socketApi.connected) {
        socketApi.connect();
      } else {
        // If already connected, join the room immediately
        socketApi.emit("join-call", { roomId, username });
      }

      return () => {
        socketApi.off("user-joined", handleUserJoined);
        socketApi.off("receive-message-event", handleMessageReceived);
        socketApi.off("connect", handleConnect);
        socketApi.disconnect();
      };
    }
  }, [roomId, username]);

  useEffect(() => {
    const handleOffer = async ({ offer, from }) => {
      console.log(`received Offer from: ${from}`);

      const peerConnection = createPeerConnection(from);
      setPeerConnections((prev) => new Map(prev.set(from, peerConnection)));

      await peerConnection.setRemoteDescription(offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketApi.emit("answer", {
        roomId,
        answer,
        to: from,
      });
    };

    const handleAnswer = async ({ answer, from }) => {
      console.log(`received answer from: ${from}`);

      const peerConnection = peerConnections.get(from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    };

    const handleIceCandidate = async ({ candidate, from }) => {
      console.log(`received ICE candidate from: ${from}: ${candidate}`);

      const peerConnection = peerConnections.get(from);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      console.log(`User Left: ${socketId}`);

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

    initializeMedia();

    return () => {
      socketApi.off("offer", handleOffer);
      socketApi.off("answer", handleAnswer);
      socketApi.off("ice-candidate", handleIceCandidate);
      socketApi.off("user-left", handleUserLeft);

      peerConnections.forEach((pc) => pc.close());

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream, peerConnections]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      {/* Video Call UI */}
      <div className="main flex">
        <div className={`playerGround relative`}>
          <div>
            {/* Local Video */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="local-video absolute top-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-lg"
              style={{
                width: "192px",
                height: "144px",
                backgroundColor: "pink", // Add background to see if element is present
              }}
            />

            {/* Remote Videos */}
            <div className="remote-videos-container grid grid-cols-2 gap-4 h-full">
              {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                <RemoteVideo
                  key={socketId}
                  stream={stream}
                  socketId={socketId}
                />
              ))}
            </div>
          </div>
          <div className={`controls fixed bottom-0 w-full py-7 z-50`}>
            <div className="flex justify-center gap-6">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${
                  isVideoEnabled ? "bg-gray-700" : "bg-red-600"
                }`}
              >
                {isVideoEnabled ? (
                  <VideocamIcon fontSize="large" />
                ) : (
                  <VideocamOffIcon fontSize="large" />
                )}
              </button>

              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${
                  isAudioEnabled ? "bg-gray-700" : "bg-red-600"
                }`}
              >
                {isAudioEnabled ? (
                  <MicIcon fontSize="large" />
                ) : (
                  <MicOffIcon fontSize="large" />
                )}
              </button>

              <button
                onClick={leaveCall}
                className="p-3 rounded-full bg-red-600"
              >
                <CallEndIcon fontSize="large" />
              </button>
              <button
                onClick={() => setChat(!chat)}
                className={`p-3 rounded-full ${
                  isVideoEnabled ? "bg-gray-700" : "bg-red-600"
                }`}
              >
                <MessageIcon fontSize="large" />
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

              <div className="typing-indicator">
                {typingUsers.length > 0 && (
                  <div className="px-4 pb-2 text-sm text-gray-500">
                    {typingUsers.join(", ")} is typing...
                  </div>
                )}
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

export default VideoCallPage;
