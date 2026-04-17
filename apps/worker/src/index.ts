import { processPendingSyncJobs } from './jobs/pullRequestAnalysis.js';

function main() {
  const result = processPendingSyncJobs(console);
  console.log(`worker bootstrap processed ${result.processedJobs} queued sync jobs`);
}

main();
