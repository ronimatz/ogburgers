require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const VELANA_SECRET = process.env.VELANA_SECRET || '';
const VELANA_URL = process.env.VELANA_URL || 'https://api.velana.com.br/v1/checkouts';

const UNIT_PRICE_CENTS = 3990; // R$ 39,90 em centavos

function basicAuthHeader(secret) {
  // Velana example uses Basic <base64(secret_key:x)>
  const token = Buffer.from(`${secret}:x`).toString('base64');
  return `Basic ${token}`;
}

app.post('/checkout', async (req, res) => {
  try {
    const { quantity, burger1, burger2, drink, splits, settings } = req.body;

    if (!quantity || typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'quantity is required and must be a number >= 1' });
    }

    const amount = quantity * UNIT_PRICE_CENTS; // total em centavos

    const payload = {
      amount: amount,
      items: [
        {
          title: 'Combo Tio Smash 39,90',
          unitPrice: UNIT_PRICE_CENTS,
          quantity: quantity,
          tangible: true
        }
      ],
      settings: Object.assign(
        {
          requestAddress: true,
          requestPhone: false,
          traceable: false,
          boleto: { enabled: true },
          pix: { enabled: true, expiresInDays: 2 },
          card: { enabled: true },
          defaultPaymentMethod: 'pix'
        },
        settings || {}
      )
    };

    if (Array.isArray(splits)) payload.splits = splits;

    // optional metadata from selections
    payload.metadata = {
      burger1: burger1 || null,
      burger2: burger2 || null,
      drink: drink || null
    };

    if (!VELANA_SECRET) {
      // return payload so developer can inspect without calling Velana
      return res.status(200).json({ note: 'VELANA_SECRET not set, returning payload only', payload });
    }

    const headers = {
      Authorization: basicAuthHeader(VELANA_SECRET),
      'Content-Type': 'application/json'
    };

    const response = await axios.post(VELANA_URL, payload, { headers });

    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data });
    }
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
