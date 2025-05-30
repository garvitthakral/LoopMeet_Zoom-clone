import React from "react";
import { NavLink } from "react-router-dom";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import XIcon from "@mui/icons-material/X";

const Social = () => {
  return (
    <div className="flex justify-center gap-6 text-3xl pt-9">
      <NavLink to={"https://github.com/garvitthakral"}>
        <GitHubIcon
          fontSize={"large"}
          className="hover:scale-120 hover:text-EPin transition-transform duration-300"
        />
      </NavLink>
      <NavLink to={"https://www.linkedin.com/in/garvit-thakral-23a0a130a/"}>
        <LinkedInIcon
          fontSize={"large"}
          className="hover:scale-120 hover:text-EPin transition-transform duration-300"
        />
      </NavLink>
      <NavLink to={"mailto:thakralgarvit1@gmail.com"}>
        <EmailIcon
          fontSize={"large"}
          className="hover:scale-120 hover:text-EPin transition-transform duration-300"
        />
      </NavLink>
      <a
        href="https://wa.me/918570896390"
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon
          fontSize={"large"}
          className="hover:scale-120 hover:text-EPin transition-transform duration-300"
        />
      </a>
      <NavLink to={"https://x.com/thakral_garvit"}>
        <XIcon
          fontSize={"large"}
          className="hover:scale-120 hover:text-EPin transition-transform duration-300"
        />
      </NavLink>
    </div>
  );
};

export default Social;
