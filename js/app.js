const PRICE_PER_COMBO = 39.90;

// Links de checkout por quantidade de combos
const checkoutLinks = {
  1: "https://app.paghub.io/payment/checkout/a69c8b6e-ecff-443f-9aed-e90ee5ecad44",
  2: "https://app.paghub.io/payment/checkout/da510324-391d-419e-b5b0-b364dfe76b52",
  3: "https://app.paghub.io/payment/checkout/5f135d42-23c4-408b-a425-ac6e5fc436c8",
  4: "https://app.paghub.io/payment/checkout/5f2a2a21-cd79-4534-85f5-1bab97dc9051",
  5: "https://app.paghub.io/payment/checkout/7d71b5ab-9c45-4d21-9eef-31a0dab74a12",
};

const state = {
  combos: [],
  selectedBurger1: null,
  selectedBurger2: null,
  selectedDrink: null,
  addressSaved: false
};

const btnContinuar = document.getElementById('btn-continuar');
const btnAdicionarMais = document.getElementById('btn-adicionar-mais');
const btnFinalizar = document.getElementById('btn-finalizar');
const btnAddResumo = document.getElementById('btn-adicionar-resumo');
const btnSalvarEndereco = document.getElementById('btn-salvar-endereco');
const btnEditarEndereco = document.getElementById('btn-editar-endereco');

const sectionMontar = document.getElementById('section-montar');
const sectionPagamento = document.getElementById('section-pagamento');

const stepMontar = document.getElementById('step-montar');
const stepPagamento = document.getElementById('step-pagamento');

const summaryList = document.getElementById('summary-list');
const summaryTotal = document.getElementById('summary-total');
const summaryTotalValue = document.getElementById('summary-total-value');
const promoBadge = document.getElementById('promo-badge');

const enderecoForm = document.getElementById('endereco-form');
const enderecoSalvoBox = document.getElementById('endereco-salvo');
const enderecoSalvoText = document.getElementById('endereco-salvo-text');

const ruaInput = document.getElementById('endereco-rua');
const numeroInput = document.getElementById('endereco-numero');
const bairroInput = document.getElementById('endereco-bairro');
const complementoInput = document.getElementById('endereco-complemento');
const cidadeInput = document.getElementById('endereco-cidade');
const cepInput = document.getElementById('endereco-cep');

const productCards = document.querySelectorAll('.product-card');

function irParaMontar() {
  sectionPagamento.style.display = 'none';
  sectionMontar.style.display = 'block';
  stepPagamento.classList.remove('active');
  stepMontar.classList.add('active');
}

productCards.forEach(card => {
  card.addEventListener('click', () => {
    const group = card.dataset.group;
    const name = card.dataset.name;

    productCards.forEach(c => {
      if (c.dataset.group === group) {
        c.classList.remove('selected');
      }
    });

    card.classList.add('selected');

    if (group === 'burger1') state.selectedBurger1 = name;
    if (group === 'burger2') state.selectedBurger2 = name;
    if (group === 'drink') state.selectedDrink = name;

    // atualizar estado do botão ao selecionar
    updateContinueButtonState();
  });
});

function updateContinueButtonState() {
  if (!btnContinuar) return;
  btnContinuar.disabled = !(state.selectedBurger1 && state.selectedBurger2 && state.selectedDrink);
}

function formatPrice(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Toast simples não bloqueante
// (Toast and inline error helpers removed — comportamento volta ao alerta simples)

function removerCombo(index) {
  state.combos.splice(index, 1);
  atualizarCarrinhos();
}

function atualizarCarrinhos() {
  if (state.combos.length === 0) {
    summaryList.classList.add('empty');
    summaryList.innerHTML = 'Seu carrinho está vazio.';
    summaryTotal.style.display = 'none';
    btnAddResumo.style.display = 'none';
    // badge fixo: sempre mostrar a promoção "3 itens · R$ 39,90"
    if (promoBadge) promoBadge.textContent = `3 itens · ${formatPrice(PRICE_PER_COMBO)}`;
    return;
  }

  summaryList.classList.remove('empty');
  summaryList.innerHTML = '';

  let total = 0;

  state.combos.forEach((combo, index) => {
    total += PRICE_PER_COMBO;

    const item = document.createElement('div');
    item.className = 'summary-item';

    item.innerHTML = `
      <div class="summary-item-header">
        <strong>Promo ${index + 1}</strong>
        <div>
          <span>${formatPrice(PRICE_PER_COMBO)}</span>
          <button class="btn-link" data-remove-index="${index}">Remover</button>
        </div>
      </div>
      <div class="summary-item-details">
        ${combo.burger1} + ${combo.burger2}<br>
        Refri: ${combo.drink}
      </div>
    `;

    summaryList.appendChild(item);
  });

  document.querySelectorAll('[data-remove-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      removerCombo(parseInt(btn.getAttribute('data-remove-index')));
    });
  });

  summaryTotal.style.display = 'flex';
  summaryTotalValue.textContent = formatPrice(total);

  btnAddResumo.style.display = 'inline-block';

  // badge fixo: sempre mostrar a promoção "3 itens · R$ 39,90"
  if (promoBadge) promoBadge.textContent = `3 itens · ${formatPrice(PRICE_PER_COMBO)}`;
}

// Aplica o cupom "FOME" visualmente (não altera preços por enquanto)
function applyCouponUI(show = true) {
  const couponArea = document.getElementById('coupon-area');
  if (!couponArea) return;
  if (show) {
    couponArea.style.display = 'flex';
    couponArea.classList.add('applied');
    const codeEl = couponArea.querySelector('.coupon-code');
    if (codeEl) codeEl.textContent = 'FOME';
    const removeBtn = document.getElementById('remove-coupon');
    if (removeBtn) {
      removeBtn.textContent = 'Remover';
      removeBtn.addEventListener('click', () => {
        couponArea.classList.remove('applied');
        // altera texto do botão para permitir reaplicar
        removeBtn.textContent = 'Aplicar FOME';
        // ao clicar novamente reaplica
        removeBtn.addEventListener('click', function reapply() {
          couponArea.classList.add('applied');
          removeBtn.textContent = 'Remover';
          removeBtn.removeEventListener('click', reapply);
        });
      }, { once: true });
    }
  } else {
    couponArea.style.display = 'none';
  }
}

btnContinuar.addEventListener('click', () => {
  const burger1 = state.selectedBurger1;
  const burger2 = state.selectedBurger2;
  const drink = state.selectedDrink;

  if (!burger1 || !burger2 || !drink) {
    alert('Por favor, selecione os dois hambúrgueres e o refrigerante.');
    return;
  }

  state.combos.push({ burger1, burger2, drink });

  state.selectedBurger1 = null;
  state.selectedBurger2 = null;
  state.selectedDrink = null;

  productCards.forEach(card => card.classList.remove('selected'));

  atualizarCarrinhos();

  sectionMontar.style.display = 'none';
  sectionPagamento.style.display = 'block';

  stepMontar.classList.remove('active');
  stepPagamento.classList.add('active');
  // aplica o cupom automaticamente quando chega na página de pagamento
  applyCouponUI(true);
  // badge fixo: garantir texto da promoção
  if (promoBadge) promoBadge.textContent = `3 itens · ${formatPrice(PRICE_PER_COMBO)}`;
});

// garantir badge inicial ao carregar
if (promoBadge) promoBadge.textContent = `3 itens · ${formatPrice(PRICE_PER_COMBO)}`;

// garantir estado inicial do botão continuar
updateContinueButtonState();

btnAdicionarMais.addEventListener('click', irParaMontar);
btnAddResumo.addEventListener('click', irParaMontar);

btnSalvarEndereco.addEventListener('click', () => {
  const rua = ruaInput.value.trim();
  const numero = numeroInput.value.trim();
  const bairro = bairroInput.value.trim();
  const cidade = cidadeInput.value.trim();
  const cep = cepInput.value.trim();
  const compl = complementoInput.value.trim();

  if (!rua || !numero || !bairro || !cidade || !cep) {
    alert('Preencha todos os campos obrigatórios do endereço (rua, número, bairro, cidade, CEP).');
    return;
  }

  const enderecoStr =
    `${rua}, ${numero} - ${bairro}` +
    (compl ? ` (${compl})` : '') +
    ` - ${cidade} - CEP: ${cep}`;

  enderecoSalvoText.textContent = enderecoStr;
  enderecoForm.style.display = 'none';
  enderecoSalvoBox.style.display = 'flex';
  state.addressSaved = true;
});

btnEditarEndereco.addEventListener('click', () => {
  enderecoForm.style.display = 'block';
  enderecoSalvoBox.style.display = 'none';
  state.addressSaved = false;
});

btnFinalizar.addEventListener('click', () => {
  if (state.combos.length === 0) {
    alert('Adicione pelo menos uma promoção antes de finalizar.');
    return;
  }

  if (!state.addressSaved) {
    alert('Adicione e salve o endereço antes de finalizar o pedido.');
    return;
  }

  // quantidade de combos no carrinho
  const qty = state.combos.length;

  // verifica se existe link de checkout para essa quantidade
  const checkoutUrl = checkoutLinks[qty];

  if (!checkoutUrl) {
    alert('Limite atingido. Ajuste o pedido para até 5 promoções.');
    return;
  }

  // redireciona para o checkout correto
  window.location.href = checkoutUrl;
});

atualizarCarrinhos();
