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

const VideoMeet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const roomId = location.pathname.split("/")[2];
  const [username, setUsername] = useState(() => {
    return location.state?.username || localStorage.getItem("username") || null;
  });

  const localVideoRef = useRef(null);
  // const remoteVideoRef = useRef(null); // Remove in favor of videos array
  // const peerConnection = useRef(null); // Remove in favor of connections
  const localStream = useRef(null);
  const cameraTrack = useRef(null);
  const screenTrack = useRef(null);
  const cameraStream = useRef(null);

  // Multi-peer connections and remote videos
  const connections = useRef({});
  const [videos, setVideos] = useState([]);
  const videoRef = useRef([]);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleScreenSharing = async () => {
    if (!isScreenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Store the current camera track for restoration
      cameraTrack.current = localStream.current.getVideoTracks()[0];

      // Set the main video to the screen stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      // Store the screen stream in localStream so controls operate on the correct stream
      localStream.current = screenStream;
      screenTrack.current = screenStream.getVideoTracks()[0];

      const sender = peerConnection.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(screenTrack.current);
      }

      screenTrack.current.onended = () => {
        const originalTrack = cameraTrack.current;
        if (sender && originalTrack) {
          sender.replaceTrack(originalTrack);
        }
        // Restore main video to camera, and localStream to cameraStream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
        setIsScreenSharing(false);
      };
      setIsScreenSharing(true);
    } else {
      const originalTrack = cameraTrack.current;
      const sender = peerConnection.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender && originalTrack) {
        sender.replaceTrack(originalTrack);
        if (screenTrack.current) {
          screenTrack.current.stop();
          screenTrack.current = null;
        }
      }
      // Restore main video to camera, and localStream to cameraStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
      setIsScreenSharing(false);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const leaveCall = () => {
    // Stop all local tracks (camera/screen)
    localStream.current?.getTracks().forEach((track) => track.stop());
    // Close peer connection
    peerConnection.current?.close();
    // Navigate away
    navigate("/");
  };

  useEffect(() => {
    if (!username) {
      navigate("/waiting-room", { state: { roomId } });
      return;
    } else {
      localStorage.setItem("username", username);
    }

    // const remoteStream = new MediaStream();

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // display local stream in video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // store stream in ref for controls
        localStream.current = stream;
        cameraStream.current = stream;

        // Join signaling room (after local stream and video are set)
        socket.emit("join-call", roomId, () => {});

        // Multi-user: listen for users in room to set up peer connections
        socket.on("user-joined", async (socketId, clients) => {
          clients.forEach((id) => {
            if (id === socket.id) return;
            if (connections.current[id]) return;

            const pc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("ice-candidate", { candidate: event.candidate, to: id });
              }
            };

            pc.ontrack = (event) => {
              const newVideo = {
                socketId: id,
                stream: event.streams[0],
              };
              setVideos((prev) => {
                const updated = [...prev.filter(v => v.socketId !== id), newVideo];
                videoRef.current = updated;
                return updated;
              });
            };

            if (localStream.current) {
              localStream.current.getTracks().forEach((track) =>
                pc.addTrack(track, localStream.current)
              );
            }

            connections.current[id] = pc;
          });

          if (socketId === socket.id) {
            for (let peerId in connections.current) {
              if (peerId === socket.id) continue;

              const pc = connections.current[peerId];
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("offer", { offer, to: peerId });
            }
          }
        });

        socket.on("offer", async ({ offer, from }) => {
          console.log("Received offer from", from);
          const pc = connections.current[from];
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { answer, to: from });
          } catch (err) {
            console.error("Error handling offer:", err);
          }
        });

        socket.on("answer", async ({ answer, from }) => {
          console.log("Received answer from", from);
          const pc = connections.current[from];
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("Error handling answer:", err);
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

        // TODO: Offer/answer/ice-candidate logic here for multi-peer (to be merged in follow-up)
      } catch (err) {
        console.log(
          "Error accessing media devices in videoMeet.jsx (useEffect) : ",
          err
        );
      }
    };

    init();
  }, [username, roomId, navigate]);

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl mb-4">Welcome, {username}</h2>
      <div className="flex space-x-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-220 h-165 border rounded"
        ></video>
        <div className="flex flex-col gap-5">
          {isScreenSharing ? (
            <video
              autoPlay
              muted
              className="w-80 h-60 border rounded"
              ref={(ref) => {
                if (ref && cameraStream.current) {
                  ref.srcObject = cameraStream.current;
                }
              }}
            />
          ) : (
            ""
          )}
          {/* Render all remote user videos */}
          {videos.map((videoObj) => (
            <video
              key={videoObj.socketId}
              autoPlay
              className="w-80 h-60 border rounded"
              ref={(ref) => {
                if (ref && videoObj.stream) {
                  ref.srcObject = videoObj.stream;
                }
              }}
            />
          ))}
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

export default VideoMeet;
