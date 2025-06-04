import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../API/socket";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";

const VideoMeet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const roomId = location.pathname.split("/")[2];
  const [username, setUsername] = useState(() => {
    return location.state?.username || localStorage.getItem("username") || null;
  });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

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

        //display local stream in video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        //store stream in ref for controls
        localStream.current = stream;

        //create WebRTC peer connection
        peerConnection.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        //add local stream tracks to the peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        //listen for remote tracks and set them to remoteVideoRef
        peerConnection.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              roomId,
            });
          }
        };
      } catch (err) {
        console.log(
          "Error accessing media devices in videoMeet.jsx (useEffect) : ",
          err
        );
      }
    };

    //join the call room using socket
    socket.emit("join-call", roomId);

    //when someone else joins, create and send an offer
    socket.on("user-joined", async () => {
      try {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit("offer", { offer, roomId });
      } catch (err) {
        console.log(
          "error creating offer in videoMeet.jsx on socket.on(user-joined) : ",
          err
        );
      }
    });

    //when receiving an offer from another user
    socket.on("offer", async ({ offer }) => {
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit("answer", { answer, roomId });
      } catch (err) {
        console.log(
          "Error while receiving offer in videoMeet.jsx in useEffect socket.on{offer} : ",
          err
        );
      }
    });

    //when receiving an answer to your offer
    socket.on("answer", async ({ answer }) => {
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (err) {
        console.log(
          "Error while receiving an answer in videoMeet.jsx in useEffect socket.on{answer} : ",
          err
        );
      }
    });

    //when receiving an Ice candidate
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (err) {
        console.log(
          "Error while receiving an Ice candidate in videoMeet.jsx in useEffect socket.on{ice-candidate} : ",
          err
        );
      }
    });

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
          className="w-80 h-60 border rounded"
        ></video>
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-80 h-60 border rounded"
        ></video>
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
      </div>
    </div>
  );
};

export default VideoMeet;
