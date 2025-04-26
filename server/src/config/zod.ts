import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

console.log("[Startup] Extending Zod with OpenAPI support..."); 
extendZodWithOpenApi(z);
console.log("[Startup] Zod extended successfully."); 