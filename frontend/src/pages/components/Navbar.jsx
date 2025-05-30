import React from "react";
import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <div className="h-[100px] px-10 flex items-center justify-between w-full">
      <img
        src="https://res.cloudinary.com/dtntjxdio/image/upload/v1748598088/LoopMeet_logo_final_rqieeg.png"
        alt=""
        className="h-[80px]"
      />
      <div className="flex-1 flex justify-center">
        <div className="flex bg-bgS rounded-4xl px-7 py-3 gap-5 text-2xl divide-x divide-white/40">
          <NavLink
            to={"/register"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-6" : "px-6"}`
            }
          >
            Register
          </NavLink>
          <NavLink
            to={"/"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-6" : "px-6"}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to={"/generate-room-key"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-6" : "px-6"}`
            }
          >
            Start meating
          </NavLink>
          <NavLink
            to={"/generate-room-key"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-6" : "px-6"}`
            }
          >
            Join as guest
          </NavLink>
        </div>
      </div>
      <div className="w-[80px]" />
    </div>
  );
};

export default Navbar;
