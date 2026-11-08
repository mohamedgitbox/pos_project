import { execSync } from 'child_process';

const maxRetries = 10;

async function initReplica() {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = execSync(
        'docker compose exec -T mongo mongosh --eval "rs.status().ok" 2>&1',
        { encoding: 'utf-8' }
      );
      if (result.includes('1')) {
        console.log('Replica set already initialized');
        process.exit(0);
      }
    } catch {
      // not yet ready
    }
    try {
      execSync(
        'docker compose exec -T mongo mongosh --eval "rs.initiate({_id:\'rs0\',members:[{_id:0,host:\'localhost:27017\'}]})" 2>&1',
        { encoding: 'utf-8' }
      );
      console.log('Replica set initiated');
      process.exit(0);
    } catch {
      console.log(`Waiting for MongoDB to be ready... attempt ${i + 1}/${maxRetries}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.error('Failed to initialize replica set after retries');
  process.exit(1);
}

initReplica();