const express = require("express");
const router = express.Router();

const legacyOrdersRouter = require("../orders");

router.use("/", legacyOrdersRouter);

module.exports = router;
