const express = require("express");
const router = express.Router();

const helper = require("../utilities/helper");
const { createOrder, listUserOrder, listOrder, getOneOrder, checkUser } = require("../controllers/order");

// router.post("/order", helper.isAuthenticated, createOrder);

// router.get("/listproduct/:type/:shopby", listProduct);
// router.get("/listproduct/:type", listProduct);
router.get("/listuserorder", helper.isAuthenticated, listUserOrder);
router.get("/listorder", helper.isAuthenticated, helper.isAdmin, listOrder);
router.post("/checkuser", checkUser);
router.get("/getoneorder", helper.isAuthenticated, getOneOrder);

module.exports = router;
