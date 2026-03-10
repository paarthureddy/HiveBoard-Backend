import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const messageSchema = new mongoose.Schema({
    roomId: String,
    userName: String,
});
const Message = mongoose.model('Message', messageSchema);

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const res = await Message.updateMany({ userName: { $exists: false } }, { $set: { userName: 'Unknown' } });
        const res2 = await Message.updateMany({ userName: null }, { $set: { userName: 'Unknown' } });
        console.log('Fixed missing userName fields:', res, res2);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
