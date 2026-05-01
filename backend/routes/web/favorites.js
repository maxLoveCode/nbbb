const express = require("express");
const router = express.Router();

const favoriteController = require("../../controllers/favoriteController");
const webAuth = require("../../middleware/webAuth");

router.use(webAuth);

router.get("/", favoriteController.list.bind(favoriteController));

router.post("/", (req, res, next) => {
  req.body = {
    ...req.body,
    product_code: req.body?.product_code || req.body?.productCode
  };
  return favoriteController.add(req, res, next);
});

router.delete("/:productCode", favoriteController.remove.bind(favoriteController));

module.exports = router;
