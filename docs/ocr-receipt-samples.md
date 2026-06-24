# OCR Receipt Samples

This file tracks real receipt samples and the expected structured OCR output.
Use it as the source list for future parser fixtures and regression tests.

## Sample 001 - Taiwan Receipt, QSR / Drink Store

- Source: `Photo 1.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/141ef898-bed4-474a-a730-c2c48f883b64/1-Photo-1.jpg`
- Receipt language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "富利達飲(股)公司 高雄後昌門市部",
  "date": "2026-06-24",
  "time": "18:17",
  "currency": "TWD",
  "amount": 493,
  "paymentMethod": "cash",
  "cashPaid": 500,
  "change": 7,
  "invoiceNo": "BH-16200675"
}
```

### Expected Line Items

```json
[
  { "description": "青花(堡)B餐", "amount": 123 },
  { "description": "無糖綠茶(中)", "amount": 38 },
  { "description": "原味蛋撻", "amount": 49 },
  { "description": "青花(堡)XL餐", "amount": 185 },
  { "description": "薯條(中)", "amount": 11 },
  { "description": "可樂(中)", "amount": 38 },
  { "description": "A+B=$49", "amount": 49 }
]
```

### Parser Notes

- The receipt uses `$493` without `TWD` or `NT$`; do not default every `$` receipt to USD.
- Infer `TWD` when Taiwan-specific signals are present, such as invoice number, carrier code, Traditional Chinese address, telephone format, or receipt wording.
- Amount suffixes like `$123TX` should parse as amount `123` and ignore `TX` as a tax marker.
- Sub-items without a right-column amount should not become standalone expense line items.
- Exclude summary/payment rows from line items:
  - `19件小計`
  - `銷售額`
  - `合計`
  - `CASH`
  - `找零`
- Merchant extraction should avoid header labels like `銷貨明細單` and should prefer the company / branch text near the top.

### Current Desired Regression Coverage

- Parse date as `2026-06-24`.
- Parse total amount as `493`.
- Infer currency as `TWD`.
- Parse cash paid as `500` and change as `7` only as payment metadata, not expense line items.
- Extract priced food/drink rows as line items while ignoring summary rows and unpriced modifier rows.

## Sample 002 - Taiwan Cash Receipt, Service / Telecom-like Item

- Source: `Photo 1.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f2c9df44-29c4-4604-b034-44040129edce/1-Photo-1.jpg`
- Receipt language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "靖成企業 J1",
  "date": "2026-06-22",
  "time": "15:12:21",
  "currency": "TWD",
  "amount": 1000,
  "paymentMethod": "cash",
  "cashPaid": 1000,
  "serviceFee": 0,
  "orderNo": "A 0622-0171",
  "counterOrTerminal": "301"
}
```

### Expected Line Items

```json
[
  { "description": "速傳.30天", "quantity": 1, "amount": 1000 }
]
```

### Parser Notes

- Amounts may use comma grouping, such as `1,000`.
- `下午 03:12:21` should normalize to `15:12:21`.
- Infer `TWD` from Taiwan / Traditional Chinese receipt context even when no `NT$` appears.
- Exclude `小計`, `服務費`, `總計`, and `現金` from line items.
- `服務費 0` is metadata only and should not create a zero-value item.

### Current Desired Regression Coverage

- Parse date as `2026-06-22`.
- Parse total amount as `1000`.
- Infer currency as `TWD`.
- Parse one priced line item and ignore subtotal/service/payment rows.

## Sample 003 - Taoyuan Metro Proof of Travel

- Source: `Photo 2.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f2c9df44-29c4-4604-b034-44040129edce/2-Photo-2.jpg`
- Receipt language: Traditional Chinese and English
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "桃園捷運公司",
  "date": "2026-06-22",
  "time": "15:36:12",
  "currency": "TWD",
  "amount": 35,
  "description": "桃園捷運 單程票 A12機場第一航廈站",
  "cardType": "單程票",
  "cardNo": "04E2B1623F7580",
  "txLocation": "A12機場第一航廈站",
  "printedAt": "2026-06-22 15:38:36"
}
```

### Expected Line Items

```json
[
  { "description": "桃園捷運 單程票", "amount": 35 }
]
```

### Parser Notes

- `35 元` should parse as amount `35` and infer `TWD` from Taiwan context.
- Bilingual field labels appear on separate lines from values; parser should handle label/value pairs.
- Merchant should prefer `桃園捷運公司` / `Taoyuan Metro Corp.`, not `購票證明` or `Proof of travel`.
- `列印時間` is useful metadata but should not override the transaction date/time.

### Current Desired Regression Coverage

- Parse amount as `35`.
- Infer currency as `TWD`.
- Parse transaction date/time as `2026-06-22 15:36:12`.
- Avoid using printed time as the expense time when transaction time is present.

## Sample 004 - Taiwan HSR Card Transaction Slip

- Source: `Photo 3.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f2c9df44-29c4-4604-b034-44040129edce/3-Photo-3.jpg`
- Receipt language: Traditional Chinese and English
- Country / region inference: Taiwan
- Expected currency: `TWD`
- Related samples: Sample 005 and Sample 006 appear to describe the same high-speed rail purchase.

### Expected Fields

```json
{
  "merchant": "台灣高鐵",
  "date": "2026-06-22",
  "time": "16:08:08",
  "currency": "TWD",
  "amount": 1290,
  "paymentMethod": "credit_card",
  "cardBrand": "VISA",
  "cardLast4": "9338",
  "transactionType": "購票交易",
  "orderNo": "04105092",
  "authCode": "432358",
  "terminalId": "84550290",
  "status": "完成"
}
```

### Expected Line Items

```json
[]
```

### Parser Notes

- `NT $1290` should parse as amount `1290` and currency `TWD`.
- Compact date/time values should normalize: `20260622` -> `2026-06-22`, `160808` -> `16:08:08`.
- Do not parse merchant code, terminal ID, order number, auth code, batch number, or transaction sequence as amounts.
- Merchant extraction should prefer `台灣高鐵`; `台新銀行` is the acquiring bank, not the expense merchant.

### Current Desired Regression Coverage

- Parse amount as `1290`.
- Parse currency as `TWD`.
- Parse date/time from compact numeric fields.
- Exclude bank/acquirer metadata from line items.

## Sample 005 - Taiwan HSR Physical Ticket

- Source: `Photo 4.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f2c9df44-29c4-4604-b034-44040129edce/4-Photo-4.jpg`
- Receipt language: Traditional Chinese and English
- Country / region inference: Taiwan
- Expected currency: `TWD`
- Related samples: Sample 004 and Sample 006 appear to describe the same high-speed rail purchase.

### Expected Fields

```json
{
  "merchant": "台灣高鐵",
  "date": "2026-06-22",
  "currency": "TWD",
  "amount": 1290,
  "description": "台灣高鐵 桃園 -> 左營 單程票",
  "origin": "桃園",
  "destination": "左營",
  "ticketType": "單程票",
  "seatType": "限搭自由座車廂",
  "passengerType": "成人",
  "paymentMethod": "credit_card",
  "ticketNo": "04-1-05-0-173-0164"
}
```

### Expected Line Items

```json
[
  { "description": "台灣高鐵 桃園 -> 左營 單程票", "amount": 1290 }
]
```

### Parser Notes

- Ticket layouts may put the route in very large text; route should become description metadata, not merchant.
- `NT$1290` should parse as amount `1290` and currency `TWD`.
- Top date and bottom issue date both show `2026/06/22`; either can provide the expense date.
- The ticket number is long and hyphenated; do not parse it as amount.

### Current Desired Regression Coverage

- Parse amount as `1290`.
- Infer merchant/category context as transport / Taiwan HSR.
- Build a useful description from origin, destination, and ticket type.
- Detect this as likely duplicate/related to Sample 004 and Sample 006 when all are uploaded together.

## Sample 006 - E-wallet Multi-currency Payment Detail

- Source: `Photo 5.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f2c9df44-29c4-4604-b034-44040129edce/5-Photo-5.jpg`
- Screenshot language: Simplified Chinese and English
- Expected transaction currency: `TWD`
- Expected base / charged currency: `MYR`
- Related samples: Sample 004 and Sample 005 appear to describe the same high-speed rail purchase.

### Expected Fields

```json
{
  "merchant": "Taiwan High Speed Rail CoTaoyuan",
  "date": "2026-06-22",
  "time": "16:08:23",
  "currency": "TWD",
  "amount": 1290,
  "baseCurrency": "MYR",
  "baseAmount": 169.34,
  "exchangeRate": 7.61795,
  "paymentMethod": "credit_card",
  "cardBrand": "Visa",
  "cardLast4": "9338",
  "status": "成功",
  "transactionId": "346173293014066"
}
```

### Expected Line Items

```json
[
  { "description": "Payment - Taiwan High Speed Rail CoTaoyuan", "amount": 1290 }
]
```

### Parser Notes

- This is a payment detail screenshot, not a merchant receipt.
- The visible top amount `-RM169.34` is the charged/base amount; the expense source amount is `TWD 1290.00`.
- Preserve both values when possible: `amount/currency` for foreign amount and `baseAmount/baseCurrency` for actual charged amount.
- `1 MYR = 7.61795 TWD` should be parsed as exchange-rate metadata, not as an expense amount.
- Date is day/month/year: `22/06/2026 16:08:23`.
- Card number row should provide card metadata but should not become description text.

### Current Desired Regression Coverage

- Parse foreign amount as `1290 TWD`.
- Parse charged amount as `169.34 MYR`.
- Parse exchange rate as `7.61795`.
- Prefer the merchant row over payment-detail text for merchant when both are present.
- Detect this as likely duplicate/related to Sample 004 and Sample 005 when all are uploaded together.

## Sample 007 - Kaohsiung Metro Stored Value Top-up Receipt

- Source: `Photo 1.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/b83dd89e-d03d-45b4-be61-09c43d358948/1-Photo-1.jpg`
- Receipt language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "高雄捷運",
  "date": "2026-06-24",
  "time": "19:00:54",
  "currency": "TWD",
  "amount": 500,
  "description": "高雄捷運 悠遊卡加值 R17 世運",
  "station": "R17 世運",
  "deviceNo": "203",
  "cardCompany": "悠遊卡",
  "cardType": "普通卡",
  "cardNo": "4118E192000000",
  "balanceBefore": 207,
  "balanceAfter": 707
}
```

### Expected Line Items

```json
[
  { "description": "悠遊卡加值", "amount": 500 }
]
```

### Parser Notes

- This is a stored-value top-up receipt; the expense amount is `本次加值`, not `加值前卡片金額` or `加值後卡片金額`.
- `207元` and `707元` are balance metadata and must not be treated as candidate totals.
- Infer `TWD` from Taiwan transit context and `元`.
- The photo includes large background content; receipt crop / foreground detection matters for OCR quality.

### Current Desired Regression Coverage

- Parse top-up amount as `500`.
- Parse date/time as `2026-06-24 19:00:54`.
- Preserve before/after balances as metadata only.
- Prefer `高雄捷運` as merchant and build description from card top-up context.

## Sample 008 - Kaohsiung Metro Stored Value Top-up Receipt

- Source: `Photo 2.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/b83dd89e-d03d-45b4-be61-09c43d358948/2-Photo-2.jpg`
- Receipt language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "高雄捷運",
  "date": "2026-06-24",
  "time": "19:00:02",
  "currency": "TWD",
  "amount": 400,
  "description": "高雄捷運 悠遊卡加值 R17 世運",
  "station": "R17 世運",
  "deviceNo": "203",
  "cardCompany": "悠遊卡",
  "cardType": "普通卡",
  "cardNo": "511F4293000000",
  "balanceBefore": 60,
  "balanceAfter": 460
}
```

### Expected Line Items

```json
[
  { "description": "悠遊卡加值", "amount": 400 }
]
```

### Parser Notes

- Same layout as Sample 007 but different card number and top-up amount.
- The moving train/background should not affect OCR target selection.
- `加值前卡片金額` and `加值後卡片金額` are balances, not expense totals.

### Current Desired Regression Coverage

- Parse top-up amount as `400`.
- Parse date/time as `2026-06-24 19:00:02`.
- Do not choose `460` as amount even though it is the last amount on the receipt.

## Sample 009 - Malaysia Restaurant Receipt With Tax And Rounding

- Source: `Photo 3.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/b83dd89e-d03d-45b4-be61-09c43d358948/3-Photo-3.jpg`
- Receipt language: English / Malay item names
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "RESTORAN HABIB SDN BHD",
  "date": "2026-06-18",
  "time": "23:51:00",
  "currency": "MYR",
  "amount": 96.80,
  "subtotal": 90.40,
  "taxRate": 6,
  "taxAmount": 5.43,
  "rounding": -0.03,
  "paymentMethod": "cash",
  "cashPaid": 96.85,
  "change": 0.05,
  "tableNo": "B5",
  "transactionNo": "453139"
}
```

### Expected Line Items

```json
[
  { "description": "Extra Joss Anggur", "quantity": 1, "amount": 3.80 },
  { "description": "Teh O Limau Ais", "quantity": 1, "amount": 2.50 },
  { "description": "Teh O Limau Ais", "quantity": 2, "amount": 5.00 },
  { "description": "Orange Mega", "quantity": 1, "amount": 11.80 },
  { "description": "Teh O Limau Ais", "quantity": 1, "amount": 2.50 },
  { "description": "Coca Cola Tin", "quantity": 1, "amount": 2.90 },
  { "description": "Teh O", "quantity": 1, "amount": 1.60 },
  { "description": "Nasi Goreng", "quantity": 1, "amount": 5.50 },
  { "description": "Ayam Goreng", "quantity": 1, "amount": 5.30 },
  { "description": "Nasi G Pattaya", "quantity": 1, "amount": 7.00 },
  { "description": "Roti Tampal", "quantity": 2, "amount": 6.00 },
  { "description": "Maggi Goreng", "quantity": 1, "amount": 7.00 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 10.00 },
  { "description": "Maggi Sup", "quantity": 1, "amount": 7.50 },
  { "description": "Bihun Goreng", "quantity": 1, "amount": 5.50 },
  { "description": "Maggi Goreng", "quantity": 1, "amount": 7.00 },
  { "description": "Teh O Limau Ais", "quantity": 1, "amount": 2.50 }
]
```

### Parser Notes

- The printed `-Z` suffix after each item amount is a tax code marker, not a negative amount.
- Item modifiers such as `Add Telur Mata`, `Add Maggi Pkt`, and `Tp Add Telur M` have no visible amount and should not become standalone items.
- `TOTAL` is subtotal before SST; `NET TOTAL` is the expense amount to use.
- `SST 6%`, `ROUNDING`, `CASH`, and `CHANGE` should be metadata/payment rows, not line items.
- Quantity is printed in a separate left column; parser should keep quantity when available.

### Current Desired Regression Coverage

- Parse net total as `96.80 MYR`.
- Parse subtotal, SST, rounding, cash, and change separately.
- Extract 17 priced line items and ignore zero/unpriced modifiers.
- Preserve repeated item names as separate rows when they are separate receipt lines.

## Sample 010 - Taiwan Court Payment Proof, Handwritten Amount

- Source: `Photo 4.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/b83dd89e-d03d-45b4-be61-09c43d358948/4-Photo-4.jpg`
- Receipt language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "臺灣橋頭地方法院",
  "date": "2026-06-11",
  "currency": "TWD",
  "amount": 10,
  "description": "臺灣橋頭地方法院 狀紙 / 影印",
  "receiptNo": "002563",
  "feeType": "狀紙 / 影印",
  "paymentMethod": "cash"
}
```

### Expected Line Items

```json
[
  { "description": "狀紙 / 影印", "amount": 10 }
]
```

### Parser Notes

- ROC date `115.6.11` should normalize to `2026-06-11`.
- The amount appears handwritten as `10`; OCR may confuse it with stamps or form grid text.
- Merchant should come from the document title, not from the stamped staff names.
- Fee type is circled and handwritten; parser should tolerate form-style layouts.

### Current Desired Regression Coverage

- Parse handwritten amount as `10 TWD` when possible.
- Parse ROC date correctly.
- Avoid treating receipt number `002563` as an amount.

## Sample 011 - Taiwan Court Official Receipt

- Source: `Photo 5.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/b83dd89e-d03d-45b4-be61-09c43d358948/5-Photo-5.jpg`
- Receipt language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": "臺灣橋頭地方法院",
  "date": "2026-06-11",
  "time": "14:53:59",
  "currency": "TWD",
  "amount": 750,
  "description": "臺灣橋頭地方法院 公證費",
  "receiptNo": "0591497",
  "payer": "JACKSON ANG",
  "incomeCategory": "規費收入",
  "feeType": "公證費",
  "paymentMethod": "cash"
}
```

### Expected Line Items

```json
[
  { "description": "公證費", "amount": 750 }
]
```

### Parser Notes

- ROC date `115年06月11日` should normalize to `2026-06-11`.
- Amount appears in Chinese uppercase and masked numeric format: `柒佰伍拾元整` and `NT$***************750.00`.
- `0.00` in the stamp/form area should not override the actual amount.
- `繳費方法: 現金` should set payment method metadata.
- Receipt number and case number are long numeric fields and should not become amounts.

### Current Desired Regression Coverage

- Parse amount as `750 TWD` from either Chinese uppercase amount or masked `NT$...750.00`.
- Parse date/time as `2026-06-11 14:53:59`.
- Prefer merchant/title as `臺灣橋頭地方法院`.
- Ignore stamp/form artifacts such as `0.00`.

## Sample 012 - Malaysia Restaurant Receipt, E-wallet Payment

- Source: `Photo 1.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3b5a45a2-de48-401a-8356-c6fe182d27f4/1-Photo-1.jpg`
- Receipt language: English
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "Oriental Kopi",
  "date": "2026-06-16",
  "time": "12:39:00",
  "currency": "MYR",
  "amount": 77.50,
  "subtotal": 77.50,
  "taxAmount": 4.39,
  "taxableAmount": 73.11,
  "paymentMethod": "e_wallet",
  "tableNo": "66",
  "invoiceNo": "TT02-CS01/138829",
  "orderNo": "ODA103452",
  "cover": 1,
  "cashier": "BABURAM"
}
```

### Expected Line Items

```json
[
  { "description": "Hong Kong Fried Noodle", "quantity": 1, "amount": 13.50 },
  { "description": "Plain Water - Ice", "quantity": 1, "amount": 0.60 },
  { "description": "Fried Nasi Kampung", "quantity": 1, "amount": 14.50 },
  { "description": "Plain Water - Ice", "quantity": 1, "amount": 0.60 },
  { "description": "Mee Rebus With Otak-Otak", "quantity": 1, "amount": 13.50 },
  { "description": "Up Size", "quantity": 1, "amount": 1.80 },
  { "description": "Mee Siam With Otak-Otak", "quantity": 1, "amount": 0.00 },
  { "description": "Fried Nasi Kampung", "quantity": 1, "amount": 14.50 },
  { "description": "Add Fried Rice", "quantity": 1, "amount": 2.80 },
  { "description": "Fresh Soya+Cincau - Ice", "quantity": 1, "amount": 5.00 },
  { "description": "Mee Rebus", "quantity": 1, "amount": 8.90 },
  { "description": "Up Size", "quantity": 1, "amount": 1.80 }
]
```

### Parser Notes

- The visible merchant header is partly cropped; infer merchant from address / known receipt style only when OCR text supports it.
- `Net Total` is the final expense amount.
- `E-Wallet 77.50` is payment metadata, not another line item.
- Free / discount rows such as `Free Mee Siam (13.70-13.70)[100%]` and promo code rows should not inflate line items.
- Some modifiers have prices and should remain line items, such as `UP SIZE 1.80` and `ADD FRIED RICE 2.80`.
- Tax summary appears after payment; it should not override the final amount.

### Current Desired Regression Coverage

- Parse net total as `77.50 MYR`.
- Keep e-wallet as payment method metadata.
- Exclude free promo rows and QR code content.
- Preserve paid modifiers as line items.

## Sample 013 - Malaysia Noodle Restaurant Receipt, Touch'n Go Payment

- Source: `Photo 2.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3b5a45a2-de48-401a-8356-c6fe182d27f4/2-Photo-2.jpg`
- Receipt language: English / Chinese item names
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "PANDAN NOODLE'S SDN BHD",
  "date": "2026-06-12",
  "time": "12:42:00",
  "currency": "MYR",
  "amount": 102.60,
  "subtotal": 93.30,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "TOUCHNGO",
  "tableNo": "05",
  "receiptNo": "CS00230137",
  "totalQty": 7,
  "change": 0.00
}
```

### Expected Line Items

```json
[
  { "description": "Wantan Noodle Normal 招牌云吞面", "quantity": 1, "amount": 9.90 },
  { "description": "Curry Mee 咖喱面", "quantity": 1, "amount": 11.90 },
  { "description": "Fried Wantan 炸云吞 (set)", "quantity": 1, "amount": 20.90 },
  { "description": "Wantan Noodle Normal 招牌云吞面", "quantity": 1, "amount": 9.90 },
  { "description": "Dry Curry Noodles 干捞咖喱面", "quantity": 1, "amount": 11.90 },
  { "description": "Wantan Noodles Normal Set", "quantity": 1, "amount": 16.90 },
  { "description": "Double Eggs Noodles 蛋面", "quantity": 1, "amount": 11.90 }
]
```

### Parser Notes

- Some values are low contrast and partially hidden by paper folds; OCR may need contrast normalization.
- `TOTAL` / `TOUCHNGO` / `CHANGE` rows are summary/payment rows.
- `SVR CHARGE` and `ROUNDING` should be metadata, not line items.
- The receipt prints item code and item name across nearby lines; parser should join them where possible.
- Date appears as `12/06/20..`; expected year is 2026 from the sample batch context, but parser should prefer a fully visible year when available.

### Current Desired Regression Coverage

- Parse total as `102.60 MYR`.
- Parse payment method as Touch'n Go e-wallet.
- Extract 7 item rows and keep Chinese/English mixed descriptions.
- Do not pick subtotal `93.30` as the final amount.

## Sample 014 - CAM Tea & Ember Cafe Receipt

- Source: `Photo 3.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3b5a45a2-de48-401a-8356-c6fe182d27f4/3-Photo-3.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "CAM Tea & Ember Cafe",
  "date": "2026-06-23",
  "time": "12:22:58",
  "currency": "MYR",
  "amount": 54.40,
  "subtotal": 54.40,
  "taxAmount": 0.00,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "MAE",
  "orderNo": "00004/1",
  "receiptNo": "000013181",
  "cashier": "Lynn",
  "tableNo": "7"
}
```

### Expected Line Items

```json
[
  { "description": "滑蛋Beef益盖饭", "quantity": 8, "amount": 54.40 }
]
```

### Parser Notes

- Quantity appears as `8` at the start of the item row; parser should not treat it as an amount.
- `Tax 0.00` should not become a line item or override the total.
- `MAE 54.40` is payment metadata.
- Printed time after `[PAID]` is print time and should not override the order open time unless transaction time is missing.

### Current Desired Regression Coverage

- Parse total as `54.40 MYR`.
- Extract the single priced item with quantity `8`.
- Set payment method name to `MAE` when available.

## Sample 015 - Koi Thé Malaysia Receipt

- Source: `Photo 4.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3b5a45a2-de48-401a-8356-c6fe182d27f4/4-Photo-4.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "Koi Thé",
  "date": "2026-06-23",
  "time": "13:07:28",
  "currency": "MYR",
  "amount": 56.20,
  "subtotal": 53.02,
  "taxRate": 6,
  "taxAmount": 3.18,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "DuitNow",
  "terminal": "JBC007",
  "cashier": "SOFEA",
  "ticketNo": "09"
}
```

### Expected Line Items

```json
[
  { "description": "M-Milk Tea", "quantity": 1, "amount": 13.60 },
  { "description": "Bubble", "quantity": 1, "amount": 2.30 },
  { "description": "M-Yuzu Honey Oolong T", "quantity": 1, "amount": 15.30 },
  { "description": "Bubble", "quantity": 1, "amount": 2.30 },
  { "description": "M-Peach Oolong Tea", "quantity": 1, "amount": 11.30 },
  { "description": "M-Orh Nee Fresh Milk", "quantity": 1, "amount": 16.00 }
]
```

### Parser Notes

- Item rows can contain base price and final line price on the same row; use the rightmost final price as item amount.
- Add-ons such as `Bubble 1X @ 2.30` are priced line items and should be retained.
- Sugar / ice preferences such as `25%`, `70%`, and `Less Ice` are modifiers without amount and should attach to nearby items or be ignored.
- `SST 6%` and `DuitNow` are summary/payment metadata.
- Website and QR content at the bottom should be ignored.

### Current Desired Regression Coverage

- Parse total as `56.20 MYR`.
- Parse SST as `3.18`.
- Extract base drinks and paid add-ons while ignoring unpriced preferences.
- Use `DuitNow` as payment method metadata.

## Sample 016 - Malaysia Dry Mee Hun Receipt

- Source: `Photo 5.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3b5a45a2-de48-401a-8356-c6fe182d27f4/5-Photo-5.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "XC MEE HUN KUIH SDN BHD",
  "date": "2026-06-18",
  "time": "12:19:00",
  "currency": "MYR",
  "amount": 74.20,
  "subtotal": 70.00,
  "taxRate": 6,
  "taxAmount": 4.20,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "MAYBANK QR",
  "invoiceNo": "14954",
  "tableNo": "T19",
  "cashier": "KULOW"
}
```

### Expected Line Items

```json
[
  { "description": "F1 Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "F0 Spicy Version Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "F0 Spicy Version Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "F0 Spicy Version Traditional Dry Mee Hun Kuih + Half Noodles", "quantity": 1, "amount": 14.90 },
  { "description": "MD01 Kopi (O/C) (Kopi, Cold)", "quantity": 1, "amount": 4.50 },
  { "description": "F5 Dry Tomato Mee Hun Kuih", "quantity": 1, "amount": 11.90 }
]
```

### Parser Notes

- Header says `Price (MYR)`, so currency is explicit.
- Item descriptions span multiple lines and include Chinese options; parser should join continuation lines.
- Options such as `Thin`, `No Ikan Bilis`, and `Half Noodles + 2.00` should attach to the parent item. The visible final item amount already includes the option price.
- `SERVICE CHARGE (6%)`, `Bill rounding`, `MAYBANK QR`, and `Change` are summary/payment rows.
- The line `6 Qty` is item count metadata, not an item.

### Current Desired Regression Coverage

- Parse total as `74.20 MYR`.
- Parse service charge as `4.20`.
- Extract 6 priced items and keep multi-line descriptions.
- Do not create separate line items for option/modifier rows unless they carry their own standalone amount.

## Sample 017 - Malaysia Dry Mee Hun Receipt, Duplicate Photos

- Source: `Photo 1.jpg` and `Photo 2.jpg`, provided through Codex attachment on 2026-06-24.
- Image paths at capture time:
  - `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3490f501-9e6f-4498-ab7a-63a80c158679/1-Photo-1.jpg`
  - `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3490f501-9e6f-4498-ab7a-63a80c158679/2-Photo-2.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`
- Duplicate note: the two source images appear to be the same receipt.

### Expected Fields

```json
{
  "merchant": "XC MEE HUN KUIH SDN BHD",
  "date": "2026-05-27",
  "time": "12:21:00",
  "currency": "MYR",
  "amount": 89.20,
  "subtotal": 84.20,
  "taxRate": 6,
  "taxAmount": 4.99,
  "rounding": 0.01,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "MAYBANK QR",
  "invoiceNo": "12696",
  "tableNo": "T9",
  "cashier": "KJLOW",
  "tablePax": 6
}
```

### Expected Line Items

```json
[
  { "description": "F1 Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "D9 Mineral Water (Cold)", "quantity": 2, "amount": 1.00 },
  { "description": "F1 Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "F0 Spicy Version Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "F1 Traditional Dry Mee Hun Kuih + Half Noodles", "quantity": 1, "amount": 14.90 },
  { "description": "F1 Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "F1 Traditional Dry Mee Hun Kuih", "quantity": 1, "amount": 12.90 },
  { "description": "D1 Herbal Drink (Cold)", "quantity": 1, "amount": 3.80 }
]
```

### Parser Notes

- This sample is a duplicate-photo case; duplicate images should not create two expenses without user confirmation.
- Header says `Price (MYR)`, so currency is explicit.
- Parent item descriptions span multiple lines; option rows such as `Thin`, `No Ikan Bilis`, and `Half Noodles + 2.00` should attach to parent items.
- The final item amount already includes priced options such as `Half Noodles + 2.00`.
- `SERVICE CHARGE (6%)`, `Bill rounding`, `MAYBANK QR`, and `Change` are metadata/payment rows.

### Current Desired Regression Coverage

- Parse total as `89.20 MYR`.
- Parse service charge as `4.99` and rounding as `0.01`.
- Extract 8 priced receipt rows representing 9 quantity units.
- Detect duplicate images when the same receipt is uploaded twice.

## Sample 018 - The Toast / Oriental Kopi-style Restaurant Receipt

- Source: `Photo 3.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3490f501-9e6f-4498-ab7a-63a80c158679/3-Photo-3.jpg`
- Receipt language: English
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "The Toast F&B Sdn Bhd",
  "date": "2026-06-03",
  "time": "12:52:00",
  "currency": "MYR",
  "amount": 87.40,
  "subtotal": 87.40,
  "taxableAmount": 82.45,
  "taxAmount": 4.95,
  "paymentMethod": "e_wallet",
  "invoiceNo": "TT02-CS01/131902",
  "tableNo": "56",
  "cover": 1,
  "cashier": "HERLAN"
}
```

### Expected Line Items

```json
[
  { "description": "Hong Kong Fried Noodle", "quantity": 1, "amount": 13.50 },
  { "description": "Plain Water - Ice", "quantity": 1, "amount": 0.60 },
  { "description": "Mee Rebus With Otak-Otak", "quantity": 1, "amount": 13.50 },
  { "description": "Up Size", "quantity": 1, "amount": 1.80 },
  { "description": "Plain Water - Ice", "quantity": 1, "amount": 0.60 },
  { "description": "Tomyam Fried Soh Hoon", "quantity": 1, "amount": 14.50 },
  { "description": "Nasi Lemak With Otak-Otak", "quantity": 1, "amount": 13.70 },
  { "description": "Half Boiled Egg (2 pcs)", "quantity": 1, "amount": 4.20 },
  { "description": "Nasi Lemak With Fried Chicken Meat", "quantity": 1, "amount": 13.70 },
  { "description": "Mee Rebus", "quantity": 1, "amount": 8.90 },
  { "description": "Up Size", "quantity": 1, "amount": 1.80 },
  { "description": "Plain Water - Warm", "quantity": 1, "amount": 0.60 }
]
```

### Parser Notes

- The merchant/header area is partly obscured and receipt text can bleed through from the back side.
- `Net Total` is the expense amount; `E-Wallet 87.40` is payment metadata.
- Tax summary appears after payment; do not choose tax/taxable values as amount.
- Paid modifiers such as `UP SIZE 1.80` should remain line items.
- QR/e-invoice URL text should be ignored.

### Current Desired Regression Coverage

- Parse total as `87.40 MYR`.
- Parse tax as `4.95` and taxable amount as `82.45`.
- Extract paid modifiers and normal items while ignoring QR and e-invoice footer text.

## Sample 019 - BGC Noodle Johor Jaya Receipt

- Source: `Photo 4.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3490f501-9e6f-4498-ab7a-63a80c158679/4-Photo-4.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "BGC NOODLE (JOHOR JAYA)",
  "date": "2026-06-09",
  "time": "12:16:00",
  "currency": "MYR",
  "amount": 114.80,
  "subtotal": 104.40,
  "taxRate": 10,
  "taxAmount": 10.44,
  "rounding": -0.04,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "TOUCH N GO",
  "invoiceNo": "31616",
  "orderNo": "08",
  "cashier": "admin",
  "tablePax": 1
}
```

### Expected Line Items

```json
[
  { "description": "Build ur own bowl", "quantity": 1, "amount": 15.50 },
  { "description": "Signature Pork Noodle (No Haslet, Soup)", "quantity": 1, "amount": 13.50 },
  { "description": "Signature Pork Noodle (With Haslet, Soup)", "quantity": 1, "amount": 13.50 },
  { "description": "Signature Pork Noodle (With Haslet, Kering)", "quantity": 1, "amount": 14.50 },
  { "description": "Wantan mee (black/white)", "quantity": 1, "amount": 9.90 },
  { "description": "Fresh Sugarcan Juice", "quantity": 1, "amount": 3.50 },
  { "description": "Lemon Tea (Cold)", "quantity": 1, "amount": 3.70 },
  { "description": "Signature Pork Noodle (With Haslet, Kering)", "quantity": 1, "amount": 14.50 },
  { "description": "Build ur own bowl", "quantity": 1, "amount": 15.00 },
  { "description": "Sky juice (Ice)", "quantity": 1, "amount": 0.80 }
]
```

### Parser Notes

- Build-your-own bowl options are multi-line modifiers; some modifiers have prices but should attach to the bowl when the parent final price already reflects them.
- The right-column parent line amount should define each parent item total.
- `SERVICE CHARGE (10%)`, `Bill rounding`, `TOUCH N GO`, and `Change` are metadata/payment rows.
- Item continuation rows contain mixed Chinese/English text and plus signs; avoid creating separate items for each option line.

### Current Desired Regression Coverage

- Parse total as `114.80 MYR`.
- Parse service charge as `10.44` and rounding as `-0.04`.
- Extract 10 parent item rows and avoid over-splitting modifiers.

## Sample 020 - Cropped Malaysia Noodle Receipt, Missing Merchant Header

- Source: `Photo 5.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/3490f501-9e6f-4498-ab7a-63a80c158679/5-Photo-5.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": null,
  "date": "2026-06-04",
  "time": "12:42:00",
  "currency": "MYR",
  "amount": 87.70,
  "subtotal": 82.80,
  "discount": -0.05,
  "taxRate": 6,
  "taxAmount": 4.96,
  "rounding": -0.01,
  "paymentMethod": "e_wallet",
  "receiptNo": "76335",
  "closedBy": "JANE CHING",
  "tableNo": "31",
  "itemCount": 14
}
```

### Expected Line Items

```json
[
  { "description": "Tomyam Dry YM (Youmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Dry PM (Panmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Air Bungar Hot", "quantity": 1, "amount": 2.00 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Dry YM (Youmee)", "quantity": 1, "amount": 8.90 },
  { "description": "Tomyam Dry PM (Panmee)", "quantity": 1, "amount": 10.90 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Soup YM (Youmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Chilli PM (Panmee)", "quantity": 2, "amount": 21.80 },
  { "description": "Air Bungar Ice", "quantity": 1, "amount": 2.50 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Add on 加料 RM1", "quantity": 1, "amount": 1.00 }
]
```

### Parser Notes

- The merchant/header is cropped out; parser should still return amount/date/items and leave merchant empty.
- `Final Amount(MYR)` is the final expense amount; `Amount 87.71` before rounding is not final.
- The receipt has `Total discount`, `Service Charge(6%)`, `Amount`, `Rounding`, and `Final Amount`; parser should preserve these separately.
- Item modifiers such as `No Ikan Bilis`, `Less Sweet`, `Less Ice`, and `100% Egg` should attach to parent items or be ignored.
- `Item count: 14` is item-count metadata, not an expense amount.

### Current Desired Regression Coverage

- Parse final amount as `87.70 MYR`.
- Parse subtotal, discount, service charge, and rounding separately.
- Work when merchant is missing/cropped.
- Extract 13 priced rows representing 14 quantity units.

## Sample 021 - Cropped Restaurant Invoice, Touch'n Go Payment

- Source: `Photo 1.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f179a2c2-1aa1-4e46-80f9-280ef30617e6/1-Photo-1.jpg`
- Receipt language: English
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": null,
  "date": "2026-05-28",
  "time": "12:56:32",
  "currency": "MYR",
  "amount": 63.55,
  "subtotal": 54.80,
  "serviceChargeRate": 10,
  "serviceCharge": 5.48,
  "taxRate": 6,
  "taxAmount": 3.29,
  "rounding": -0.02,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "Touch N Go",
  "tableNo": "5",
  "invoiceNo": "POS1341170",
  "orderNo": "ONL10650",
  "server": "QR",
  "cashier": "CheeMun"
}
```

### Expected Line Items

```json
[
  { "description": "Tanuki Udon", "amount": 8.80 },
  { "description": "Seafood Fried Rice", "amount": 4.80 },
  { "description": "Genmaicha Hot", "amount": 1.00 },
  { "description": "Garlic Fried Rice", "amount": 3.80 },
  { "description": "Genmaicha Cold", "amount": 1.00 },
  { "description": "Garlic Fried Rice", "amount": 3.80 },
  { "description": "Genmaicha Cold", "amount": 1.00 },
  { "description": "Sushi 1.80", "amount": 5.40 },
  { "description": "Sushi 2.80", "amount": 25.20 }
]
```

### Parser Notes

- The merchant/header is cropped out; parser should still return amount/date/items and leave merchant empty.
- Currency is not printed near the total; infer `MYR` from Malaysia payment context and Touch'n Go.
- The rightmost `D` after item amounts is a tax/status marker, not currency or description.
- `TOTAL 63.55` is final amount; `Touch N Go 63.55` is payment metadata.
- Service charge, tax, and rounding should be preserved separately.

### Current Desired Regression Coverage

- Parse final amount as `63.55 MYR`.
- Parse service charge, tax, and rounding separately.
- Work when merchant is missing/cropped.
- Ignore QR code/footer text.

## Sample 022 - Restoran Sing Ting Cash Receipt

- Source: `Photo 2.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f179a2c2-1aa1-4e46-80f9-280ef30617e6/2-Photo-2.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "RESTORAN SING TING",
  "date": "2026-05-21",
  "currency": "MYR",
  "amount": 106.90,
  "subtotal": 106.90,
  "rounding": 0.00,
  "paymentMethod": "cash",
  "tableNo": "17",
  "billNo": "388438",
  "cashier": "supervisor",
  "pax": 0,
  "totalQty": 12,
  "typeCount": 7
}
```

### Expected Line Items

```json
[
  { "description": "面粉粿(汤)", "quantity": 1, "amount": 12.00 },
  { "description": "面粉粿(汤)", "quantity": 1, "amount": 12.00 },
  { "description": "面粉粿(汤)", "quantity": 1, "amount": 10.00 },
  { "description": "面粉粿(干)", "quantity": 1, "amount": 12.00 },
  { "description": "面粉粿(干)", "quantity": 1, "amount": 10.00 },
  { "description": "手工面(干)", "quantity": 1, "amount": 10.00 },
  { "description": "手工面(干)", "quantity": 1, "amount": 10.00 },
  { "description": "古早味卤肉饭", "quantity": 1, "amount": 16.90 },
  { "description": "酸甘酸梅", "quantity": 1, "amount": 3.50 },
  { "description": "苦子酸梅", "quantity": 2, "amount": 7.00 },
  { "description": "小麦草", "quantity": 1, "amount": 3.50 }
]
```

### Parser Notes

- Item descriptions and modifiers are low contrast; OCR may need contrast normalization.
- The receipt uses both `MYR106.90` and summary lines; choose `TOTAL` / `Grand SubTotal` final amount, not repeated `CASH` row.
- Modifier lines such as `X`, `XIK`, `BB`, and `大` should attach to the parent item or be ignored.
- `Type: 7` and total quantity `12` are metadata, not item rows.

### Current Desired Regression Coverage

- Parse total as `106.90 MYR`.
- Parse cash payment without double-counting `CASH MYR106.90`.
- Extract Chinese item rows and ignore short modifier-only rows.

## Sample 023 - Restoran Osman JB Receipt With Payment Label Conflict

- Source: `Photo 3.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f179a2c2-1aa1-4e46-80f9-280ef30617e6/3-Photo-3.jpg`
- Receipt language: English / Malay item names
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "RESTORAN OSMAN JB SDN BHD",
  "date": "2026-05-15",
  "time": "22:27:55",
  "currency": "MYR",
  "amount": 112.15,
  "subtotal": 105.80,
  "taxRate": 6,
  "taxAmount": 6.35,
  "rounding": 0.00,
  "paymentMethod": "credit_card",
  "paymentMethodRaw": "BANK CARD / CASH printed conflict",
  "tableNo": "H9",
  "transactionNo": "819260",
  "taxNo": "716684"
}
```

### Expected Line Items

```json
[
  { "description": "Lemon Ice T", "quantity": 1, "amount": 3.00 },
  { "description": "Teh O Ais Limau Take", "quantity": 3, "amount": 8.10 },
  { "description": "Teh O Limau", "quantity": 1, "amount": 2.10 },
  { "description": "Limau Ais (take Away)", "quantity": 2, "amount": 5.00 },
  { "description": "Teh O Ais (take Away)", "quantity": 1, "amount": 2.30 },
  { "description": "Maggi Sup Double", "quantity": 1, "amount": 8.00 },
  { "description": "Ayam Goreng", "quantity": 1, "amount": 5.00 },
  { "description": "Maggi G Double Ayam", "quantity": 1, "amount": 13.00 },
  { "description": "N G Pata", "quantity": 1, "amount": 9.00 },
  { "description": "Naan Cheese", "quantity": 1, "amount": 8.00 },
  { "description": "Maggi G Mamak", "quantity": 1, "amount": 7.00 },
  { "description": "Maggi Sup Mamak", "quantity": 1, "amount": 5.00 },
  { "description": "R T", "quantity": 1, "amount": 2.80 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 9.80 },
  { "description": "Nasi Goreng China", "quantity": 1, "amount": 7.00 },
  { "description": "Limau Ais", "quantity": 1, "amount": 2.20 },
  { "description": "Maggi Goreng Telur M", "quantity": 1, "amount": 8.50 }
]
```

### Parser Notes

- The header says `BANK CARD`, but the payment summary row says `CASH RM 112.15`; preserve raw payment conflict and prefer card only if `BANK CARD` is treated as the authoritative tender label.
- Printed `-T` suffix after item amounts is a tax marker, not negative value.
- `TOTAL` is before service tax; `NET TOTAL` is the final expense amount.
- `SERV. TAX 6%`, `ROUNDING`, `CASH`, and `CHANGE` are metadata/payment rows.
- Blue/purple image tint may affect OCR binarization.

### Current Desired Regression Coverage

- Parse net total as `112.15 MYR`.
- Parse tax as `6.35`.
- Detect tender label conflict without dropping the amount.
- Extract Malay item rows and ignore `-T` suffixes.

## Sample 024 - Taiwan Online Food Order Screenshot, LINE PAY

- Source: `Photo 4.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f179a2c2-1aa1-4e46-80f9-280ef30617e6/4-Photo-4.jpg`
- Screenshot language: Traditional Chinese
- Country / region inference: Taiwan
- Expected currency: `TWD`

### Expected Fields

```json
{
  "merchant": null,
  "date": "2026-05-04",
  "time": "15:19:00",
  "orderTime": "2026-05-04 15:14:00",
  "currency": "TWD",
  "amount": 520,
  "subtotal": 520,
  "paymentMethod": "e_wallet",
  "paymentMethodName": "LINE PAY",
  "diningMode": "內用",
  "tableNo": "7"
}
```

### Expected Line Items

```json
[
  { "description": "士林站林家蔥抓餅加蛋", "quantity": 2, "amount": 110 },
  { "description": "士林站林家蔥抓餅加蛋", "quantity": 1, "amount": 55 },
  { "description": "士林站林家蔥抓餅不加蛋", "quantity": 1, "amount": 40 },
  { "description": "蜜芋頭豆花", "quantity": 1, "amount": 65 },
  { "description": "最愛鮮奶嫩豆花", "quantity": 1, "amount": 85 },
  { "description": "古味豆花", "quantity": 1, "amount": 70 },
  { "description": "士林站林家蔥抓餅加蛋", "quantity": 1, "amount": 55 },
  { "description": "士林站林家蔥抓餅不加蛋", "quantity": 1, "amount": 40 }
]
```

### Parser Notes

- This is an app screenshot, not a printed receipt.
- Currency is explicit per line item as `NT$`.
- Options/modifiers appear as grey subtext under each item and should attach to the parent item, not become separate line items.
- `小計` and `總計` both equal `NT$520`; choose total amount once.
- Merchant is not visible in the screenshot; parser should leave it empty.

### Current Desired Regression Coverage

- Parse total as `520 TWD`.
- Parse payment method as paid `LINE PAY`.
- Extract item quantities and NT$ amounts from app-style layout.
- Work when merchant is missing from screenshot crop.

## Sample 025 - Cropped Malaysia Panmee Receipt, E-wallet Payment

- Source: `Photo 5.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/f179a2c2-1aa1-4e46-80f9-280ef30617e6/5-Photo-5.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": null,
  "date": "2026-04-30",
  "time": "12:49:00",
  "currency": "MYR",
  "amount": 121.90,
  "subtotal": 115.00,
  "discount": 0.00,
  "taxRate": 6,
  "taxAmount": 6.90,
  "rounding": 0.00,
  "paymentMethod": "e_wallet",
  "receiptNo": "73478",
  "closedBy": "Jordan",
  "tableNo": "12",
  "itemCount": 15
}
```

### Expected Line Items

```json
[
  { "description": "Mala Dry PM (Panmee)", "quantity": 1, "amount": 10.90 },
  { "description": "Cincao Ice", "quantity": 2, "amount": 3.00 },
  { "description": "Dry YM (Youmee)", "quantity": 2, "amount": 19.80 },
  { "description": "Mala Dry PM (Panmee)", "quantity": 1, "amount": 10.90 },
  { "description": "Tomyam Dry PM (Panmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Chilli PM (Panmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Hakka YM (Youmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Air Bungar Hot", "quantity": 1, "amount": 2.00 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Dry Curry Chicken YM (Youmee)", "quantity": 1, "amount": 14.90 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Chilli PM (Panmee)", "quantity": 1, "amount": 10.90 },
  { "description": "Chilli PM (Panmee)", "quantity": 1, "amount": 9.90 }
]
```

### Parser Notes

- The merchant/header is cropped out; parser should still return amount/date/items and leave merchant empty.
- `Final Amount(MYR)` is the final expense amount.
- `Amount 121.90`, `Payment received 121.90`, and final amount all repeat the same value; record the expense amount once.
- Modifier rows such as `Less Spicy`, `No Ikan Bilis`, `Less Sweet`, `Less Ice`, and `Add Spicy` should attach to parent items or be ignored.
- `Item count: 15`, `Subtotal`, `Total discount`, `Service Charge(6%)`, `Amount`, `Rounding`, `Payment method`, `Payment received`, and `Change` are metadata/summary rows.

### Current Desired Regression Coverage

- Parse final amount as `121.90 MYR`.
- Parse service charge as `6.90`.
- Work when merchant is missing/cropped.
- Extract 13 priced rows representing 15 quantity units.

## Sample 026 - Yit Foh Noodles House Receipt

- Source: `Photo 1.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/e65dfe60-c83b-45ce-8238-e8163669048d/1-Photo-1.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "Yit Foh Noodles House",
  "date": "2026-04-17",
  "time": "12:40:28",
  "currency": "MYR",
  "amount": 83.40,
  "subtotal": 83.40,
  "discount": 0.00,
  "taxAmount": 0.00,
  "tableNo": "11",
  "cashier": "Mdm Loo YFNH",
  "registerNo": "1"
}
```

### Expected Line Items

```json
[
  { "description": "Char Siu Fried Wantan", "quantity": 1, "amount": 9.50 },
  { "description": "Fried Wantan Noodles", "quantity": 1, "amount": 10.50 },
  { "description": "Full Wantan Noodles", "quantity": 1, "amount": 9.50 },
  { "description": "Char Siu Wantan Noodles", "quantity": 1, "amount": 9.50 },
  { "description": "Dumpling Noodles", "quantity": 2, "amount": 23.00 },
  { "description": "Dumpling Noodles", "quantity": 1, "amount": 10.50 },
  { "description": "Soya Bean", "quantity": 1, "amount": 2.50 },
  { "description": "Teh O", "quantity": 1, "amount": 2.70 },
  { "description": "Chinese Tea", "quantity": 3, "amount": 3.00 },
  { "description": "Kopi O", "quantity": 1, "amount": 2.70 }
]
```

### Parser Notes

- This receipt is a table-style layout with columns for price, quantity, discount, and amount.
- Use the rightmost amount column for line-item totals rather than unit price.
- Item names appear in mixed Chinese and English; English names are sufficient but Chinese text can be preserved.
- `Total Sales (Exc. Tax)`, `DISCOUNT`, and `Tax` are summary rows.
- Payment method is not visible in the crop.

### Current Desired Regression Coverage

- Parse total as `83.40 MYR`.
- Parse zero discount and zero tax without creating zero-value line items.
- Extract quantity-aware table rows using the rightmost amount column.

## Sample 027 - Restoran Habib Mobile Pay Receipt

- Source: `Photo 2.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/e65dfe60-c83b-45ce-8238-e8163669048d/2-Photo-2.jpg`
- Receipt language: English / Malay item names
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "RESTORAN HABIB SDN BHD",
  "date": "2026-04-14",
  "time": "12:47:35",
  "currency": "MYR",
  "amount": 90.50,
  "subtotal": 85.36,
  "taxRate": 6,
  "taxAmount": 5.12,
  "rounding": 0.02,
  "paymentMethod": "e_wallet",
  "paymentMethodRaw": "MOBILE PAY / CASH printed conflict",
  "tableNo": "1",
  "transactionNo": "412510",
  "taxNo": "362395"
}
```

### Expected Line Items

```json
[
  { "description": "Maggi Goreng", "quantity": 1, "amount": 7.00 },
  { "description": "Limau Ais", "quantity": 1, "amount": 2.40 },
  { "description": "Maggi Sup", "quantity": 1, "amount": 5.50 },
  { "description": "Teh O Limau Ais", "quantity": 1, "amount": 2.50 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 10.00 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 10.00 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 10.00 },
  { "description": "Coke", "quantity": 1, "amount": 2.75 },
  { "description": "Roti Canai", "quantity": 1, "amount": 1.51 },
  { "description": "Roti Telur", "quantity": 1, "amount": 3.00 },
  { "description": "Teh O", "quantity": 1, "amount": 1.60 },
  { "description": "Maggi Sup", "quantity": 1, "amount": 5.50 },
  { "description": "Ayam Goreng", "quantity": 1, "amount": 5.30 },
  { "description": "Teh O Limau Ais", "quantity": 1, "amount": 2.50 },
  { "description": "Sirap Limau Ais", "quantity": 1, "amount": 2.50 },
  { "description": "Limau Ais", "quantity": 1, "amount": 2.40 },
  { "description": "Limau Ais", "quantity": 1, "amount": 2.40 },
  { "description": "Nasi Sayur", "quantity": 1, "amount": 4.50 },
  { "description": "Sayur", "quantity": 2, "amount": 4.00 }
]
```

### Parser Notes

- Header says `MOBILE PAY`, but summary row shows `CASH RM 90.50`; preserve raw payment conflict and prefer mobile/e-wallet if header is authoritative.
- `-T` suffix after item amounts is a tax marker, not a negative amount.
- `NET TOTAL` is the final expense amount; `TOTAL` is before service tax.
- Rows like `Telur Mata`, `KM`, `PLATE`, and `KO...KO` are modifiers/notes and should not be separate items without their own amount.

### Current Desired Regression Coverage

- Parse net total as `90.50 MYR`.
- Parse service tax as `5.12` and rounding as `0.02`.
- Keep repeated same-name item rows instead of merging them prematurely.
- Detect tender label conflict without dropping amount.

## Sample 028 - Restoran Habib Cash Receipt

- Source: `Photo 3.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/e65dfe60-c83b-45ce-8238-e8163669048d/3-Photo-3.jpg`
- Receipt language: English / Malay item names
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "RESTORAN HABIB SDN BHD",
  "date": "2026-03-31",
  "time": "12:46:14",
  "currency": "MYR",
  "amount": 68.60,
  "subtotal": 64.71,
  "taxRate": 6,
  "taxAmount": 3.88,
  "rounding": 0.01,
  "paymentMethod": "cash",
  "cashPaid": 70.00,
  "change": 1.40,
  "tableNo": "3",
  "transactionNo": "403789",
  "taxNo": "354392"
}
```

### Expected Line Items

```json
[
  { "description": "Limau Ais", "quantity": 1, "amount": 2.40 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 10.00 },
  { "description": "Teh O Ais L Jumbo", "quantity": 1, "amount": 4.20 },
  { "description": "Nasi Lemak Telur Goreng", "quantity": 1, "amount": 4.50 },
  { "description": "Ayam Goreng", "quantity": 1, "amount": 5.30 },
  { "description": "Maggi Goreng", "quantity": 1, "amount": 7.50 },
  { "description": "Rojak Mee", "quantity": 1, "amount": 7.00 },
  { "description": "Roti Canai", "quantity": 1, "amount": 1.51 },
  { "description": "Roti Telur", "quantity": 1, "amount": 3.00 },
  { "description": "Ayam Goreng", "quantity": 1, "amount": 5.30 },
  { "description": "Maggi Goreng", "quantity": 1, "amount": 7.50 },
  { "description": "Ais Kosong", "quantity": 1, "amount": 0.30 },
  { "description": "Teh O", "quantity": 1, "amount": 1.60 },
  { "description": "Teh O Limau Ais", "quantity": 1, "amount": 2.50 },
  { "description": "Minuman Rm", "quantity": 1, "amount": 2.10 }
]
```

### Parser Notes

- A finger covers part of the merchant/address header; parser should still use visible merchant signal if OCR sees it.
- `NET TOTAL` is the final amount.
- `CASH 70.00` and `CHANGE 1.40` are payment metadata.
- `Add Maggi Pkt`, `PLEAT`, and `KOSONG_` are modifiers/notes unless they carry their own amount.
- `-T` suffixes should be ignored as tax markers.

### Current Desired Regression Coverage

- Parse net total as `68.60 MYR`.
- Parse cash paid and change separately.
- Extract low-value items such as `Ais Kosong 0.30`.

## Sample 029 - Restoran Habib Online Sales Receipt

- Source: `Photo 4.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/e65dfe60-c83b-45ce-8238-e8163669048d/4-Photo-4.jpg`
- Receipt language: English / Malay item names
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "RESTORAN HABIB SDN BHD",
  "date": "2026-03-13",
  "time": "22:17:00",
  "currency": "MYR",
  "amount": 107.10,
  "subtotal": 101.02,
  "taxRate": 6,
  "taxAmount": 6.06,
  "rounding": 0.02,
  "paymentMethod": "cash",
  "cashPaid": 107.10,
  "change": 0.00,
  "tableNo": "C8",
  "transactionNo": "393049"
}
```

### Expected Line Items

```json
[
  { "description": "Maggi Sup", "quantity": 1, "amount": 5.50 },
  { "description": "Maggi G Ayam", "quantity": 1, "amount": 11.90 },
  { "description": "Maggi Sup", "quantity": 1, "amount": 7.50 },
  { "description": "Roti Canai", "quantity": 1, "amount": 1.51 },
  { "description": "Roti Pisang", "quantity": 1, "amount": 4.00 },
  { "description": "Ayam Goreng", "quantity": 1, "amount": 5.30 },
  { "description": "Teh O Ais L Jumbo", "quantity": 2, "amount": 8.40 },
  { "description": "Limau Ais", "quantity": 1, "amount": 2.40 },
  { "description": "Maggi Goreng", "quantity": 1, "amount": 9.00 },
  { "description": "Coke", "quantity": 1, "amount": 2.75 },
  { "description": "100 Plus", "quantity": 1, "amount": 2.75 },
  { "description": "Maggi Goreng", "quantity": 1, "amount": 7.00 },
  { "description": "Roti Canai", "quantity": 1, "amount": 1.51 },
  { "description": "Teh O Ais L Jumbo", "quantity": 1, "amount": 4.20 },
  { "description": "Nasi Lemak Ayam", "quantity": 1, "amount": 10.00 },
  { "description": "Roti Tampal", "quantity": 1, "amount": 3.00 },
  { "description": "Roti Bawang", "quantity": 1, "amount": 2.50 },
  { "description": "Roti Telur", "quantity": 1, "amount": 3.00 },
  { "description": "Limau Ais Jumbo", "quantity": 1, "amount": 4.80 },
  { "description": "Roti Pisang", "quantity": 1, "amount": 4.00 }
]
```

### Parser Notes

- `ONLINE SALES` receipt still behaves like a standard restaurant receipt for totals.
- `NET TOTAL` is the final expense amount.
- `SST 6%`, `ROUNDING`, `CASH`, and `CHANGE` are metadata/payment rows.
- Modifier rows such as `Add Maggi Pkt`, `Telur Mata`, `DD`, `PLEAT_DD_`, and `TAMBAH_MEGA` should attach to nearby items or be ignored if unpriced.
- `-Z` suffix should be treated as tax marker, not negative amount.

### Current Desired Regression Coverage

- Parse net total as `107.10 MYR`.
- Parse 6% SST as `6.06`.
- Extract many repeated items without merging them.

## Sample 030 - Shi Ri Tian Pan Mee Receipt

- Source: `Photo 5.jpg`, provided through Codex attachment on 2026-06-24.
- Image path at capture time: `C:/Users/dogaa/Documents/Project/Expense_Manager/.codex-remote-attachments/019ef883-ef86-78f3-8dee-514a6bfad618/e65dfe60-c83b-45ce-8238-e8163669048d/5-Photo-5.jpg`
- Receipt language: English / Chinese
- Country / region inference: Malaysia
- Expected currency: `MYR`

### Expected Fields

```json
{
  "merchant": "十口天 - 辣椒板面",
  "date": "2026-03-06",
  "time": "12:38:00",
  "currency": "MYR",
  "amount": 68.90,
  "subtotal": 65.00,
  "discount": 0.00,
  "taxRate": 6,
  "taxAmount": 3.90,
  "rounding": 0.00,
  "paymentMethod": "e_wallet",
  "receiptNo": "68907",
  "closedBy": "Jordan",
  "tableNo": "31",
  "itemCount": 10
}
```

### Expected Line Items

```json
[
  { "description": "Chilli PM (Panmee)", "quantity": 2, "amount": 21.80 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Soup MFG (Mee Hoon Kuey)", "quantity": 1, "amount": 8.90 },
  { "description": "Cham C Ice", "quantity": 1, "amount": 3.50 },
  { "description": "Cincao Ice", "quantity": 1, "amount": 1.50 },
  { "description": "Dry YM (Youmee)", "quantity": 1, "amount": 9.90 },
  { "description": "Kopi Ice", "quantity": 2, "amount": 7.00 },
  { "description": "Tomyam Dry YM (Youmee)", "quantity": 1, "amount": 10.90 }
]
```

### Parser Notes

- Header has Chinese merchant name; preserve it as merchant when readable.
- `Final Amount(MYR)` is the final amount; `Amount 68.90` before final amount repeats the same value.
- `Item count: 10`, `Subtotal`, `Total discount`, `Service Charge(6%)`, `Amount`, `Rounding`, `Payment method`, `Payment received`, and `Change` are metadata/summary rows.
- Modifiers such as `Less Sweet` should attach to parent items or be ignored.

### Current Desired Regression Coverage

- Parse final amount as `68.90 MYR`.
- Parse service charge as `3.90`.
- Extract 8 priced rows representing 10 quantity units.
