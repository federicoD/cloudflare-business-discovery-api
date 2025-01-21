### Create project
`npm create cloudflare@latest -- my-first-worker`

### Create database
`npx wrangler d1 create DB_NAME`

### Run query from file (locally or remote)
`npx wrangler d1 execute DB_NAME --local|remote --file=./schema.sql`

### Run query from command (locally or remote)
`npx wrangler d1 execute DB_NAME --local|remote --command="SELECT * FROM XYZ"`

### Delete database
`npx wrangler d1 delete DB_NAME`

### Add secret
npx wrangler secret put <KEY>