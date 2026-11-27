export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { pedidoId, nombre, email } = req.body;
  const origin = req.headers.origin || "https://pastillerow.vercel.app";

  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: [
          {
            id: "MEDISYNC-KIT-01",
            title: `Kit Pastillero Inteligente MediSync (${pedidoId})`,
            description: "Pastillero 7 compartimentos + Pulsera RFID pasiva + Batería 9V",
            quantity: 1,
            currency_id: "CLP",
            unit_price: 29990
          }
        ],
        payer: {
          name: nombre,
          email: email || "cliente@medisync.cl"
        },
        external_reference: pedidoId,
        back_urls: {
          success: `${origin}/?pago=aprobado&id=${pedidoId}`,
          failure: `${origin}/?pago=fallido&id=${pedidoId}`,
          pending: `${origin}/?pago=pendiente&id=${pedidoId}`
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data });
    }

    return res.status(200).json({ init_point: data.init_point });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}