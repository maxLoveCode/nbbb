const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

module.exports = pool;
