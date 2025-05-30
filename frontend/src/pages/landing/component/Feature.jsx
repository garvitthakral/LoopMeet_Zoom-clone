import React from "react";

const Feature = () => {
  const list = [
    "A P2P (Peer to Peer) video conferencing app.",
    "Protected Routes for add security",
    "Meeting password & access control",
    "History records",
  ];
  return (
    <div className="px-40 pt-40 pb-19">
      <h1 className="text-7xl pb-8">Features</h1>
      <ul className="list-disc ml-12">
        {list.map((el, idx) => (
          <li key={idx} className="text-5xl">{el}</li>
        ))}
      </ul>
    </div>
  );
};

export default Feature;
