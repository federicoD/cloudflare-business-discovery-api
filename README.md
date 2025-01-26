### Create project
`npm create cloudflare@latest -- my-first-worker`

### Create database
`npx wrangler d1 create DB_NAME`

### Run query from file (locally or remote)
`npx wrangler d1 execute DB_NAME --local|remote --file=./migrations/0001_initial.sql`

### Run query from command (locally or remote)
`npx wrangler d1 execute DB_NAME --local|remote --command="SELECT * FROM XYZ"`

### Delete database
`npx wrangler d1 delete DB_NAME`

### Add secret
`npx wrangler secret put <KEY>`


## To add

- reviews / rating?
 - pre-calculated using pub/sub
    - optimistic locking
- add review / rating? (from user)
- get business
- analytics
- openapi (https://github.com/rhinobase/hono-openapi)
- submit business -> approval process with workflows?
- authentication
- we can move business/search inside the discovery endpoint
- split routes in different files
- use ORM or manage better migrations

## To read

- https://developers.cloudflare.com/workers/configuration/smart-placement/
- https://developers.cloudflare.com/workers/testing/
- https://developers.cloudflare.com/analytics/analytics-engine/
- https://developers.cloudflare.com/queues/
- https://developers.cloudflare.com/workflows/

## Investigate

- got some problems with CHECK(length(field) <= 100) 


## Testing

### Axios
I was using Axios to call the API to convert from address to coordinates. I encountered the problems below so I just decided to use the `fetch method` and get rid of Axios.

```
Using vars defined in .dev.vars
[vpw:inf] Starting isolated runtimes for vitest.config.mts...
workerd/server/server.c++:3319: error: Fallback service failed to fetch module; payload = ; spec = /?specifier=node%3Ahttps&referrer=%2FC%3A%2FUsers%2Fdegra%2FDocuments%2Fcode%2Fcloudflare-business-discovery-api%2Fnode_modules%2Faxios%2Flib%2Fadapters%2Fhttp.js&rawSpecifier=node%3Ahttps
workerd/server/server.c++:3319: error: Fallback service failed to fetch module; payload = ; spec = /?specifier=node%3Ahttps&referrer=%2FC%3A%2FUsers%2Fdegra%2FDocuments%2Fcode%2Fcloudflare-business-discovery-api%2Fnode_modules%2Faxios%2Flib%2Fadapters%2Fhttp.js&rawSpecifier=node%3Ahttps
 ❯ test/index.spec.ts (0)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/index.spec.ts [ test/index.spec.ts ]
Error: No such module "node:https".
  imported from "./cloudflare-business-discovery-api/node_modules/axios/lib/adapters/http.js"
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  no tests
   Start at  04:43:37
   Duration  6.02s (transform 151ms, setup 0ms, collect 0ms, tests 0ms, environment 1ms, prepare 1.19s)
```

### D1

- Followed this repo: https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/d1