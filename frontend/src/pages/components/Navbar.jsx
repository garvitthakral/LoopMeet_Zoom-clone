import React from "react";
import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <div className="h-[100px] px-10 flex items-center justify-between w-full">
      <img
        src="https://res.cloudinary.com/dtntjxdio/image/upload/v1748229778/lOGO_dzqjyr.png"
        alt=""
        className="h-[80px]"
      />
      <div className="flex-1 flex justify-center">
        <div className="flex bg-bgS rounded-4xl px-7 py-3 gap-5 text-2xl divide-x divide-white/40">
          <NavLink
            to={"/register"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-4" : "px-4"}`
            }
          >
            Register
          </NavLink>
          <NavLink
            to={"/"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-4" : "px-4"}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to={"/genrate-room-key"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-4" : "px-4"}`
            }
          >
            Start meating
          </NavLink>
          <NavLink
            to={"/genrate-room-key"}
            className={({ isActive }) =>
              `${isActive ? "text-EPin px-4" : "px-4"}`
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
