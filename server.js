require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
// Habilita CORS - permitir origem configurável via ENV (default: *)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN }));

const VELANA_SECRET = process.env.VELANA_SECRET || '';
const VELANA_USER = process.env.VELANA_USER || '';
const VELANA_PASS = process.env.VELANA_PASS || '';
const VELANA_URL = process.env.VELANA_URL || 'https://api.velana.com.br/v1/checkouts';

const UNIT_PRICE_CENTS = 3990; // R$ 39,90 em centavos
const DEFAULT_NO_INTEREST_INSTALLMENTS = 1;
const DEFAULT_MAX_INSTALLMENTS = 1;
const DEFAULT_INSTALLMENTS = {
  noInterestInstallments: DEFAULT_NO_INTEREST_INSTALLMENTS,
  maxInstallments: DEFAULT_MAX_INSTALLMENTS
};

function buildAuthHeader() {
  // Prefer secret-based auth when available
  if (VELANA_SECRET) {
    const token = Buffer.from(`${VELANA_SECRET}:x`).toString('base64');
    return `Basic ${token}`;
  }

  // Fallback to user:pass basic auth if provided
  if (VELANA_USER && VELANA_PASS) {
    const token = Buffer.from(`${VELANA_USER}:${VELANA_PASS}`).toString('base64');
    return `Basic ${token}`;
  }

  return null;
}

app.post('/checkout', async (req, res) => {
  try {
    const { quantity, burger1, burger2, drink, splits, settings } = req.body;

    if (!quantity || typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'quantity is required and must be a number >= 1' });
    }

    const amount = quantity * UNIT_PRICE_CENTS; // total em centavos

    // montar payload e garantir campos de parcelas como inteiros
    const payload = {
      amount: amount,
      // ensure installments fields appear where the Velana API may expect them
      installments: Object.assign({}, DEFAULT_INSTALLMENTS),
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
          boleto: Object.assign({ enabled: false }, DEFAULT_INSTALLMENTS),
          pix: { enabled: true, expiresInDays: 2 },
          card: Object.assign({ enabled: false }, DEFAULT_INSTALLMENTS),
          // adicional: campos explícitos de parcelas no settings
          installments: Object.assign({}, DEFAULT_INSTALLMENTS),
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

    // coercionar campos de parcelas para inteiros em vários locais
    function ensureInt(obj, key, fallback) {
      if (!obj) return;
      const v = obj[key];
      const n = parseInt(v, 10);
      obj[key] = Number.isNaN(n) ? fallback : n;
    }

    // top-level installments
    ensureInt(payload, 'installments', DEFAULT_INSTALLMENTS);
    // map internal names to API-expected names (Velana expects freeInstallments / maxInstallments)
    if (payload.installments) {
      payload.installments.freeInstallments = payload.installments.noInterestInstallments;
      payload.installments.maxInstallments = payload.installments.maxInstallments || payload.installments.maxInstallments;
    }

    // settings defaults already applied above; coerce inside settings, card and boleto
    if (!payload.settings) payload.settings = {};
    if (!payload.settings.installments) payload.settings.installments = {};
    ensureInt(payload.settings.installments, 'noInterestInstallments', DEFAULT_NO_INTEREST_INSTALLMENTS);
    ensureInt(payload.settings.installments, 'maxInstallments', DEFAULT_MAX_INSTALLMENTS);
    // set API fields names
    payload.settings.installments.freeInstallments = payload.settings.installments.noInterestInstallments;

    if (!payload.settings.card) payload.settings.card = {};
    ensureInt(payload.settings.card, 'noInterestInstallments', DEFAULT_NO_INTEREST_INSTALLMENTS);
    ensureInt(payload.settings.card, 'maxInstallments', DEFAULT_MAX_INSTALLMENTS);
    // map to API field names
    payload.settings.card.freeInstallments = payload.settings.card.noInterestInstallments;
    payload.settings.card.maxInstallments = payload.settings.card.maxInstallments;

    if (!payload.settings.boleto) payload.settings.boleto = {};
    ensureInt(payload.settings.boleto, 'noInterestInstallments', DEFAULT_NO_INTEREST_INSTALLMENTS);
    ensureInt(payload.settings.boleto, 'maxInstallments', DEFAULT_MAX_INSTALLMENTS);
    payload.settings.boleto.freeInstallments = payload.settings.boleto.noInterestInstallments;
    payload.settings.boleto.maxInstallments = payload.settings.boleto.maxInstallments;

    // also coerce top-level fields to be safe
    if (!payload.installments) payload.installments = {};
    ensureInt(payload.installments, 'noInterestInstallments', DEFAULT_NO_INTEREST_INSTALLMENTS);
    ensureInt(payload.installments, 'maxInstallments', DEFAULT_MAX_INSTALLMENTS);
    payload.installments.freeInstallments = payload.installments.noInterestInstallments;
    payload.installments.maxInstallments = payload.installments.maxInstallments;

    const authHeader = buildAuthHeader();

    if (!authHeader) {
      // return payload so developer can inspect without calling Velana
      return res.status(200).json({ note: 'No VELANA auth provided, returning payload only', payload });
    }

    const headers = {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    };

    console.log('Enviando pedido para Velana, amount:', payload.amount);
    console.log('Payload enviado:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(VELANA_URL, payload, { headers, timeout: 20000 });

      // tentar extrair uma URL de redirecionamento da resposta da Velana
      function findRedirectUrl(obj) {
        if (!obj) return null;
        const candidates = [
          'redirectUrl', 'redirect', 'url', 'checkoutUrl', 'paymentUrl', 'transactionUrl', 'secureUrl', 'secureId'
        ];
        for (const key of candidates) {
          if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 0) return obj[key];
        }
        // verificar em nested `.data` ou `.result`
        if (obj.data) return findRedirectUrl(obj.data);
        if (obj.result) return findRedirectUrl(obj.result);
        return null;
      }
      let found = findRedirectUrl(response.data) || findRedirectUrl(response.data && response.data.data);
      // se encontrou only secureId (não uma URL), construir a URL conhecida
      if (found && /^[0-9a-fA-F\-]{10,}$/.test(found) && !found.startsWith('http')) {
        found = `https://link.velana.com.br/checkout/${found}`;
      }
      const out = { raw: response.data };
      if (found) out.redirectUrl = found;

      return res.status(response.status).json(out);
    } catch (err) {
      // se Velana retornar erro com body, encaminhar ao cliente sem encerrar o processo
      if (err.response && err.response.data) {
        console.error('Erro Velana:', JSON.stringify(err.response.data));
        return res.status(err.response.status || 500).json(err.response.data);
      }
      console.error('Erro ao chamar Velana:', err.message);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data });
    }
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
