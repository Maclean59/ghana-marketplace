const products = [...document.querySelectorAll('.product-card')];
const filters = [...document.querySelectorAll('.category')];
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

filters.forEach((button) => {
  button.addEventListener('click', () => {
    filters.forEach((filter) => filter.classList.remove('active'));
    button.classList.add('active');
    const category = button.dataset.filter;
    products.forEach((product) => {
      product.hidden = category !== 'all' && product.dataset.category !== category;
    });
  });
});

document.querySelectorAll('.share-product').forEach((button) => {
  button.addEventListener('click', async () => {
    const title = button.dataset.product;
    const seller = button.dataset.seller;
    const text = `Check out ${title} from ${seller} on MarketDay!`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        showToast('Product link copied — referral tracking is not connected yet.');
      } else {
        showToast('Referral links will be available when accounts are connected.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Sharing is unavailable in this browser.');
    }
  });
});

const rateInput = document.querySelector('#commission-rate');
const productSelect = document.querySelector('#commission-product');
const commissionSummary = document.querySelector('#commission-summary');
const samplePrices = {
  'Everyday Kente Tote': 185,
  'Sunrise Ceramic Set': 240,
  'Golden Glow Body Oil': 120,
  'Smoky Shito Trio': 95,
};

function updateCommission() {
  const rate = Math.min(80, Math.max(0, Number(rateInput.value) || 0));
  rateInput.value = rate;
  const amount = (samplePrices[productSelect.value] * rate) / 100;
  commissionSummary.textContent = `GH₵ ${amount.toFixed(2)}`;
}
rateInput.addEventListener('input', updateCommission);
productSelect.addEventListener('change', updateCommission);

const savedOffer = localStorage.getItem('marketday-sample-offer');
if (savedOffer) {
  try {
    const offer = JSON.parse(savedOffer);
    if (samplePrices[offer.product] && Number.isFinite(offer.rate)) {
      productSelect.value = offer.product;
      rateInput.value = Math.min(80, Math.max(0, offer.rate));
      updateCommission();
    }
  } catch {
    localStorage.removeItem('marketday-sample-offer');
  }
}

document.querySelector('#save-offer').addEventListener('click', () => {
  const offer = { product: productSelect.value, rate: Number(rateInput.value) };
  localStorage.setItem('marketday-sample-offer', JSON.stringify(offer));
  showToast('Sample offer saved in this browser only.');
});

const applicationDialog = document.querySelector('#application-dialog');
document.querySelector('#open-application').addEventListener('click', () => applicationDialog.showModal());
document.querySelector('#close-application').addEventListener('click', () => applicationDialog.close());
applicationDialog.addEventListener('click', (event) => {
  if (event.target === applicationDialog) applicationDialog.close();
});

document.querySelector('#application-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const application = Object.fromEntries(new FormData(form).entries());
  const applications = JSON.parse(localStorage.getItem('marketday-sample-applications') || '[]');
  applications.push({ ...application, submittedAt: new Date().toISOString() });
  localStorage.setItem('marketday-sample-applications', JSON.stringify(applications));
  document.querySelector('#form-message').textContent = 'Preview saved on this device only. It has not been sent to MarketDay.';
  form.reset();
  setTimeout(() => applicationDialog.close(), 2100);
});

updateCommission();
