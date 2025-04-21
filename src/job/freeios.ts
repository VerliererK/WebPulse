const URLS = [
  'https://www.newmobilelife.com/category/apps-%E6%83%85%E5%A0%B1/%E9%99%90%E6%99%82%E5%85%8D%E8%B2%BB%E6%83%85%E5%A0%B1/',
  'https://mrmad.com.tw/category/3c-information/free-app/',
]

export default async (text: string) => {
  const taiwanDate = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
  const get1 = fetch(URLS[0]).then(response => response.text()).then(html => {
    const titleRegex = /<h2 class="cs-entry__title"><a href="[^"]+">([^<]+)<\/a><\/h2>/g;
    const dateRegex = /<div class="cs-meta-date">([^<]+)<\/div>/g;

    const titles = [...html.matchAll(titleRegex)].map(match => match[1]);
    const dates = [...html.matchAll(dateRegex)].map(match => match[1]);

    const apps = titles.map((title, index) => {
      return { title, date: dates[index] };
    });

    return apps;
  });

  const get2 = fetch(URLS[1]).then(response => response.text()).then(html => {
    const titleRegex = /<a href="[^"]+" rel="bookmark">([^<]+)<\/a>/g;
    const dateRegex = /<\/span>(.*?)作者:/g;

    const titles = [...html.matchAll(titleRegex)].map(match => match[1]);
    const dates = [...html.matchAll(dateRegex)].map(match => match[1]);

    const apps = titles.map((title, index) => {
      return { title, date: dates[index] };
    });

    return apps;
  });

  const [apps1, apps2] = await Promise.all([get1, get2]);
  const apps = [...apps1, ...apps2].sort((b, a) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latestApps = apps.filter(app => new Date(app.date) >= new Date(taiwanDate));
  if (latestApps.length === 0) return '';

  const update_text = `${taiwanDate}\n` + latestApps.map(app => app.title).join('\n');
  const needs_update = update_text !== text;
  return { update_text, needs_update };
};
