const express = require("express");
const router = express.Router();

const pool = require("../../utils/db");
const optionalAuth = require("../../middleware/optionalAuth");
const productService = require("../../services/productService");
const webFormatter = require("../../utils/formatters/webFormatter");
const { buildCategoryMap, handleError, slugify } = require("./_helpers");

async function getActiveCategories() {
  const [cmsResult, listedResult] = await Promise.all([
    pool.query(
      `SELECT id, name, description, image, source, sort_order
       FROM category_page_categories
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, id ASC`
    ),
    pool.query(
      `SELECT category, COUNT(*)::int AS product_count
       FROM listed_products
       WHERE is_active = TRUE
       GROUP BY category
       ORDER BY category ASC`
    )
  ]);

  const categoryMap = buildCategoryMap(cmsResult.rows);
  for (const row of listedResult.rows) {
    const slug = slugify(row.category);
    if (!categoryMap[slug]) {
      categoryMap[slug] = {
        id: null,
        name: row.category,
        slug,
        description: "",
        image: null,
        source: "listed_products",
        sortOrder: 999
      };
    }

    categoryMap[slug].productCount = row.product_count;
  }

  return Object.values(categoryMap).sort((a, b) => a.sortOrder - b.sortOrder);
}

router.use(optionalAuth);

router.get("/categories", async (req, res) => {
  try {
    const categories = await getActiveCategories();
    return res.json(webFormatter.formatResponse({ categories }));
  } catch (error) {
    return handleError(res, error, "获取独立站分类失败");
  }
});

router.get("/listing", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 12,
      keyword = "",
      category = "",
      sort = "featured",
      minPrice,
      maxPrice,
      inStock
    } = req.query;

    const requestedPage = Math.max(parseInt(page, 10) || 1, 1);
    const requestedPageSize = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 48);
    const shouldPostProcess = Boolean(keyword || minPrice || maxPrice || sort !== "featured" || inStock);

    const rawResult = await productService.getProductList({
      page: shouldPostProcess ? 1 : requestedPage,
      pageSize: shouldPostProcess ? 200 : requestedPageSize,
      keyword: shouldPostProcess ? "" : keyword,
      category,
      userId: req.user?.id || null
    });

    let products = rawResult.products.map((product) => webFormatter.formatProduct(product));

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerKeyword) ||
          product.code.toLowerCase().includes(lowerKeyword) ||
          (product.category || "").toLowerCase().includes(lowerKeyword)
      );
    }

    if (minPrice) {
      const min = parseInt(minPrice, 10) || 0;
      products = products.filter((product) => product.price >= min);
    }

    if (maxPrice) {
      const max = parseInt(maxPrice, 10) || Number.MAX_SAFE_INTEGER;
      products = products.filter((product) => product.price <= max);
    }

    if (inStock === "true") {
      products = products.filter((product) => product.inStock);
    }

    if (sort === "price-asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === "name-asc") {
      products.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else if (sort === "latest") {
      products.sort((a, b) => String(b.code).localeCompare(String(a.code), "zh-CN"));
    }

    const pagedProducts = shouldPostProcess
      ? products.slice((requestedPage - 1) * requestedPageSize, requestedPage * requestedPageSize)
      : products;

    const priceValues = products.map((product) => product.price).filter((value) => typeof value === "number");
    const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))];

    return res.json(
      webFormatter.formatResponse({
        products: pagedProducts,
        filters: {
          categories: await getActiveCategories(),
          brands,
          priceRange: {
            min: priceValues.length ? Math.min(...priceValues) : 0,
            max: priceValues.length ? Math.max(...priceValues) : 0
          }
        },
        pagination: shouldPostProcess
          ? {
              page: requestedPage,
              pageSize: requestedPageSize,
              total: products.length,
              totalPages: Math.ceil(products.length / requestedPageSize)
            }
          : rawResult.pagination
      })
    );
  } catch (error) {
    return handleError(res, error, "获取独立站商品列表失败");
  }
});

router.get("/search/suggest", async (req, res) => {
  try {
    const { keyword = "" } = req.query;
    if (!keyword.trim()) {
      return res.json(webFormatter.formatResponse({ suggestions: [] }));
    }

    const result = await productService.getProductList({
      page: 1,
      pageSize: 20,
      keyword,
      category: "",
      userId: req.user?.id || null
    });

    const suggestions = result.products.slice(0, 8).map((product) => ({
      label: product.name,
      value: product.code,
      href: `/products/${product.code}`,
      category: product.category || "",
      price: product.price
    }));

    return res.json(webFormatter.formatResponse({ suggestions }));
  } catch (error) {
    return handleError(res, error, "获取搜索建议失败");
  }
});

module.exports = router;
