import React, { useEffect, useRef } from "react";

const RemoteVideo = ({ stream}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full rounded-lg bg-gray-900"
    />
  );
};

export default RemoteVideo;
