import { connectRequestSchema } from './shared/connection-contracts.js';

const body = {"sessionId":null,"mode":"prompt","prompt":"Connect and test","agent":{"name":"Test Agent","type":"prompt"}};
const result = connectRequestSchema.safeParse(body);
console.log(result.success);
if (!result.success) {
  console.log('Keys:', Object.keys(result.error));
  console.log('Issues:', result.error.issues);
  console.log('Errors:', result.error.errors);
}
