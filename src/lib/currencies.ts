// ISO 4217 currency codes for the Settings "Currency" dropdown. This drives
// display formatting only (symbol + grouping/decimals) via formatMoney()
// below -- there is no exchange-rate conversion anywhere. Raw numbers in
// the database are never touched by a currency change.
export type Currency = {
  code: string;
  name: string;
};

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "IQD", name: "Iraqi Dinar" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "LBP", name: "Lebanese Pound" },
  { code: "SYP", name: "Syrian Pound" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "ILS", name: "Israeli New Shekel" },
  { code: "IRR", name: "Iranian Rial" },
  { code: "YER", name: "Yemeni Rial" },
  { code: "INR", name: "Indian Rupee" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "AFN", name: "Afghan Afghani" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "THB", name: "Thai Baht" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "KHR", name: "Cambodian Riel" },
  { code: "LAK", name: "Lao Kip" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "MOP", name: "Macanese Pataca" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "BOB", name: "Bolivian Boliviano" },
  { code: "PYG", name: "Paraguayan Guarani" },
  { code: "VES", name: "Venezuelan Bolivar" },
  { code: "GTQ", name: "Guatemalan Quetzal" },
  { code: "CRC", name: "Costa Rican Colon" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "TTD", name: "Trinidad & Tobago Dollar" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "HTG", name: "Haitian Gourde" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "HRK", name: "Croatian Kuna" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "UZS", name: "Uzbekistani Som" },
  { code: "KGS", name: "Kyrgystani Som" },
  { code: "TJS", name: "Tajikistani Somoni" },
  { code: "TMT", name: "Turkmenistani Manat" },
  { code: "MNT", name: "Mongolian Tugrik" },
  { code: "ZAR", name: "South African Rand" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "XOF", name: "West African CFA Franc" },
  { code: "XAF", name: "Central African CFA Franc" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "DZD", name: "Algerian Dinar" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "LYD", name: "Libyan Dinar" },
  { code: "SDG", name: "Sudanese Pound" },
  { code: "SOS", name: "Somali Shilling" },
  { code: "ZMW", name: "Zambian Kwacha" },
  { code: "MWK", name: "Malawian Kwacha" },
  { code: "MZN", name: "Mozambican Metical" },
  { code: "BWP", name: "Botswanan Pula" },
  { code: "NAD", name: "Namibian Dollar" },
  { code: "SZL", name: "Eswatini Lilangeni" },
  { code: "LSL", name: "Lesotho Loti" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "MGA", name: "Malagasy Ariary" },
  { code: "XCD", name: "East Caribbean Dollar" },
  { code: "FJD", name: "Fijian Dollar" },
  { code: "PGK", name: "Papua New Guinean Kina" },
  { code: "WST", name: "Samoan Tala" },
  { code: "TOP", name: "Tongan Pa'anga" },
];

/**
 * Formats `amount` using `currencyCode`'s symbol and standard grouping --
 * display formatting only, no exchange-rate conversion. The raw number
 * passed in/out of the database is never touched.
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyCode: string | null | undefined
): string {
  const value = amount ?? 0;
  const code = currencyCode || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

export function currencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}
