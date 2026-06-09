import express from "express";
import { supabase } from "../supabase.js";

const router = express.Router();

router.post("/payment-webhook", async (req, res) => {
  try {
    const { amount, reference } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Missing amount"
      });
    }

    // evitar duplicados
    if (reference) {
      const { data: already } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_reference", reference)
        .maybeSingle();

      if (already) {
        return res.json({
          success: true,
          message: "Already processed"
        });
      }
    }

    // procurar pedido pendente
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .eq("total", Number(amount))
      .order("created_at", { ascending: true })
      .limit(1);

    if (error || !orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No matching order"
      });
    }

    const order = orders[0];

    // atualizar pedido para pago
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_reference: reference || null
      })
      .eq("order_id", order.order_id)
      .eq("status", "pending")
      .select()
      .single();

    if (updateError || !updated) {
      return res.status(409).json({
        success: false,
        error: "Order already taken"
      });
    }

    return res.json({
      success: true,
      message: "Payment confirmed safely",
      order_id: order.order_id
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
