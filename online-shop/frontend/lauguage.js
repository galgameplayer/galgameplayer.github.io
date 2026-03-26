(() => {
  // 本地存储的语言键 & 当前语言（默认 en）
  const LANG_KEY = 'oss_lang';
  let currentLang = localStorage.getItem(LANG_KEY) || 'en';

  // 固定 UI 词典：英文 -> 中文
  const dict = {
    // 导航与通用
    'Home': '首页',
    'Cart': '购物车',
    'Orders': '我的订单',
    'Admin': '后台',
    'Login': '登录',
    'Logout': '退出',
    'Customer Login': '客户登录',
    'Admin Login': '管理员登录',
    'Login as Admin': '以管理员身份登录',
    "Don't have an account?": '还没有账号？',
    'Register here': '去注册',
    'Already have an account?': '已有账号？',
    'Login here': '去登录',
    'Create Account': '创建账号',
    'Products': '商品',
    'Newest First': '最新优先',
    'Price: Low to High': '价格：从低到高',
    'Price: High to Low': '价格：从高到低',
    'Rating: High to Low': '评分：从高到低',
    'All Categories': '全部分类',
    'Doraemon': '哆啦A梦',
    'Madoka Magica': '魔法少女小圆',
    'Chainsaw Man': '电锯人',
    'Other': '其他',
    'Previous': '上一页',
    'Next': '下一页',
    'Back to Products': '返回商品列表',
    'Back to Home': '返回首页',
    'Back to Cart': '返回购物车',
    'Back to Orders': '返回订单列表',
    'English': 'English',
    '中文': '中文',

    // 商品 / 详情 / 评价
    'Stock:': '库存：',
    'Category:': '分类：',
    'Quantity:': '数量：',
    'Quantity': '数量',
    'Your rating:': '你的评分：',
    'Share your thoughts about this product...': '分享你对本商品的想法...',
    'Customer Reviews': '商品评价',
    'Most Liked': '最受欢迎',
    'Write a Review': '撰写评价',
    'Edit Your Review': '编辑你的评价',
    'Submit Review': '提交评价',
    'Update Review': '更新评价',
    'Rate this product': '为此商品打分',
    'Not rated yet': '尚未评分',
    'No reviews yet. Be the first to review!': '暂无评价',
    'Loading reviews...': '正在加载评价...',
    'Review submitted successfully': '评价已提交',
    'Review deleted': '评价已删除',
    'Please select a rating': '请选择评分',
    'Comment must be at least 5 characters': '评论至少 5 个字符',
    'Please login to add this item to your cart': '请先登录以加入购物车',
    'Login to add to cart': '登录后可加入购物车',
    'Admin cannot add to cart': '管理员不能加入购物车',
    'Out of stock': '缺货',
    'Add to Cart': '加入购物车',
    'View': '查看',
    'View Details': '查看详情',
    'No products found': '没有找到商品',
    'No extra images': '暂无额外图片',
    'No images yet': '暂无图片',
    'No sales yet': '暂无销量',
    'Product': '商品',
    'each': '每件',
    'Confirm Order': '确认订单',
    'Close': '关闭',

    'You can only review products after they have been delivered': '只有在商品送达后才能进行评价',

    // 输入占位/表单字段（登录/注册）
    'Full Name': '姓名',
    'Email Address': '邮箱地址',
    'Password': '密码',
    'Password (min 6 characters)': '密码（至少 6 位）',
    'Shipping Address': '收货地址',

    // 购物车 / 结算
    'Shopping Cart': '购物车',
    'Order Summary': '订单摘要',
    'Subtotal:': '小计：',
    'Subtotal': '小计',
    'Shipping:': '运费：',
    'Total:': '合计：',
    'Total': '合计',
    'Total Amount': '总金额',
    'Checkout': '结算',
    'Continue Shopping': '继续购物',
    'Your cart is empty': '你的购物车是空的',
    'Cart is empty': '购物车为空',
    'Added to cart successfully': '已加入购物车',
    'Insufficient stock': '库存不足',

    // 订单（用户）
    'My Orders': '我的订单',
    'All Status': '全部状态',
    'Pending': '待处理',
    'Processing': '处理中',
    'Shipped': '已发货',
    'Delivered': '已送达',
    'Cancelled': '已取消',
    'Order Items': '订单商品',
    'Order Summary': '订单摘要',
    'Order Number:': '订单号：',
    'Order #': '订单号',
    'Order Date:': '下单时间：',
    'Total Amount:': '总金额：',
    'Status:': '状态：',
    'Items Count:': '商品件数',
    'Request Cancellation': '申请取消',
    'Cancellation requested': '已申请取消',
    'Cancellation rejected': '取消被拒绝',
    'Cancellation approved': '取消已批准',
    'You have no orders yet': '你还没有订单',
    'Order placed successfully!': '下单成功！',
    'Shipping Address:': '收货地址：',
    'Shipping Information': '收货信息',
    'Status Timeline': '状态时间轴',
    'Customer:': '客户：',
    'Cancellation': '取消',
    'You can request cancellation while the order is Pending or Processing.': '仅在订单为待处理或处理中时可申请取消。',
    'Reason: Customer requested cancellation': '原因：客户申请取消',
    'Reason:': '原因：',
    'Reason': '原因',

    // 订单（管理员）
    'Admin Dashboard': '后台控制台',
    'Product Management': '商品管理',
    'Order Management': '订单管理',
    'Add Product': '新增商品',
    'Add New Product': '新增商品',
    'Edit Product': '编辑商品',
    'Save Product': '保存商品',
    'Product Name': '商品名称',
    'Price': '价格',
    'Image URL': '图片地址',
    'Description': '描述',
    'Category': '分类',
    'Stock Quantity': '库存数量',
    'Enable': '启用',
    'Disable': '禁用',
    'Enabled': '已启用',
    'Disabled': '已禁用',
    'No further action': '无可执行操作',
    'Approve Cancel': '批准取消',
    'Reject': '拒绝',
    'Advance to': '推进到',
    'Date': '日期',
    'Status': '状态',
    'Actions': '操作',
    'Advance to Processing': '推进到"处理中"',
    'Advance to Shipped': '推进到"已发货"',
    'Advance to Delivered': '推进到"已送达"',
    'Advance to Cancelled': '推进到"已取消"',

    // 商品管理 & 新增商品
    'Product description': '商品描述',
    'Product Images': '商品图片',
    'Existing Images': '已有图片',
    'Save the product first, then upload images.': '请先保存商品，再上传图片。',
    'Enter product name': '输入商品名称',
    'Cancel': '取消',
    'Edit': '编辑',
    'Cannot delete product because it exists in orders. Please disable it instead.': '由于产品已存在于订单中，因此无法删除。请改为禁用该产品。',

    // 搜索栏占位
    'Search products...': '搜索商品...',
    'Search products by name or ID...': '按名称或编号搜索商品...',

    // 提示 / 校验
    'Please fill all fields': '请填写所有字段',
    'Password must be at least 6 characters': '密码至少 6 位',
    'Email already registered': '邮箱已被注册',
    'Registration successful': '注册成功',
    'Login successful!': '登录成功',
    'Admin login successful!': '管理员登录成功',
    'Invalid credentials': '账号或密码错误',
    'Admin access required': '需要管理员权限',
    'Please login first': '请先登录',
    'Please login as customer': '请以客户身份登录',
    'Only customers can place orders': '只有客户可以下单',
    'Only customers can rate': '只有客户可以评分',
    'Only customers can review': '只有客户可以评价',
    'Only customers can request cancellation': '只有客户可以申请取消',
    'Product created successfully': '商品创建成功',
    'Product updated successfully': '商品更新成功',
    'Product deleted': '商品已删除',
    'Product disabled successfully': '商品已禁用',
    'Product enabled successfully': '商品已启用',
    'Failed to load products': '加载商品失败',
    'Failed to load orders': '加载订单失败',
    'Failed to load order details': '加载订单详情失败',
    'Failed to load reviews': '加载评价失败',
  };

  // 反向字典：中文 -> 英文
  const revDict = Object.fromEntries(
    Object.entries(dict).map(([en, zh]) => [zh, en])
  );

  // 正则翻译模式
  const patterns = [
    { re: /^Reason:\s*Customer requested cancellation\.?$/i, fn: () => '原因：客户申请取消' },
    { re: /^Reason\.?$/i, fn: () => '原因：' },
    { re: /^Customer requested cancellation\.?$/i, fn: () => '客户申请取消' },

    {
      re: /^Category:\s*(.+)$/i,
      fn: (_, cat) => {
        const key = cat.trim();
        return `分类：${dict[key] || key}`;
      }
    },

    { re: /^Stock\s*[:\-]?\s*(null|nil|none|n\/a|na|undefined|--|-)?$/i, fn: () => '库存：暂无' },
    { re: /^Stock\s*$/i, fn: () => '库存' },
    { re: /^STOCK\s*$/i, fn: () => '库存' },
    { re: /^Stock\s*[:\-]?\s*$/i, fn: () => '库存' },
    { re: /^Stock\s+([\d.,]+)$/i, fn: (_, n) => `库存 ${n}` },
    { re: /^STOCK\s+([\d.,]+)$/i, fn: (_, n) => `库存 ${n}` },
    { re: /^Stock\s*[:\-]?\s*([\d.,]+)$/i, fn: (_, n) => `库存：${n}` },
    { re: /^Stock\s*[\n\r]+\s*([\d.,]+)$/i, fn: (_, n) => `库存 ${n}` },
    { re: /^Stock[:\s]*([\d.,]+)\s+available/i, fn: (_, n) => `库存：${n} 件` },
    { re: /^Stock\s*\(([\d.,]+)\s+available\)/i, fn: (_, n) => `库存（${n} 件可用）` },
    { re: /^([\d.,]+)\s+available$/i, fn: (_, n) => `${n} 件可用` },
    { re: /^Stock:\s*Out of stock/i, fn: () => '库存：缺货' },
    { re: /^Stock[:\s]*([\d.,]+)\s+Low of stock/i, fn: (_, n) => `库存：仅剩 ${n} 件` },
    { re: /^Stock:?$/i, fn: () => '库存' },

    { re: /(\d+)\s+sold/i, fn: (_, n) => `${n} 件已售` },
    { re: /^Sold\s*[:\-]?\s*([\d.,]+)/i, fn: (_, n) => `${n} 件已售` },

    { re: /^Subtotal:\s*(.+)/i, fn: (_, v) => `小计：${v}` },
    { re: /^Shipping:\s*(.+)/i, fn: (_, v) => `运费：${v}` },
    { re: /^Total:\s*(.+)/i, fn: (_, v) => `合计：${v}` },

    { re: /^Order\s+#?([\w-]+)/i, fn: (_, id) => `订单 #${id}` },
    { re: /^Order\s*#\s*$/i, fn: () => '订单号' },
    { re: /^Page\s+(\d+)\s+of\s+(\d+)/i, fn: (_, a, b) => `第 ${a} 页 / 共 ${b} 页` },

    { re: /^Placed on (.+) at (.+)$/i, fn: (_, d, t) => `下单于 ${d} ${t}` },

    { re: /^Cancellation requested$/i, fn: () => '已申请取消' },
    { re: /^Cancellation rejected$/i, fn: () => '取消被拒绝' },
    { re: /^Cancellation approved$/i, fn: () => '取消已批准' },
    { re: /^Request Cancellation$/i, fn: () => '申请取消' },

    { re: /^View Details$/i, fn: () => '查看详情' },
    { re: /^Add to Cart$/i, fn: () => '加入购物车' },
    { re: /^View$/i, fn: () => '查看' },
    { re: /^No further action$/i, fn: () => '无可执行操作' },
    { re: /^Advance to (.+)$/i, fn: (_, s) => `推进到 ${s}` },

    { re: /^Order Items$/i, fn: () => '订单商品' },
    { re: /^Order Summary$/i, fn: () => '订单摘要' },
    { re: /^Shipping Information$/i, fn: () => '收货信息' },

    { re: /^(.*)\s+each$/i, fn: (_, p) => `${p} 每件` },

    { re: /^Your rating\s*:?$/i, fn: () => '你的评分' },
    { re: /^Your rating\s*[:\-]?\s*(.+)$/i, fn: (_, v) => `你的评分：${v}` },
    { re: /^Customer\s*:?$/i, fn: () => '客户' },
    { re: /^Customer\s*[:\-]?\s*(.+)$/i, fn: (_, v) => `客户：${v}` }
  ];

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  const shouldSkipTag = (tag) => ['script', 'style', 'noscript', 'textarea'].includes(tag);

  function isProductNameNode(node) {
    const el = node?.parentElement;
    if (!el) return false;
    const cls = typeof el.className === 'string' ? el.className : '';
    if (/(^|\s)product[-_\s]?name(\s|$)/i.test(cls)) return true;
    if (/(^|\s)product[-_\s]?title(\s|$)/i.test(cls)) return true;
    if (el.matches && el.matches('[data-product-name],[data-product-title],[data-role="product-name"],[data-role="product-title"]')) return true;
    return false;
  }

  const translateString = (str, toLang = 'zh') => {
    const trimmed = str.trim();
    if (!trimmed) return str;

    if (toLang === 'zh') {
      if (dict[trimmed]) return str.replace(trimmed, dict[trimmed]);
      for (const { re, fn } of patterns) {
        if (re.test(trimmed)) {
          const rep = trimmed.replace(re, fn);
          return str.replace(trimmed, rep);
        }
      }
      return str;
    }

    if (revDict[trimmed]) return str.replace(trimmed, revDict[trimmed]);
    return str;
  };

  function numberToChineseSpoken(numStr) {
    const clean = (numStr || '').replace(/,/g, '');
    if (!clean || isNaN(Number(clean))) return numStr;

    const digits = ['零','一','二','三','四','五','六','七','八','九'];
    const units = ['千','百','十',''];
    const bigUnits = ['','万','亿','兆'];

    function fourToChinese(num, allowOmitLeadingOneForTen = false) {
      if (num === 0) return '';
      let str = '';
      const parts = [
        Math.floor(num / 1000) % 10,
        Math.floor(num / 100) % 10,
        Math.floor(num / 10) % 10,
        num % 10
      ];
      for (let i = 0; i < 4; i++) {
        const d = parts[i];
        const unit = units[i];
        const hasLater = parts.slice(i + 1).some(x => x !== 0);
        if (d !== 0) {
          if (i === 2 && d === 1 && str === '' && allowOmitLeadingOneForTen) {
            str += '十';
          } else {
            str += digits[d] + unit;
          }
        } else if (hasLater && str && !str.endsWith('零')) {
          str += '零';
        }
      }
      while (str.endsWith('零')) str = str.slice(0, -1);
      return str;
    }

    const [intRaw, decRaw] = clean.split('.');
    let intNum = parseInt(intRaw, 10);
    let intStr = '';

    if (intNum === 0) {
      intStr = '零';
    } else {
      let sectionIdx = 0;
      let needGapZero = false;
      while (intNum > 0) {
        const section = intNum % 10000;
        const hasMore = Math.floor(intNum / 10000) > 0;
        if (section === 0) {
          if (intStr !== '') needGapZero = true;
        } else {
          const allowOmit = (sectionIdx === 0 && !hasMore);
          let sectionStr = fourToChinese(section, allowOmit) + bigUnits[sectionIdx];
          if (needGapZero) {
            sectionStr += '零';
            needGapZero = false;
          }
          intStr = sectionStr + intStr;
          if (section < 1000 && hasMore) needGapZero = true;
        }
        intNum = Math.floor(intNum / 10000);
        sectionIdx++;
      }
    }

    let decStr = '';
    if (decRaw && decRaw.length > 0) {
      decStr = '点' + decRaw.split('').map(ch => {
        const n = ch >= '0' && ch <= '9' ? parseInt(ch, 10) : null;
        return n === null ? ch : digits[n];
      }).join('');
    }

    return intStr + decStr;
  }

  const translateSpeechTextToZh = (text) => {
    if (!text) return text;
    let t = text;

    t = t.replace(/Price\s*\$([0-9][\d,]*(?:\.\d+)?)/gi, (_, num) => {
      const spoken = numberToChineseSpoken(num);
      return `价格 ${spoken} 美元。`;
    });

    t = t.replace(/(\d+(\.\d+)?)\s*stars?/gi, '$1 分。');
    t = t.replace(/(\d+(\.\d+)?)\s*star\b/gi, '$1 分。');

    t = t.replace(/Out of stock\.?/gi, '缺货。');
    t = t.replace(/Only\s+(\d+)\s+left in stock\.?/gi, '仅剩 $1 件。');
    t = t.replace(/(\d+)\s+in stock\.?/gi, '$1 件库存。');
    t = t.replace(/in stock\.?/gi, '有货。');

    t = t.replace(/([。\.])\s*\1+/g, '$1');

    return t;
  };

  function processTextNode(node, toLang) {
    const val = node.nodeValue;
    const parent = node.parentNode;
    if (!parent) return;
    const tag = parent.nodeName.toLowerCase();
    if (shouldSkipTag(tag)) return;
    if (!val || !val.trim()) return;

    if (toLang === 'zh' && isProductNameNode(node)) return;

    if (toLang === 'zh') {
      if (!originalText.has(node)) originalText.set(node, val);
      const translated = translateString(val, 'zh');
      if (translated !== val) node.nodeValue = translated;
    } else {
      if (originalText.has(node)) {
        node.nodeValue = originalText.get(node);
        originalText.delete(node);
      } else {
        const back = translateString(val, 'en');
        if (back !== val) node.nodeValue = back;
      }
    }
  }

  const attrList = ['placeholder', 'value', 'aria-label', 'title'];

  function processAttrs(el, toLang) {
    if (!el || !el.getAttribute) return;
    const store = originalAttrs.get(el) || {};
    if (toLang === 'zh') {
      attrList.forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const v = el.getAttribute(attr);
        if (v && v.trim()) {
          if (!(attr in store)) store[attr] = v;
          const tv = translateString(v, 'zh');
          if (tv !== v) el.setAttribute(attr, tv);
        }
      });
      if (Object.keys(store).length) originalAttrs.set(el, store);
    } else {
      if (originalAttrs.has(el)) {
        const saved = originalAttrs.get(el);
        Object.entries(saved).forEach(([attr, v]) => el.setAttribute(attr, v));
        originalAttrs.delete(el);
      } else {
        attrList.forEach((attr) => {
          if (!el.hasAttribute(attr)) return;
          const v = el.getAttribute(attr);
          if (v && v.trim()) {
            const tv = translateString(v, 'en');
            if (tv !== v) el.setAttribute(attr, tv);
          }
        });
      }
    }
  }

  function translateDOM(toLang) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (n) => {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = n.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.nodeName.toLowerCase();
          if (shouldSkipTag(tag)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while ((node = walker.nextNode())) {
      processTextNode(node, toLang);
    }
    document.querySelectorAll('input,textarea,select,button').forEach((el) => processAttrs(el, toLang));
    scheduleUGCTranslate(toLang);
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    updateToggleUI();
    translateDOM(lang);
    // 新增：廣播語言切換事件，供業務邏輯（如商品名稱多語切換）即時響應
    const evt = new CustomEvent('oss:lang-changed', { detail: { lang } });
    window.dispatchEvent(evt);
    document.dispatchEvent(evt);
  }

  function injectToggleUI() {
    const nav = document.querySelector('.navbar');
    if (!nav || document.getElementById('langSwitch')) return;

    const wrap = document.createElement('div');
    wrap.id = 'langSwitch';
    wrap.className = 'lang-switch';
    wrap.innerHTML = `
      <button type="button" data-lang="en">English</button>
      <button type="button" data-lang="zh">中文</button>
    `;
    nav.appendChild(wrap);

    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      setLang(lang);
    });
    updateToggleUI();
  }

  function updateToggleUI() {
    const wrap = document.getElementById('langSwitch');
    if (!wrap) return;
    wrap.querySelectorAll('button').forEach((btn) => {
      const isActive = btn.dataset.lang === currentLang;
      btn.classList.toggle('active', isActive);
    });
  }

  function injectStyle() {
    if (document.getElementById('langSwitchStyle')) return;
    const style = document.createElement('style');
    style.id = 'langSwitchStyle';
    style.textContent = `
      .lang-switch { display: flex; gap: 6px; align-items: center; margin-left: 8px; }
      .lang-switch button {
        padding: 6px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-weight: 600;
        color: #0f172a;
        transition: all 0.2s ease;
      }
      .lang-switch button:hover { border-color: #2563eb; color: #2563eb; }
      .lang-switch button.active {
        border-color: #2563eb;
        color: #2563eb;
        background: #eff6ff;
      }
    `;
    document.head.appendChild(style);
  }

  let mo;
  function startObserver() {
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => {
      if (currentLang === 'zh' || currentLang === 'en') queueMicrotask(() => translateDOM(currentLang));
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  const translatableSelectors = [
    '.product-description',
    '.product-detail-description',
    '.product-detail-description p',
    '.review-content',
    '.review-text',
    '.review-body',
    '.review-item .review-content',
    '.review-item .review-content p',
    '[data-review]'
  ];

  const translateCache = new Map();
  const chineseCharRe = /[\u4e00-\u9fff]/;

  const needsTranslation = (text) => {
    if (!text) return false;
    const t = text.trim();
    if (!t) return false;
    if (!/[A-Za-z]/.test(t)) return false;
    return true;
  };

  async function googleTranslateGeneric(text, target = 'zh-CN') {
    const key = `${target}::${text}`;
    if (translateCache.has(key)) return translateCache.get(key);
    const url = 'https://translate.googleapis.com/translate_a/single'
      + '?client=gtx&sl=auto&tl=' + encodeURIComponent(target) + '&dt=t&q='
      + encodeURIComponent(text);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('translate http ' + resp.status);
      const data = await resp.json();
      const translated = Array.isArray(data?.[0])
        ? data[0].map(part => part[0]).join('')
        : text;
      translateCache.set(key, translated);
      return translated || text;
    } catch (err) {
      translateCache.set(key, text);
      return text;
    }
  }

  async function googleTranslate(text) {
    return googleTranslateGeneric(text, 'zh-CN');
  }

  const ugcOriginal = new WeakMap();
  const ugcTranslated = new WeakMap();

  function shouldTranslateNode(node) {
    if (!node || !node.nodeValue) return false;
    const val = node.nodeValue.trim();
    if (!val) return false;
    if (isProductNameNode(node)) return false;
    return true;
  }

  async function translateUGCTextNode(node, toLang) {
    if (!shouldTranslateNode(node)) return;

    const orig = node.nodeValue;
    if (!ugcOriginal.has(node)) ugcOriginal.set(node, orig);

    const hasChinese = chineseCharRe.test(orig);
    const hasLatin = /[A-Za-z]/.test(orig);

    if (hasChinese && hasLatin) return;

    let record = ugcTranslated.get(node) || {};

    if (toLang === 'zh') {
        if (hasChinese || !hasLatin) {
          node.nodeValue = orig;
          return;
        }
        if (record.zh) {
          if (node.nodeValue !== record.zh) node.nodeValue = record.zh;
          return;
        }
        const t = await googleTranslateGeneric(orig, 'zh-CN');
        record.zh = t;
        ugcTranslated.set(node, record);
        node.nodeValue = t;
    } else if (toLang === 'en') {
        if (hasLatin || !hasChinese) {
          node.nodeValue = orig;
          return;
        }
        if (record.en) {
          if (node.nodeValue !== record.en) node.nodeValue = record.en;
          return;
        }
        const t = await googleTranslateGeneric(orig, 'en');
        record.en = t;
        ugcTranslated.set(node, record);
        node.nodeValue = t;
    }
  }

  async function translateElementTextNodes(el, toLang) {
    if (!el) return;
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (n) => {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const tasks = [];
    let n;
    while ((n = walker.nextNode())) {
      if (shouldTranslateNode(n)) {
        tasks.push(translateUGCTextNode(n, toLang));
      }
    }
    if (tasks.length) await Promise.all(tasks);
  }

  const gTranslateTimers = { zh: null, en: null };
  function scheduleUGCTranslate(toLang) {
    if (!['zh', 'en'].includes(toLang)) return;
    if (gTranslateTimers[toLang]) return;
    gTranslateTimers[toLang] = setTimeout(() => {
      gTranslateTimers[toLang] = null;
      runUGCTranslateForTargets(toLang);
    }, 60);
  }

  async function runUGCTranslateForTargets(toLang) {
    if (!['zh', 'en'].includes(toLang)) return;
    if (currentLang !== toLang) return;
    const seen = new Set();
    const nodes = [];
    translatableSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!seen.has(el)) {
          seen.add(el);
          nodes.push(el);
        }
      });
    });
    for (const el of nodes) {
      await translateElementTextNodes(el, toLang);
    }
  }

  function makeSpeakWrapper(origSpeak) {
    return async (text) => {
      const lang = currentLang || localStorage.getItem(LANG_KEY) || 'en';
      const synth = (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;

      if (lang === 'zh') {
        let original = text || '';
        let prefix = '';
        let rest = original;

        const m = original.match(/^([^\.!?]+[\.!?]?)([\s\S]*)$/);
        if (m) {
          prefix = m[1] || '';
          rest = m[2] || '';
        }

        let translatedRest = rest;
        try {
          translatedRest = rest ? await googleTranslate(rest) : rest;
        } catch (e) {
          translatedRest = rest;
        }

        const combined = `${prefix}${translatedRest}`;
        const zhText = translateSpeechTextToZh(combined);

        if (synth && typeof window.SpeechSynthesisUtterance !== 'undefined') {
          synth.cancel();
          const u = new SpeechSynthesisUtterance(zhText);
          u.lang = 'zh-CN';
          synth.speak(u);
          return;
        }
        if (origSpeak) return origSpeak(zhText);
        return;
      }

      if (synth && typeof window.SpeechSynthesisUtterance !== 'undefined') {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        synth.speak(u);
        return;
      }
      if (origSpeak) return origSpeak(text);
    };
  }

  function patchApp() {
    if (!window.app) return;
    if (window.app.__i18nPatched) return;
    window.app.__i18nPatched = true;

    const origToast = window.app.showToast?.bind(window.app);
    if (origToast) {
      window.app.showToast = (msg, isErr = false) => {
        const m = currentLang === 'zh' ? translateString(String(msg), 'zh') : translateString(String(msg), 'en');
        origToast(m, isErr);
      };
    }
    const origMsg = window.app.showMessage?.bind(window.app);
    if (origMsg) {
      window.app.showMessage = (msg, el, isErr = false) => {
        const m = currentLang === 'zh' ? translateString(String(msg), 'zh') : translateString(String(msg), 'en');
        origMsg(m, el, isErr);
      };
    }

    const origSpeak = window.app.speak?.bind(window.app);
    window.app.speak = makeSpeakWrapper(origSpeak);
  }

  function waitForApp() {
    if (window.app) {
      patchApp();
    } else {
      setTimeout(waitForApp, 150);
    }
  }

  function init() {
    injectStyle();
    injectToggleUI();
    startObserver();
    waitForApp();
    translateDOM(currentLang);
  }

  document.addEventListener('DOMContentLoaded', init);
})();