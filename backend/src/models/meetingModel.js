import mongoose, { Schema } from "mongoose";


const meetingSchema = new Schema({
    user_id: { type: String },
    meedingCode: { type: String, requied: true },
    data: { type: Date, default: Date.now,  required: true}
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;