import React, { useContext, useState } from "react";
import Footer from "../components/Footer";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../../API/axios";
import { AuthContext } from "../../Context/AuthContext";

const Signin = () => {
  const [inputValues, setInputValues] = useState({
    name: "",
    userName: "",
    password: "",
  });
  const navigate = useNavigate();
  const { Login } = useContext(AuthContext);

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setInputValues({ ...inputValues, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await api.post(
        "/api/v1/user/register",
        { ...inputValues },
        { withCredentials: true }
      );

      const { success, message, user } = data;
      if (success) {
        Login(user);
        setInputValues({
          name: "",
          username: "",
          password: "",
        });
        console.log(message);
        navigate("/generate-room-key");
      }
    } catch (e) {
      console.log(`error is seen to be here ${e}`);
    }
  };

  return (
    <div>
      <div className="h-[900px] flex items-center justify-center">
        <div className="flex flex-col bg-bgS px-8 py-8 rounded-3xl w-120">
          <h1 className="text-6xl pb-6">Sign up</h1>
          <form onSubmit={handleSubmit} className="">
            {/* username */}
            <label htmlFor="username" className="text-2xl block pb-6">
              Name
            </label>
            <input
              className="text-2xl block w-full mb-8 rounded-2xl pl-3"
              onChange={handleOnChange}
              type="text"
              name="name"
              id="name"
              placeholder="What should we call you"
            />
            <label htmlFor="username" className="text-2xl block pb-6">
              Username
            </label>
            <input
              className="text-2xl block w-full mb-8 rounded-2xl pl-3"
              onChange={handleOnChange}
              type="text"
              name="username"
              id="username"
              placeholder="Enter your username"
            />

            {/* Password */}
            <label htmlFor="password" className="text-2xl block pb-6">
              Password
            </label>
            <input
              className="text-2xl w-full mb-8 pl-3 rounded-2xl"
              type="password"
              onChange={handleOnChange}
              name="password"
              id="password"
              placeholder="Enter your password"
            />
            <button
              type="submit"
              className="text-2xl px-4 py-4 rounded-2xl shadow-2xl hover:shadow-EPin bg-EPin"
            >
              Sign up
            </button>
            <NavLink
              to={"/login"}
              className={
                "text-2xl px-4 py-4 rounded-2xl shadow-2xl hover:shadow-EPin bg-bgS text-EPin ml-7"
              }
            >
              Log in
            </NavLink>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Signin;
