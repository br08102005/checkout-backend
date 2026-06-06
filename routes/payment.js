router.post("/payment-webhook", async (req, res) => {
  const { amount, reference } = req.body;

  if (!amount) {
    return res.status(400).json({
      success: false,
      error: "Missing amount"
    });
  }

  // 1. procurar pedido pendente com esse valor
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .eq("total", amount)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !order) {
    return res.status(404).json({
      success: false,
      error: "No matching pending order found"
    });
  }

  // 2. atualizar como pago (LOCK)
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_reference: reference || null
    })
    .eq("id", order.id);

  if (updateError) {
    return res.status(500).json({
      success: false,
      error: updateError.message
    });
  }

  return res.json({
    success: true,
    message: "Payment confirmed",
    order_id: order.order_id
  });
});
