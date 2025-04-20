export default async () => {
  const res = await fetch('https://www.esunbank.com/api/client/ExchangeRate/LastRateInfo', { method: 'POST' });
  const data = await res.json() as { Rates: { Name: string, SellDecreaseRate: string, SBoardRate: string }[] };
  const jpyRate = data.Rates.find(rate => rate.Name === '日圓') || { SellDecreaseRate: '', SBoardRate: '' };
  const rate = parseFloat(jpyRate.SellDecreaseRate) || jpyRate.SBoardRate;

  return `日円： ${rate}`;
}
