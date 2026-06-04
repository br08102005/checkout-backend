import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", ordersRoutes);
app.use("/api", paymentRoutes);

app.get("/", (req, res) => {
  res.json({ status: "backend online" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});