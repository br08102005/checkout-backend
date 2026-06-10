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

    const paidAmount = Number(amount);

    if (!paidAmount || Number.isNaN(paidAmount)) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount"
      });
    }

    if (reference) {
      const cleanReference = String(reference).trim();

      const { data: already, error: alreadyError } = await supabase
        .from("orders")
        .select("order_id,status,payment_reference")
        .eq("payment_reference", cleanReference)
        .maybeSingle();

      if (alreadyError) {
        return res.status(500).json({
          success: false,
          error: alreadyError.message
        });
      }

      if (already) {
        return res.json({
          success: true,
          message: "Already processed",
          order_id: already.order_id
        });
      }
    }

    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const cutoff = new Date(Date.now() - FIFTEEN_MINUTES).toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("order_id,total,status,activity_score,last_active_at,created_at")
      .eq("status", "pending")
      .eq("total", paidAmount)
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
        error: "No matching pending order in the last 15 minutes"
      });
    }

    const bestOrder = orders[0];
    const secondOrder = orders[1] || null;

    const bestScore = Number(bestOrder.activity_score || 0);
    const secondScore = secondOrder ? Number(secondOrder.activity_score || 0) : 0;

    if (orders.length > 1 && bestScore <= secondScore) {
      return res.status(409).json({
        success: false,
        error: "Ambiguous payment"
      });
    }

    if (orders.length > 1 && bestScore - secondScore < 30) {
      return res.status(409).json({
        success: false,
        error: "Ambiguous payment"
      });
    }

    if (bestScore < 50) {
      return res.status(409).json({
        success: false,
        error: "Insufficient payment activity"
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_reference: reference ? String(reference).trim() : null
      })
      .eq("order_id", bestOrder.order_id)
      .eq("status", "pending")
      .select("order_id,status")
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    if (!updated) {
      return res.status(409).json({
        success: false,
        error: "Order already taken"
      });
    }

    return res.json({
      success: true,
      message: "Payment confirmed safely",
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
