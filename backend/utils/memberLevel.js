/**
 * 会员等级工具类
 * 根据消费金额自动计算会员等级
 */

class MemberLevelUtil {
  // 会员等级规则配置
  static getMemberLevelRules() {
    return {
      1: { minAmount: 0, maxAmount: 999, name: "普通会员", discount: 1.0, points: 1, banner: "member_black.jpg" },
      2: { minAmount: 1000, maxAmount: 2999, name: "银卡会员", discount: 0.95, points: 1.2, banner: "member_black.jpg" },
      3: { minAmount: 3000, maxAmount: 5999, name: "金卡会员", discount: 0.9, points: 1.5, banner: "member_black.jpg" },
      4: { minAmount: 6000, maxAmount: 9999, name: "白金会员", discount: 0.85, points: 2.0, banner: "member_gold.jpg" },
      5: { minAmount: 10000, maxAmount: 19999, name: "钻石会员", discount: 0.8, points: 2.5, banner: "member_gold.jpg" },
      6: { minAmount: 20000, maxAmount: 49999, name: "至尊会员", discount: 0.75, points: 3.0, banner: "member_gold.jpg" },
      7: { minAmount: 50000, maxAmount: 99999, name: "VIP会员", discount: 0.7, points: 3.5, banner: "member_bronze.jpg" },
      8: { minAmount: 100000, maxAmount: 499999, name: "超级VIP", discount: 0.65, points: 4.0, banner: "member_bronze.jpg" },
      9: { minAmount: 500000, maxAmount: Infinity, name: "终身会员", discount: 0.6, points: 5.0, banner: "member_bronze.jpg" }
    };
  }

  /**
   * 根据消费金额计算会员等级
   * @param {number} totalSpent - 累计消费金额
   * @returns {number} 会员等级 (1-9)
   */
  static calculateMemberLevel(totalSpent) {
    const rules = this.getMemberLevelRules();
    
    for (let level = 9; level >= 1; level--) {
      const rule = rules[level];
      if (totalSpent >= rule.minAmount && totalSpent <= rule.maxAmount) {
        return level;
      }
    }
    
    // 默认返回1级
    return 1;
  }

  /**
   * 获取会员等级信息
   * @param {number} level - 会员等级
   * @returns {object} 会员等级信息
   */
  static getMemberLevelInfo(level) {
    const rules = this.getMemberLevelRules();
    return rules[level] || rules[1];
  }

  /**
   * 获取会员横幅图片
   * @param {number} level - 会员等级
   * @returns {string} 横幅图片路径
   */
  static getMemberBanner(level) {
    const info = this.getMemberLevelInfo(level);
    return `/assets/images/${info.banner}`;
  }

  /**
   * 检查是否需要升级会员等级
   * @param {number} currentLevel - 当前等级
   * @param {number} totalSpent - 累计消费金额
   * @returns {object} 升级信息
   */
  static checkLevelUp(currentLevel, totalSpent) {
    const newLevel = this.calculateMemberLevel(totalSpent);
    const hasUpgraded = newLevel > currentLevel;
    
    return {
      hasUpgraded,
      oldLevel: currentLevel,
      newLevel: newLevel,
      levelInfo: this.getMemberLevelInfo(newLevel)
    };
  }
}

module.exports = MemberLevelUtil;
