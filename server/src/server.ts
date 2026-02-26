import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import errorHandler from "./middlewares/errorHandler";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
import fileRoutes from "./routes/fileRead.route";

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later."
});

app.use(limiter);
app.use("/api/fileRead", fileRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("uncaughtException", (error: Error) => {
  console.error("UNCAUGHT EXCEPTION!");
  console.error(error.name);
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("UNHANDLED REJECTION!");
  console.error("Reason:", reason);
  process.exit(1);
});