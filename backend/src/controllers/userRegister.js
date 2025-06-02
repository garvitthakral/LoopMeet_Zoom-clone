import User from "../models/userModel.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res
      .status(httpStatus.NOT_ACCEPTABLE)
      .json({ message: "please fill out all the fields" });
  }

  try {
    const user = await User.findOne({username});
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "user donot exist" });
    }

    if (bcrypt.compare(password, user.password)) {
      const token = crypto.randomBytes(20).toString("hex");

      user.token = token;
      await user.save();
      return res.status(httpStatus.OK).json({ success: true, message: "token saved", user: user});
    }
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

const register = async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    res
      .status(httpStatus.NO_CONTENT)
      .json({ message: "please fill out all the fields" });
  }

  try {
    const exsistingUser = await User.findOne({ username });
    if (exsistingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ messsage: "user already exsist" });
    }

    const hashPass = await bcrypt.hash(password, 9);

    const newUser = new User({
      name: name,
      username: username,
      password: hashPass,
    });

    await newUser.save();

    if (newUser) {
      return res
        .status(httpStatus.CREATED)
        .json({ success: true, message: "user created successfully", user: newUser });
    }
  } catch (error) {
    res.status(httpStatus.NOT_ACCEPTABLE).json({ message: error });
  }
};

export { login, register };
