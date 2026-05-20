import { connectRequestSchema } from './shared/connection-contracts.js';
import { formatZodError } from './backend/src/server/ValidationSchemas.js';

const body = {"sessionId":null,"mode":"prompt","prompt":"Connect and test","agent":{"name":"Test Agent","type":"prompt"}};
const result = connectRequestSchema.safeParse(body);
console.log(result.success);
if (!result.success) {
  console.log(result.error.errors);
  console.log(formatZodError(result.error));
}
