# OG Burgers - API de Checkout (Velana)

Pequena API que cria checkouts na Velana para o combo fixo (2 hambúrgueres + 1 bebida) com preço unitário de R$ 39,90.

Como funciona
- A API expõe `POST /checkout`.
- Body esperado (JSON):
  - `quantity` (number, obrigatório) — número de combos desejados.
  - `burger1`, `burger2`, `drink` (strings, opcionais) — usado como metadata.
  - `splits` (array, opcional) — se quiser repassar `splits` para Velana.
  - `settings` (object, opcional) — sobrescreve as configurações padrão de pagamento.

O servidor calcula `amount = quantity * 3990` (em centavos) e monta o payload enviado para `https://api.velana.com.br/v1/checkouts`.

Variáveis de ambiente
- `VELANA_SECRET` — sua chave secreta Velana. Se não definida, a API vai apenas retornar o payload montado sem chamar Velana.
- `VELANA_URL` — (opcional) URL do endpoint Velana (default `https://api.velana.com.br/v1/checkouts`).

Instalação
```powershell
cd C:\Users\mateu\ogburgers
npm install
```

Execução
```powershell
# desenvolvimento
npm run dev

# produção
npm start
```

Exemplo de request (curl)
```bash
curl -X POST http://localhost:3000/checkout \
  -H "Content-Type: application/json" \
  -d '{"quantity":3, "burger1":"Tradicional Angus", "burger2":"Cheddar Bacon", "drink":"Coca-Cola Lata"}'
```

Resposta de exemplo (quando `VELANA_SECRET` não está setada):
```json
{
  "note": "VELANA_SECRET not set, returning payload only",
  "payload": { /* payload enviado para Velana */ }
}
```
