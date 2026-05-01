const express = require("express");
const router = express.Router();

const pool = require("../../utils/db");
const optionalAuth = require("../../middleware/optionalAuth");
const productService = require("../../services/productService");
const webFormatter = require("../../utils/formatters/webFormatter");
const { slugify, handleError } = require("./_helpers");

router.use(optionalAuth);

async function getListedProducts(limit = 8, userId = null) {
  const result = await pool.query(
    `SELECT product_code, category, display_order
     FROM listed_products
     WHERE is_active = TRUE
     ORDER BY display_order ASC, id ASC
     LIMIT $1`,
    [limit]
  );

  const codes = result.rows.map((row) => row.product_code).filter(Boolean);
  const products = await productService.batchGetProductsFromJST(codes, "", { userId });
  const map = products.reduce((acc, product) => {
    acc[product.code] = product;
    return acc;
  }, {});

  return result.rows
    .map((row) => {
      const product = map[row.product_code];
      if (!product) return null;

      return {
        ...webFormatter.formatProduct(product),
        categorySlug: slugify(row.category || product.category)
      };
    })
    .filter(Boolean);
}

router.get("/", async (req, res) => {
  try {
    const [bannersResult, lowerSwiperResult, threeImagesResult, categoryResult, featuredProducts] = await Promise.all([
      pool.query(
        `SELECT * FROM homepage_banners
         WHERE is_active = TRUE
         ORDER BY sort_order ASC`
      ),
      pool.query(
        `SELECT * FROM homepage_lower_swiper
         WHERE is_active = TRUE
         ORDER BY sort_order ASC`
      ),
      pool.query(
        `SELECT * FROM homepage_three_images
         WHERE is_active = TRUE
         ORDER BY sort_order ASC`
      ),
      pool.query(
        `SELECT id, name, description, image, source, sort_order
         FROM category_page_categories
         WHERE is_active = TRUE
         ORDER BY sort_order ASC
         LIMIT 6`
      ),
      getListedProducts(8, req.user?.id || null)
    ]);

    const categories = categoryResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: slugify(row.name),
      description: row.description || "",
      image: row.image || null,
      source: row.source || "category"
    }));

    const highlightedProducts = featuredProducts.slice(0, 4);

    return res.json(
      webFormatter.formatResponse({
        banners: bannersResult.rows,
        lowerSwiper: lowerSwiperResult.rows,
        threeImages: threeImagesResult.rows,
        categories,
        modules: {
          newArrivals: highlightedProducts,
          bestSellers: featuredProducts.slice(4, 8),
          featuredStories: categories.slice(0, 3).map((category) => ({
            ...category,
            href: `/collections/${category.slug}`
          }))
        }
      })
    );
  } catch (error) {
    return handleError(res, error, "获取独立站首页配置失败");
  }
});

module.exports = router;
