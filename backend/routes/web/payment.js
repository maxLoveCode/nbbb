const express = require("express");
const router = express.Router();

const legacyPaymentRouter = require("../payment");

router.use("/", legacyPaymentRouter);

module.exports = router;
