const webFormatter = require("../../utils/formatters/webFormatter");

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCategoryMap(rows = []) {
  return rows.reduce((acc, row) => {
    const name = row.name || row.category || "";
    if (!name) return acc;

    acc[slugify(name)] = {
      id: row.id || null,
      name,
      slug: slugify(name),
      description: row.description || "",
      image: row.image || null,
      source: row.source || null,
      sortOrder: row.sort_order || 0
    };

    return acc;
  }, {});
}

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(500).json(webFormatter.formatError(`${fallbackMessage}: ${error.message}`, 500));
}

module.exports = {
  slugify,
  buildCategoryMap,
  handleError
};
