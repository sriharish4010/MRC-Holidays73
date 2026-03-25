/**
 * Playwright Global Teardown
 * Runs once after all tests complete
 */

async function globalTeardown(config) {
    const testDuration = Date.now() - global.testStartTime;
    const durationSeconds = (testDuration / 1000).toFixed(2);
    
    console.log('\n✓ All tests completed');
    console.log(`✓ Total duration: ${durationSeconds}s\n`);
}

export default globalTeardown;
