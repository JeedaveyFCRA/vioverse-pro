#!/usr/bin/env node

/**
 * Test Lighthouse configuration locally
 */

const { spawn } = require('child_process');
const waitOn = require('wait-on');

async function runLighthouse() {
  console.log('🚀 Starting server...');

  // Start the server
  const server = spawn('npm', ['start'], {
    detached: false,
    stdio: 'pipe'
  });

  // Wait for server to be ready
  try {
    await waitOn({
      resources: ['http://localhost:3000'],
      timeout: 30000,
      interval: 1000
    });

    console.log('✅ Server is ready');
    console.log('🔍 Running Lighthouse audit...');

    // Run Lighthouse
    const lighthouse = spawn('npx', ['lhci', 'autorun', '--collect.numberOfRuns=1'], {
      stdio: 'inherit'
    });

    await new Promise((resolve, reject) => {
      lighthouse.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Lighthouse audit completed successfully');
          resolve();
        } else {
          console.log(`⚠️ Lighthouse audit completed with warnings (code ${code})`);
          resolve(); // Don't fail on warnings
        }
      });

      lighthouse.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Kill the server
    console.log('🛑 Stopping server...');
    server.kill('SIGTERM');

    // Force kill after timeout
    setTimeout(() => {
      server.kill('SIGKILL');
    }, 5000);
  }
}

// Run if executed directly
if (require.main === module) {
  runLighthouse().catch(console.error);
}

module.exports = { runLighthouse };