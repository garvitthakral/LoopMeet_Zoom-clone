import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: { type: String, required, unique: true },
  name: { type: String, required },
  password: { type: String, required },
  token: { type: String, required },
});

const User = mongoose.model("User", userSchema);

export default User;
