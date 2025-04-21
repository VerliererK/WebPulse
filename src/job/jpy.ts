export default async (text: string) => {
  const res = await fetch('https://www.esunbank.com/api/client/ExchangeRate/LastRateInfo', { method: 'POST' });
  const data = await res.json() as { Rates: { Name: string, SellDecreaseRate: string, SBoardRate: string }[] };
  const jpyRate = data.Rates.find(rate => rate.Name === '日圓') || { SellDecreaseRate: '', SBoardRate: '' };
  const rate = parseFloat(jpyRate.SellDecreaseRate || jpyRate.SBoardRate);

  const update_text = `日円： ${rate}`;
  const needs_update = update_text !== text && rate * 10000 % 5 === 0;
  return { update_text, needs_update };
}
