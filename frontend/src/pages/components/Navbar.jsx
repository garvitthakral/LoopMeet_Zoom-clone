import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import LogoutIcon from "@mui/icons-material/Logout";

const Navbar = () => {
  const { user, Logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogOut = () => {
    Logout();
    navigate("/");
  };

  return (
    <div className="h-[100px] px-10 flex items-center justify-between w-full z-60">
      <img
        src="https://res.cloudinary.com/dtntjxdio/image/upload/v1748598088/LoopMeet_logo_final_rqieeg.png"
        alt=""
        className="h-[80px]"
      />
      <div className="flex-1 flex justify-center">
        <div className="flex bg-bgS rounded-4xl px-7 py-3 gap-5 text-2xl divide-x divide-white/40">
          {user ? (
            ""
          ) : (
            <NavLink
              to={"/register"}
              className={({ isActive }) =>
                `${isActive ? "text-EPin px-6" : "px-6"}`
              }
            >
              Register
            </NavLink>
          )}
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
            {user ? "Start Meeting" : "Join as Guest"}
          </NavLink>
        </div>
      </div>
      <div className="w-[80px]">
        <button onClick={handleLogOut}>
          <LogoutIcon fontSize={"large"} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
