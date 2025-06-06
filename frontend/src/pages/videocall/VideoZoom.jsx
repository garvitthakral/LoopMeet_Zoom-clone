import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../API/socket";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";

const VideoZoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const roomId = location.pathname.split("/")[2];
  const [username, setUsername] = useState(() => {
    return location.state?.username || localStorage.getItem("username") || null;
  });

  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  const cameraTrack = useRef(null);
  const screenTrack = useRef(null);
  const cameraStream = useRef(null);

  // Multi-peer connections and remote videos
  const connections = useRef({});
  const [videos, setVideos] = useState([]);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleScreenSharing = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        // Store the current camera track for restoration
        cameraTrack.current = localStream.current.getVideoTracks()[0];

        // Set the main video to the screen stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Store the screen track
        screenTrack.current = screenStream.getVideoTracks()[0];

        // Replace video track for all peer connections
        Object.values(connections.current).forEach(pc => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack.current);
          }
        });

        screenTrack.current.onended = () => {
          stopScreenSharing();
        };
        
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error starting screen share:", err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    const originalTrack = cameraTrack.current;
    
    // Replace screen track with camera track for all connections
    Object.values(connections.current).forEach(pc => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender && originalTrack) {
        sender.replaceTrack(originalTrack);
      }
    });

    // Stop screen track
    if (screenTrack.current) {
      screenTrack.current.stop();
      screenTrack.current = null;
    }

    // Restore main video to camera
    if (localVideoRef.current && cameraStream.current) {
      localVideoRef.current.srcObject = cameraStream.current;
    }
    
    setIsScreenSharing(false);
  };

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = isScreenSharing ? cameraTrack.current : localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const leaveCall = () => {
    // Stop all local tracks
    localStream.current?.getTracks().forEach((track) => track.stop());
    if (screenTrack.current) {
      screenTrack.current.stop();
    }
    
    // Close all peer connections
    Object.values(connections.current).forEach(pc => pc.close());
    connections.current = {};
    
    // Leave the room
    socket.emit("leave-call", roomId);
    
    // Navigate away
    navigate("/");
  };

  const createPeerConnection = (peerId) => {
    console.log("Creating peer connection for", peerId);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to", peerId);
        socket.emit("ice-candidate", { candidate: event.candidate, to: peerId });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote stream from", peerId, event.streams[0]);
      if (event.streams && event.streams[0]) {
        const newVideo = {
          socketId: peerId,
          stream: event.streams[0],
        };
        setVideos((prev) => {
          const filtered = prev.filter(v => v.socketId !== peerId);
          const updated = [...filtered, newVideo];
          console.log("Updated videos array:", updated);
          return updated;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state changed for", peerId, ":", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state changed for", peerId, ":", pc.iceConnectionState);
    };

    // Add local stream tracks to peer connection
    if (localStream.current) {
      console.log("Adding local tracks to peer connection for", peerId);
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }

    connections.current[peerId] = pc;
    return pc;
  };

  useEffect(() => {
    if (!username) {
      navigate("/waiting-room", { state: { roomId } });
      return;
    } else {
      localStorage.setItem("username", username);
    }

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Display local stream in video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Store stream in ref for controls
        localStream.current = stream;
        cameraStream.current = stream;

        // Join signaling room
        socket.emit("join-call", roomId);

        // Handle user joined event
        socket.on("user-joined", async (socketId, clients) => {
          console.log("User joined:", socketId, "All clients:", clients);
          
          // Create peer connections for all other users (if not already exists)
          clients.forEach((id) => {
            if (id === socket.id) return;
            if (connections.current[id]) {
              console.log("Peer connection already exists for", id);
              return;
            }
            
            console.log("Creating peer connection for", id);
            createPeerConnection(id);
          });

          // Only create offers if this is a NEW user joining (not the initial user list)
          if (socketId !== socket.id) {
            // Another user joined, create offer for them (only if we don't have a connection yet)
            console.log("Another user joined, creating offer for", socketId);
            const pc = connections.current[socketId];
            if (pc && pc.connectionState === 'new' && pc.signalingState === 'stable') {
              try {
                console.log("Creating offer for new user", socketId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("offer", { offer, to: socketId });
                console.log("Sent offer to new user", socketId);
              } catch (err) {
                console.error("Error creating offer for new user", socketId, err);
              }
            }
          }
        });

        socket.on("offer", async ({ offer, from }) => {
          console.log("Received offer from", from, "Signaling state:", connections.current[from]?.signalingState);
          let pc = connections.current[from];
          
          // Create connection if it doesn't exist
          if (!pc) {
            console.log("Creating new peer connection for incoming offer from", from);
            pc = createPeerConnection(from);
          }
          
          // Only process offer if we're in stable state
          if (pc.signalingState !== 'stable') {
            console.log("Peer connection not in stable state, ignoring offer from", from);
            return;
          }
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { answer, to: from });
            console.log("Sent answer to", from);
          } catch (err) {
            console.error("Error handling offer from", from, err);
          }
        });

        socket.on("answer", async ({ answer, from }) => {
          console.log("Received answer from", from, "Signaling state:", connections.current[from]?.signalingState);
          const pc = connections.current[from];
          if (!pc) {
            console.log("No peer connection found for", from);
            return;
          }
          
          // Only process answer if we're in have-local-offer state
          if (pc.signalingState !== 'have-local-offer') {
            console.log("Peer connection not in have-local-offer state, ignoring answer from", from);
            return;
          }
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("Set remote description for", from);
          } catch (err) {
            console.error("Error handling answer from", from, err);
          }
        });

        socket.on("ice-candidate", async ({ candidate, from }) => {
          console.log("Received ICE candidate from", from);
          const pc = connections.current[from];
          if (!pc) return;
          
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error handling ICE candidate:", err);
          }
        });

        // Handle user disconnect
        socket.on("user-left", (socketId) => {
          console.log("User left:", socketId);
          
          // Close and remove peer connection
          if (connections.current[socketId]) {
            connections.current[socketId].close();
            delete connections.current[socketId];
          }
          
          // Remove video
          setVideos((prev) => prev.filter(v => v.socketId !== socketId));
        });

      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
    };
  }, [username, roomId, navigate]);

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl mb-4">Welcome, {username}</h2>
      <div className="flex space-x-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-220 h-165 border rounded"
        ></video>
        <div className="flex flex-col gap-5">
          {isScreenSharing && cameraStream.current && (
            <div className="relative">
              <video
                autoPlay
                playsInline
                muted
                className="w-80 h-60 border rounded"
                ref={(ref) => {
                  if (ref) {
                    ref.srcObject = cameraStream.current;
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                Your Camera
              </div>
            </div>
          )}
          {/* Render all remote user videos */}
          {videos.map((videoObj, index) => (
            <div key={videoObj.socketId} className="relative">
              <video
                autoPlay
                playsInline
                className="w-80 h-60 border rounded bg-gray-200"
                ref={(ref) => {
                  if (ref && videoObj.stream) {
                    console.log("Setting video source for", videoObj.socketId, videoObj.stream);
                    ref.srcObject = videoObj.stream;
                  }
                }}
                onLoadedMetadata={() => {
                  console.log("Video metadata loaded for", videoObj.socketId);
                }}
                onError={(e) => {
                  console.error("Video error for", videoObj.socketId, e);
                }}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                User {videoObj.socketId.slice(0, 8)}
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="w-80 h-60 border rounded bg-gray-100 flex items-center justify-center text-gray-500">
              Waiting for other users...
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <button
          onClick={toggleMic}
          className="bg-EPin text-white px-4 py-2 rounded"
        >
          {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button
          onClick={toggleCamera}
          className="bg-EPin text-white px-4 py-2 rounded"
        >
          {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
        </button>
        <button
          onClick={toggleScreenSharing}
          className="bg-EPin text-white px-4 py-2 rounded"
        >
          {!isScreenSharing ? <ScreenShareIcon /> : <StopScreenShareIcon />}
        </button>
        <button
          onClick={leaveCall}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          <PhoneDisabledIcon />
        </button>
      </div>
    </div>
  );
};

export default VideoZoom;