const form = document.querySelector('#seller-application-form');
const status = document.querySelector('#seller-form-status');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  status.textContent = 'This preview does not submit or save applications. No information has been sent. A secure backend and private document-upload service must be set up before accepting real seller applications.';
});
