import express from "express";
import { supabase } from "../supabase.js";

const router = express.Router();

/* =========================
   CONVERTE VALORES SMS/BANK
   ========================= */
function parseAmount(value) {
  if (value === null || value === undefined) return NaN;

  return Number(
    String(value)
      .trim()
      .replace(/Kz/gi, "")     // remove moeda
      .replace(/\s/g, "")      // remove espaços (4 500 → 4500)
      .replace(/\./g, "")      // remove pontos de milhar
      .replace(",", ".")       // vírgula decimal → ponto
  );
}

/* =========================
   WEBHOOK
   ========================= */
router.post("/payment-webhook", async (req, res) => {
  try {
    const { amount, reference } = req.body;

    /* 1. validar input */
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Missing amount"
      });
    }

    const paidAmount = parseAmount(amount);

    if (Number.isNaN(paidAmount)) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount format"
      });
    }

    /* 2. evitar duplicados por referência */
    if (reference) {
      const cleanReference = String(reference).trim();

      const { data: already } = await supabase
        .from("orders")
        .select("order_id")
        .eq("payment_reference", cleanReference)
        .maybeSingle();

      if (already) {
        return res.json({
          success: true,
          message: "Already processed",
          order_id: already.order_id
        });
      }
    }

    /* 3. janela de tempo (15 min) */
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const cutoff = new Date(Date.now() - FIFTEEN_MINUTES).toISOString();

    /* 4. procurar pedido correspondente */
    const { data: orders, error } = await supabase
      .from("orders")
      .select("order_id,total,status,activity_score,last_active_at,created_at")
      .eq("status", "pending")
      .gte("total", paidAmount - 0.01)
      .lte("total", paidAmount + 0.01)
      .gte("created_at", cutoff)
      .order("activity_score", { ascending: false })
      .order("last_active_at", { ascending: false })
      .limit(5);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No matching pending order found"
      });
    }

    /* 5. escolher melhor candidato */
    const bestOrder = orders[0];

    /* 6. atualizar como pago */
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_reference: reference ? String(reference).trim() : null
      })
      .eq("order_id", bestOrder.order_id)
      .eq("status", "pending")
      .select("order_id")
      .maybeSingle();

    if (updateError || !updated) {
      return res.status(409).json({
        success: false,
        error: "Order already taken"
      });
    }

    /* 7. resposta final */
    return res.json({
      success: true,
      message: "Payment confirmed successfully",
      order_id: updated.order_id
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
