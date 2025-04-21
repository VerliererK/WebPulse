import { Hono } from 'hono'
import { fetch_timeout, ntfy_notify } from "./lib/utils";
import jpy from "./job/jpy";
import freeios from "./job/freeios";

type Bindings = {
  KV_BINDING: KVNamespace;
  API_HOST: string;
  NTFY_TOPIC: string;
}

const actions: Record<string, any> = {};

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

const addAction = (name: string, callback: any) => {
  actions[name] = async (env: Bindings) => {
    const { KV_BINDING } = env;
    const text = await KV_BINDING.get(`job:${name}:text`);
    const { update_text, needs_update } = await callback(text);
    if (needs_update) {
      await KV_BINDING.put(`job:${name}:text`, update_text);
      await ntfy_notify(update_text, env.NTFY_TOPIC);
    }
    console.log(name, update_text);
    return update_text;
  };

  app.get(`/api/${name}`, async (c) => {
    const text = await actions[name](c.env);
    return c.text(text);
  });
};

addAction('jpy', jpy);

addAction('freeios', freeios);

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

const doJob = async (env: Bindings, job: JobConfig) => {
  const { API_HOST, KV_BINDING } = env;
  const { url, interval, enabled } = job;
  if (!enabled) return;
  const time = Number(await env.KV_BINDING.get(`job:${url}:time`) || 0);
  if (Date.now() - time < interval * 1000 * 60) return;

  // cloudflare not support fetch from another Worker on the same zone.
  if (url.startsWith(API_HOST)) {
    const action = url.split('/').pop();
    if (action && actions[action]) {
      console.log(`run action: ${action}`);
      await actions[action](env);
    }
  } else {
    console.log(`fetch: ${url}`);
    await fetch_timeout(url, 1000).catch((e) => { });
  }
  await KV_BINDING.put(`job:${url}:time`, Date.now().toString());
}

const doJobs = async (env: Bindings) => {
  const jobs = await getJobs(env.KV_BINDING);
  await Promise.all(jobs.map(job => doJob(env, job)));
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(doJobs(env));
  },
}
