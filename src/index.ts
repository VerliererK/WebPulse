import { Hono } from 'hono'
import { fetch_timeout } from "./lib/utils";

type Bindings = {
  KV_BINDING: KVNamespace;
}

const app = new Hono<{ Bindings: Bindings }>();

interface JobConfig {
  url: string;
  interval: number;
  enabled: boolean;
}

const getJobs = async (KV_BINDING: KVNamespace): Promise<JobConfig[]> => {
  const config = await KV_BINDING.get('jobs:config');
  return JSON.parse(config ?? '[]');
};

const setJobs = (KV_BINDING: KVNamespace, jobs: JobConfig[]) => {
  return KV_BINDING.put('jobs:config', JSON.stringify(jobs));
};

app.get('/api/jobs', async (c) => {
  const jobs = await getJobs(c.env.KV_BINDING);
  return c.json(jobs);
});

app.post('/api/jobs', async (c) => {
  const jobs = await getJobs(c.env.KV_BINDING);
  const { url, interval, enabled } = await c.req.json() as JobConfig;

  const job = jobs.find(i => i.url === url);
  if (job) {
    job.interval = interval ?? job.interval;
    job.enabled = enabled ?? job.enabled;
  } else {
    jobs.push({ url, interval, enabled });
  }

  await setJobs(c.env.KV_BINDING, jobs);
  return c.text('ok');
});

app.delete('/api/jobs', async (c) => {
  const jobs = await getJobs(c.env.KV_BINDING);
  const { url } = await c.req.json();
  const index = jobs.findIndex(i => i.url === url);
  if (index === -1) return c.text('job not found', 404);
  jobs.splice(index, 1);
  await setJobs(c.env.KV_BINDING, jobs);
  return c.text('ok');
});

export default {
  fetch: app.fetch,
  scheduled: async (batch: any, env: Bindings) => {
    const { KV_BINDING } = env;
    const jobs = await getJobs(KV_BINDING);
    for (const { url, interval, enabled } of jobs) {
      if (!enabled) continue;

      const time = Number(await KV_BINDING.get(`job:${url}:time`) || 0);
      if (Date.now() - time < interval * 1000 * 60) continue;

      await fetch_timeout(url, 1000).catch(() => { });
      await KV_BINDING.put(`job:${url}:time`, Date.now().toString());
    }
  },
}
