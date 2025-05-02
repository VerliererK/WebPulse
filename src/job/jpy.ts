export default async (text: string) => {
  const res = await fetch('https://www.esunbank.com/api/client/ExchangeRate/LastRateInfo', { method: 'POST' });
  const data = await res.json() as { Rates: { Name: string, SellDecreaseRate: string, SBoardRate: string }[] };
  const jpyRate = data.Rates.find(rate => rate.Name === '日圓') || { SellDecreaseRate: '', SBoardRate: '' };
  const rate = Number(jpyRate.SellDecreaseRate) || Number(jpyRate.SBoardRate);
  const lastRate = Number(text.split('： ')[1]) || 0;

  const update_text = `日円： ${rate}`;
  const needs_update = update_text !== text && (rate * 10000 % 5 === 0 || Math.abs(lastRate - rate) * 10000 >= 5);
  return { update_text, needs_update };
}
