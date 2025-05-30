import React from "react";
import CopyrightIcon from '@mui/icons-material/Copyright';
import Social from "./Social";

const Footer = () => {
  return (
    <div>
      <div className="bg-black/10 backdrop-blur-md">
        <div className="flex justify-between  h-[250px] px-40 ">
          <img
            src="https://res.cloudinary.com/dtntjxdio/image/upload/v1748598088/LoopMeet_Typo_bmexpk.png"
            alt="Logo" className="bg-black/10"
          />
          <div className="flex flex-col justify-center items-center">
            <h1 className="text-4xl flex justify-center items-center">
              Socials
            </h1>
            <Social />
          </div>
        </div>
        <hr className="text-white/20" />
        <div className="flex justify-center">
          <p className="text-white/40">
            <CopyrightIcon /> LoopMeet a zoom call clone project by Garvit Thakral
          </p>
        </div>
      </div>
    </div>
  );
};

export default Footer;
