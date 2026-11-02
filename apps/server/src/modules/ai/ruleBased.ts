import {
  formatDate,
  formatMoney,
  formatMonthKey,
  formatNumber,
  formatPercent,
  WEEKDAYS,
  type AiSummary,
  type Analytics,
  type Language,
} from '@salesreport/shared';

/**
 * Deterministic, template-based summary used when no LLM key is configured or
 * the provider call fails. Produces the same structure as the AI summary, in Bangla or English.
 */
export function generateRuleBasedSummary(a: Analytics, lang: Language): Omit<AiSummary, 'generatedAt'> {
  const money = (n: number) => formatMoney(n, a.currency, lang);
  const num = (n: number) => formatNumber(n, lang, { decimals: Number.isInteger(n) ? 0 : 1 });
  const pct = (n: number | null) => formatPercent(n, lang);
  const start = a.periodStart ? formatDate(a.periodStart, lang) : '—';
  const end = a.periodEnd ? formatDate(a.periodEnd, lang) : '—';
  const best = a.bestProductByRevenue;
  const bestQty = a.bestProductByQuantity;
  const wd = a.bestWeekday ? WEEKDAYS[lang][a.bestWeekday.weekday] : null;
  const g = a.monthOverMonthGrowth;
  const pg = a.periodGrowth;
  const lastMonth = a.growthMonths ? { month: a.growthMonths.current } : a.monthly.at(-1);
  const top3Share = a.topProducts.slice(0, 3).reduce((s, p) => s + p.share, 0);
  const worstMonth = [...a.monthly].sort((x, y) => x.revenue - y.revenue)[0];
  const bestMonth = [...a.monthly].sort((x, y) => y.revenue - x.revenue)[0];
  const weakestDay = [...a.byWeekday].filter((d) => d.orders > 0).sort((x, y) => x.revenue - y.revenue)[0];

  if (a.orderCount === 0) {
    return lang === 'bn'
      ? {
          language: lang,
          provider: 'rule-based',
          model: null,
          headline: 'কোনো বিক্রয় তথ্য পাওয়া যায়নি',
          overview: 'এই ডেটাসেটে বিশ্লেষণযোগ্য কোনো সারি নেই।',
          insights: [],
          recommendations: ['সঠিক কলাম ম্যাপিং দিয়ে আবার ফাইল আপলোড করুন।'],
        }
      : {
          language: lang,
          provider: 'rule-based',
          model: null,
          headline: 'No sales data found',
          overview: 'This dataset has no rows that could be analysed.',
          insights: [],
          recommendations: ['Re-upload the file with the correct column mapping.'],
        };
  }

  if (lang === 'bn') {
    const trend = pg === null ? 'স্থিতিশীল' : pg >= 5 ? 'ঊর্ধ্বমুখী' : pg <= -5 ? 'নিম্নমুখী' : 'মোটামুটি স্থিতিশীল';
    const insights = [
      best
        ? `সর্বোচ্চ আয়ের পণ্য "${best.product}" — মোট আয় ${money(best.revenue)}, যা মোট বিক্রয়ের ${num(best.share)}%।`
        : null,
      bestQty && bestQty.product !== best?.product
        ? `পরিমাণে সবচেয়ে বেশি বিক্রি হয়েছে "${bestQty.product}" (${num(bestQty.quantity)} ইউনিট)।`
        : null,
      wd ? `সপ্তাহের সবচেয়ে ভালো দিন ${wd}; এই দিনে মোট আয় ${money(a.bestWeekday!.revenue)}।` : null,
      a.bestDate
        ? `সর্বোচ্চ বিক্রয়ের তারিখ ${formatDate(a.bestDate.date, lang)} — ${money(a.bestDate.revenue)}।`
        : null,
      g !== null && lastMonth
        ? `সর্বশেষ মাসে (${formatMonthKey(lastMonth.month, lang, true)}) আগের মাসের তুলনায় বিক্রয় ${pct(g)} পরিবর্তিত হয়েছে।`
        : null,
      a.topProducts.length >= 3 ? `শীর্ষ ৩টি পণ্য মোট আয়ের ${num(top3Share)}% এনেছে।` : null,
      bestMonth && a.monthly.length > 1
        ? `সেরা মাস ছিল ${formatMonthKey(bestMonth.month, lang, true)} (${money(bestMonth.revenue)})।`
        : null,
    ].filter((x): x is string => Boolean(x));
    const recommendations = [
      best ? `"${best.product}"-এর স্টক পর্যাপ্ত রাখুন এবং এর সাথে সম্পর্কিত পণ্য বান্ডেল অফার করুন।` : null,
      wd ? `${wd}-এ বিশেষ অফার ও বিজ্ঞাপন চালান — এই দিনেই গ্রাহকরা সবচেয়ে বেশি কেনেন।` : null,
      weakestDay && wd
        ? `${WEEKDAYS.bn[weakestDay.weekday]}-এ বিক্রয় কম; এই দিনে ছাড় বা ফ্ল্যাশ সেল দিয়ে চাহিদা বাড়ানোর চেষ্টা করুন।`
        : null,
      top3Share > 60
        ? 'আয় কয়েকটি পণ্যের ওপর বেশি নির্ভরশীল — ঝুঁকি কমাতে অন্যান্য পণ্যের প্রচার বাড়ান।'
        : 'পণ্যভিত্তিক আয় ভালোভাবে ছড়ানো; লাভজনক পণ্যগুলোর মার্জিন পর্যালোচনা করুন।',
      g !== null && g < 0
        ? 'সাম্প্রতিক বিক্রয় কমেছে — নিয়মিত গ্রাহকদের সাথে যোগাযোগ করুন এবং লয়্যালটি অফার দিন।'
        : 'বিক্রয়ের ইতিবাচক গতি ধরে রাখতে শীর্ষ গ্রাহকদের জন্য রেফারেল প্রোগ্রাম চালু করুন।',
      worstMonth && a.monthly.length > 2
        ? `${formatMonthKey(worstMonth.month, lang, true)} ছিল সবচেয়ে দুর্বল মাস; আগামী বছর এই সময়ের জন্য আগাম পরিকল্পনা করুন।`
        : null,
    ].filter((x): x is string => Boolean(x));
    return {
      language: lang,
      provider: 'rule-based',
      model: null,
      headline: `${start} থেকে ${end} পর্যন্ত মোট বিক্রয় ${money(a.totalRevenue)} — প্রবণতা ${trend}`,
      overview: `এই সময়ে মোট ${num(a.orderCount)}টি অর্ডারে ${num(a.totalQuantity)} ইউনিট পণ্য বিক্রি হয়েছে। গড় অর্ডার মূল্য ${money(a.averageOrderValue)}। ${num(a.uniqueProducts)}টি ভিন্ন পণ্য${a.uniqueCustomers ? ` এবং ${num(a.uniqueCustomers)} জন গ্রাহক` : ''} এই বিক্রয়ে অবদান রেখেছে।${pg !== null ? ` সময়কালের দ্বিতীয়ার্ধে প্রথমার্ধের তুলনায় বিক্রয় ${pct(pg)} পরিবর্তিত হয়েছে।` : ''}`,
      insights,
      recommendations,
    };
  }

  const trend = pg === null ? 'stable' : pg >= 5 ? 'trending up' : pg <= -5 ? 'trending down' : 'broadly stable';
  const insights = [
    best
      ? `"${best.product}" is the top revenue driver with ${money(best.revenue)} (${num(best.share)}% of total sales).`
      : null,
    bestQty && bestQty.product !== best?.product
      ? `"${bestQty.product}" sold the most units (${num(bestQty.quantity)}).`
      : null,
    wd ? `${wd} is the strongest day of the week, generating ${money(a.bestWeekday!.revenue)}.` : null,
    a.bestDate
      ? `The single best day was ${formatDate(a.bestDate.date, lang)} with ${money(a.bestDate.revenue)} in sales.`
      : null,
    g !== null && lastMonth
      ? `Sales in ${formatMonthKey(lastMonth.month, lang, true)} changed ${pct(g)} versus the previous month.`
      : null,
    a.topProducts.length >= 3 ? `The top 3 products account for ${num(top3Share)}% of revenue.` : null,
    bestMonth && a.monthly.length > 1
      ? `The best month was ${formatMonthKey(bestMonth.month, lang, true)} (${money(bestMonth.revenue)}).`
      : null,
  ].filter((x): x is string => Boolean(x));
  const recommendations = [
    best ? `Keep "${best.product}" well stocked and bundle it with complementary items to lift basket size.` : null,
    wd ? `Concentrate promotions and ad spend on ${wd}s, when customers buy the most.` : null,
    weakestDay && wd
      ? `${WEEKDAYS.en[weakestDay.weekday]} is the slowest day — test discounts or flash sales to smooth demand.`
      : null,
    top3Share > 60
      ? 'Revenue is concentrated in a few products — promote the long tail to reduce dependency risk.'
      : 'Revenue is well diversified; review margins to push the most profitable products.',
    g !== null && g < 0
      ? 'Recent sales dipped — re-engage repeat customers with loyalty offers and reminders.'
      : 'Momentum is positive — launch a referral programme for top customers to compound growth.',
    worstMonth && a.monthly.length > 2
      ? `${formatMonthKey(worstMonth.month, lang, true)} was the weakest month; plan campaigns ahead of that season next year.`
      : null,
  ].filter((x): x is string => Boolean(x));
  return {
    language: lang,
    provider: 'rule-based',
    model: null,
    headline: `${money(a.totalRevenue)} in sales from ${start} to ${end} — ${trend}`,
    overview: `${num(a.orderCount)} orders moved ${num(a.totalQuantity)} units, with an average order value of ${money(a.averageOrderValue)}. ${num(a.uniqueProducts)} products${a.uniqueCustomers ? ` and ${num(a.uniqueCustomers)} customers` : ''} contributed to sales.${pg !== null ? ` Revenue in the second half of the period changed ${pct(pg)} compared with the first half.` : ''}`,
    insights,
    recommendations,
  };
}
