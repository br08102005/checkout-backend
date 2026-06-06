router.post("/payment-webhook", async (req, res) => {
  const { amount, reference } = req.body;

  if (!amount) {
    return res.status(400).json({ success: false, error: "Missing amount" });
  }

  // 1. EVITAR DUPLICADOS (idempotência simples)
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

  // 2. PEGAR PEDIDO MAIS ANTIGO
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
      error: "No matching order"
    });
  }

  // 3. LOCK ATÓMICO (EVITA DUPLICAÇÃO EM TRÁFEGO ALTO)
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_reference: reference || null
    })
    .eq("id", order.id)
    .eq("status", "pending") // 🔥 condição crítica
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(409).json({
      success: false,
      error: "Order already taken by another process"
    });
  }

  return res.json({
    success: true,
    message: "Payment confirmed safely",
    order_id: order.order_id
  });
});
