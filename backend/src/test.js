import { orchestrate } from './index.js';

async function runTests() {
  console.log("Starting Flowfex Orchestrator Tests...\n");

  const testCases = [
    "What is the weather like today?",
    "Can you calculate the sum of these numbers?",
    "Tell me a joke.", // Should fallback to default tool
  ];

  for (const input of testCases) {
    console.log(`Input: "${input}"`);
    const output = await orchestrate(input);
    console.log(JSON.stringify(output, null, 2));
    console.log("-------------------------------------------------");
  }

  console.log("Tests completed.");
}

runTests();
