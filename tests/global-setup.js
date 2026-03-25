/**
 * Playwright Global Setup
 * Runs once before all tests
 */

async function globalSetup(config) {
    console.log('\n🚀 Starting test environment setup...');
    
    // Initialize test data
    global.testStartTime = Date.now();
    
    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.PLAYWRIGHT_TEST = 'true';
    
    const baseUrl = config.projects?.[0]?.use?.baseURL || 'not configured';
    const browserNames = config.projects?.map((project) => project.name).join(', ') || 'none';

    console.log('✓ Test environment ready');
    console.log(`✓ Base URL: ${baseUrl}`);
    console.log(`✓ Browsers: ${browserNames}\n`);
}

export default globalSetup;
