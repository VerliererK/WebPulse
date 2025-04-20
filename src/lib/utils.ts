export const fetch_timeout = async (url: string, timeout: number = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(id);
  return response;
};

export const ntfy_notify = (text: string, topic: string) => {
  return fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: text,
  });
};
