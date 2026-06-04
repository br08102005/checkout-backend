import express from "express";
import { supabase } from "../supabase.js";

console.log("🔥 payment.js carregado");

const router = express.Router();

router.post("/payment-webhook", async (req, res) => {
  const { order_id, amount, reference } = req.body;

  if (!order_id || !amount) {
    return res.status(400).json({
      success: false,
      error: "Missing data"
    });
  }

  // 1. Buscar pedido
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", order_id)
    .single();

  if (error || !order) {
    return res.status(404).json({
      success: false,
      error: "Order not found"
    });
  }

  // 2. Validar valor
  if (Number(amount) !== Number(order.total)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payment amount"
    });
  }

  // 3. Atualizar pedido como pago
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_reference: reference || null
    })
    .eq("order_id", order_id);

  if (updateError) {
    return res.status(500).json({
      success: false,
      error: updateError.message
    });
  }

  return res.json({
    success: true,
    message: "Payment confirmed",
    order_id
  });
});

export default router;