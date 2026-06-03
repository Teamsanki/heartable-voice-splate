SELECT cron.schedule(
  'refresh-weekly-milestone',
  '55 23 * * 0',
  $$SELECT net.http_post(
    url:='https://voice-vibe-spark.lovable.app/api/public/refresh-milestone',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );$$
);