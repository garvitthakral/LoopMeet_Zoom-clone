import React, { useEffect, useReducer, useRef, useState } from "react";
import io from "socket.io-client";

const server_url = "http://localhost:3002";
var connections = {};
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VideoCall = () => {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef([]);

  const [videoAvail, setVideoAvail] = useState(true);
  const [audioAvail, setAudioAvail] = useState(true);
  const [audio, setAudio] = useState();
  const [screen, setScreen] = useState();
  const [showModel, setShowModel] = useState();
  const [screenAvail, setScreenAvail] = useState();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setusername] = useState("");
  const [videos, setVideos] = useState([]);

  const getPermissions = async () => {
    try {
      //video
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPermission) {
        setVideoAvailable(true);
        console.log("Video permission granted");
      } else {
        setVideoAvailable(false);
        console.log("Video permission denied");
      }

      //audio
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvail(true);
      } else setAudioAvail(false);

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvail(true);
      } else setScreenAvail(false);

      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoPermission ? true : false,
        audio: audioPermission ? true : false,
      });

      if (userMediaStream) {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userMediaStream;
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }
      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  const addMessage = () => {};

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;
      socketRef.current.on("chat-message", addMessage);
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
        videoRef.current = videoRef.current.filter((video) => video.socketId !== id);
      });
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate !== null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            console.log("🔴 onaddstream fired", event.stream);
            const videoExist = videoRef.current.find(
              (video) => video.socketId === socketListId
            );
            if (videoExist) {
              setVideos((videos) => {
                const updatedVideo = videos.map((video) =>
                  video.socketId ? { ...video, stream: event.stream } : video
                );
                videoRef.current = updatedVideo;
                return updatedVideo;
              });
            } else {
              const newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoPlay: true,
                playsinline: true,
              };
              setVideos((videos) => {
                const updatedVideo = [...videos, newVideo];
                videoRef.current = updatedVideo;
                return updatedVideo;
              });
            }
          };

          if (window.localStream) {
            console.log("✅ Adding local stream to:", socketListId);
            connections[socketListId].addStream(window.localStream);
          } else {
            const blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (const id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {
              console.log(e);
            }

            connections[id2].createOffer().then((description) => {
              connections[id2].setLocalDescription(description).then(() => {
                socketRef.current
                  .emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  )
                  .catch((e) => console.log(e));
              });
            });
          }
        }
      });
    });
  };

  const getMedia = () => {
    setAudio(audioAvail);
    setVideos([]);
    connectToSocketServer();
  };

  const getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    for (const id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideos([]);

          try {
            const tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          for (const id in connections) {
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        })
    );
  };

  const silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    const ctx = canvas.getContext("2d");
    ctx.fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const getUserMedia = () => {
    if ((videoAvail) || (audioAvail)) {
      navigator.mediaDevices
        .getUserMedia({ video: videoAvail, audio: audioAvail })
        .then(getUserMediaSuccess)
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      try {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.log(e);
      }
    }
  };

  const connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  useEffect(() => {
    getPermissions();
    if (videos !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [audio, videos]);

  return (
    <div>
      {askForUsername ? (
        <div>
          <h1 className="text-7xl">Welcome!!! Enter a Username</h1>
          <label htmlFor="username" className="text-4xl">
            Username:
          </label>
          <input
            type="text"
            id="username"
            name="username"
            className="border rounded-2xl text-4xl ml-3 border-gray-50 pl-5"
            onChange={(e) => setusername(e.target.value)}
          />
          <button
            onClick={connect}
            className="bg-bgS text-3xl text-EPin px-4 py-3 rounded-2xl ml-3"
          >
            Connect
          </button>
          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <>
          <video ref={localVideoRef} autoPlay muted></video>
          {videos.map((video) => (
            <div key={video.socketId}>
              <h2>{video.socketId}</h2>
              <video
                data-socket={video.socketId}
                ref={(ref) => {
                  if (ref && video.stream) {
                    ref.srcObject = video.stream;
                    ref.play().catch((e) => console.log("Play error:", e));
                  }
                }}
                autoPlay
                muted
                playsInline
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default VideoCall;
