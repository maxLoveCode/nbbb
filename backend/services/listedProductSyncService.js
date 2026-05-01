const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

class ListedProductSyncService {
  normalizeCodes(productCodes = []) {
    return [...new Set(
      (Array.isArray(productCodes) ? productCodes : [productCodes])
        .map(code => String(code || "").trim())
        .filter(Boolean)
    )];
  }

  async ensureListedProducts(productCodes, options = {}, client = null) {
    const codes = this.normalizeCodes(productCodes);
    if (codes.length === 0) {
      return {
        items: [],
        summary: {
          requested: 0,
          inserted: 0,
          reactivated: 0,
          already_active: 0
        }
      };
    }

    const {
      category = null,
      notes = null
    } = options;

    const dbClient = client || await pool.connect();
    const ownTransaction = !client;

    try {
      if (ownTransaction) {
        await dbClient.query("BEGIN");
      }

      const maxOrderResult = await dbClient.query(
        "SELECT COALESCE(MAX(display_order), 0) AS max_order FROM listed_products"
      );
      let nextOrder = Number(maxOrderResult.rows[0]?.max_order || 0);

      const synced = [];
      const summary = {
        requested: codes.length,
        inserted: 0,
        reactivated: 0,
        already_active: 0
      };

      for (const code of codes) {
        const existingResult = await dbClient.query(
          "SELECT id, is_active, category FROM listed_products WHERE product_code = $1",
          [code]
        );
        const existing = existingResult.rows[0] || null;

        nextOrder += 1;
        const result = await dbClient.query(
          `INSERT INTO listed_products (
             product_code, display_order, is_active, category, notes, created_at, updated_at
           )
           VALUES ($1, $2, true, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (product_code)
           DO UPDATE SET
             is_active = true,
             category = COALESCE(listed_products.category, EXCLUDED.category),
             notes = COALESCE(listed_products.notes, EXCLUDED.notes),
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, product_code, display_order, is_active, category`,
          [code, nextOrder, category, notes]
        );

        let action = "inserted";
        if (existing) {
          action = existing.is_active ? "already_active" : "reactivated";
        }

        summary[action] += 1;
        synced.push({
          ...result.rows[0],
          action
        });
      }

      if (ownTransaction) {
        await dbClient.query("COMMIT");
      }

      return {
        items: synced,
        summary
      };
    } catch (error) {
      if (ownTransaction) {
        await dbClient.query("ROLLBACK");
      }
      throw error;
    } finally {
      if (ownTransaction) {
        dbClient.release();
      }
    }
  }
}

module.exports = new ListedProductSyncService();
