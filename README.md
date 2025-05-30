# Cascade
A digital mass document approval and review system

## Dev Setup
Follow these steps in chronological order to setup a dev version of the web-app 
1. In the `.env` add a DATABASE_URL
2. Install [Node.js](https://nodejs.org/en)
3. Install `pnpm` by running the command `npm i -g pnpm` in the command line
4. Generate the database ORM through Prisma by running `pnpm db:generate`
5. Run the dev server by running `pnpm dev` and view the page at  [http://localhost:3000](http://localhost:3000)