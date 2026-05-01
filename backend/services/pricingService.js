const pool = require("../utils/db");

const DEFAULT_TIER = "default";
const WHITELIST_TIER = "whitelist";
const DEFAULT_WHITELIST_RATE = 0.3;

class PricingService {
  normalizeTier(value) {
    return String(value || DEFAULT_TIER).trim().toLowerCase() || DEFAULT_TIER;
  }

  normalizeRate(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) return null;
    return parsed;
  }

  async getPricingProfile(userId) {
    if (!userId) {
      return {
        userId: null,
        pricingTier: DEFAULT_TIER,
        discountRate: null,
        isWhitelisted: false,
        memberLevel: null
      };
    }

    const result = await pool.query(
      `SELECT u.id,
              u.member,
              w.pricing_tier,
              w.pricing_discount_rate
       FROM users u
       LEFT JOIN user_pricing_whitelist w
         ON w.user_id = u.id OR (w.user_id IS NULL AND w.phone = u.phone)
       WHERE u.id = $1
       ORDER BY w.id DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        userId,
        pricingTier: DEFAULT_TIER,
        discountRate: null,
        isWhitelisted: false,
        memberLevel: null
      };
    }

    const row = result.rows[0];
    const pricingTier = this.normalizeTier(row.pricing_tier);
    const explicitRate = this.normalizeRate(row.pricing_discount_rate);
    const discountRate = pricingTier === WHITELIST_TIER
      ? explicitRate ?? DEFAULT_WHITELIST_RATE
      : explicitRate;

    return {
      userId: row.id,
      pricingTier,
      discountRate,
      isWhitelisted: pricingTier === WHITELIST_TIER,
      memberLevel: row.member ?? null
    };
  }

  async getPricingProfileByPhone(phone) {
    if (!phone) {
      return {
        userId: null,
        pricingTier: DEFAULT_TIER,
        discountRate: null,
        isWhitelisted: false,
        memberLevel: null
      };
    }

    const result = await pool.query(
      `SELECT pricing_tier, pricing_discount_rate
       FROM user_pricing_whitelist
       WHERE phone = $1
       ORDER BY id DESC
       LIMIT 1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return {
        userId: null,
        pricingTier: DEFAULT_TIER,
        discountRate: null,
        isWhitelisted: false,
        memberLevel: null
      };
    }

    const row = result.rows[0];
    const pricingTier = this.normalizeTier(row.pricing_tier);
    const explicitRate = this.normalizeRate(row.pricing_discount_rate);

    return {
      userId: null,
      pricingTier,
      discountRate: pricingTier === WHITELIST_TIER ? explicitRate ?? DEFAULT_WHITELIST_RATE : explicitRate,
      isWhitelisted: pricingTier === WHITELIST_TIER,
      memberLevel: null
    };
  }

  applyPricing(basePricing = {}, profile = null) {
    const publicPrice = Number.isInteger(basePricing.price) ? basePricing.price : null;
    const publicOriginalPrice = Number.isInteger(basePricing.original_price)
      ? basePricing.original_price
      : null;
    const pricingTier = this.normalizeTier(profile?.pricingTier);
    const discountRate = this.normalizeRate(profile?.discountRate);

    const output = {
      ...basePricing,
      public_price: publicPrice,
      public_original_price: publicOriginalPrice,
      price_source: DEFAULT_TIER,
      pricing_tier: pricingTier,
      discount_rate: null
    };

    if (!publicPrice || pricingTier !== WHITELIST_TIER || !discountRate) {
      return output;
    }

    const discountedPrice = Math.max(0, Math.round(publicPrice * discountRate));
    const comparePrice = Math.max(publicOriginalPrice || 0, publicPrice);

    return {
      ...output,
      price: discountedPrice,
      original_price: comparePrice > discountedPrice ? comparePrice : null,
      price_note: "白名单价",
      price_source: WHITELIST_TIER,
      discount_rate: discountRate
    };
  }

  applyYuanPricing(basePricing = {}, profile = null) {
    const toCents = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      return Math.round(parsed * 100);
    };
    const toYuan = (value) => (Number.isInteger(value) ? value / 100 : null);

    const priced = this.applyPricing(
      {
        price: toCents(basePricing.price),
        original_price: toCents(basePricing.original_price),
        price_note: basePricing.price_note || null
      },
      profile
    );

    return {
      price: toYuan(priced.price),
      original_price: toYuan(priced.original_price),
      public_price: toYuan(priced.public_price),
      public_original_price: toYuan(priced.public_original_price),
      price_note: priced.price_note,
      price_source: priced.price_source,
      pricing_tier: priced.pricing_tier,
      discount_rate: priced.discount_rate
    };
  }
}

module.exports = new PricingService();
