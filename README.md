# MarketDay — Ghana Marketplace

A bold, colorful storefront preview for a Ghana-based marketplace. The concept brings together independent sellers, shoppers, and promoters: sellers decide their own commission offer, and people can apply to promote products.

## Preview

This repository currently contains a static GitHub Pages prototype (`index.html`, `styles.css`, and `script.js`). It includes a responsive storefront, category filters, sample product cards, a seller commission preview, and a promoter application form.

## Important: prototype, not yet a live marketplace

GitHub Pages serves static files. In this prototype, sample commission offers and promoter applications are stored only in the visitor's browser using `localStorage`; they are not sent to the business, shared with sellers, or visible to other users. Product sharing does not create trackable referral links. There is no live checkout, account system, seller dashboard, commission settlement, or payout processing yet. Do not enter sensitive personal information in the demo form.

## What is needed for production

To accept real applications and run seller-defined promoter commissions, the next version needs a secure backend and database, seller/promoter accounts and review workflows, product and order records, consent and privacy handling, unique referral attribution, commission rules and refunds/chargeback handling, and a payment provider that can support the operating business and payouts in Ghana. Secret keys and payment credentials must be kept on the backend, never in the GitHub Pages frontend. Confirm provider availability and legal/tax requirements for Ghana before launch.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server. The site can be published with GitHub Pages from the repository's `main` branch and root folder.
