import React from "react";
import { NavLink } from "react-router-dom";

const GetStarted = () => {
  return (
    <div className="flex justify-center pb-25">
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl">
          Get Started, connect
          <br />
          with your friends & colleague.
        </h1>
        <div className="flex gap-10 py-8">
          <NavLink
            to={"/register"}
            className={
              "text-2xl px-4 py-4 rounded-2xl shadow-2xl hover:shadow-EPin bg-EPin"
            }
          >
            GetStarted
          </NavLink>
          <NavLink
            to={"/generate-room-key"}
            className={
              "text-2xl px-4 py-4 rounded-2xl shadow-2xl hover:shadow-EPin bg-bgS text-EPin"
            }
          >
            As Guest
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
