import { connectDB } from "./db/db.js";
import app from "./server.js";

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server failed to start: ${error}`);
    process.exit(1);
  }
}

startServer();
