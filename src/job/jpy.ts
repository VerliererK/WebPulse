export default async (text: string) => {
  const res = await fetch('https://www.esunbank.com/api/client/ExchangeRate/LastRateInfo', { method: 'POST' });
  const data = await res.json() as { Rates: { Name: string, SellDecreaseRate: string }[] };
  const rate = Number(data.Rates.find(r => r.Name === '日圓')?.SellDecreaseRate);
  const lastRate = Number(text.split('： ')[1]) || 0;

  if (!Number.isFinite(rate)) return { update_text: text, needs_update: false };

  const update_text = `日円： ${rate}`;
  const needs_update = update_text !== text && (Math.abs(rate * 10000 % 5) < 1e-6 || Math.abs(lastRate - rate) * 10000 >= 5);
  return { update_text, needs_update };
}
