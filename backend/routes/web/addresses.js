const express = require("express");
const router = express.Router();

const addressController = require("../../controllers/addressController");
const webAuth = require("../../middleware/webAuth");

router.use(webAuth);

router.get("/", addressController.getAddressList);
router.post("/", addressController.createAddress);
router.put("/:id/default", addressController.setDefaultAddress);
router.get("/:id", addressController.getAddressDetail);
router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);

module.exports = router;
