class OnlineShoppingSystem {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        this.isLoggedIn = !!this.token;
        this.isAdmin = this.currentUser?.type === 'admin';

        this.currentPage = 'home';
        this.currentProductId = null;
        this.currentOrderId = null;
        this.productsPerPage = 8;
        this.currentPageNum = 1;
        this.ordersFilterStatus = '';
        this.adminCurrentPage = 1;
        this.adminTotalPages = 1;
        this.detailContext = null;
        this._deleteLock = { locked: false };
        this._reviewClickHandler = null;

        this.sortValue = 'newest';

        this.bindEvents();
        this.ensureImageManager();
        this.ensureNameFields();
        this.bindLangListener();
        this.hideImageUrlField();
        this.checkLoginStatus();
        this.showPage('home');
    }

    getCurrentLang() {
        return localStorage.getItem('oss_lang') || 'en';
    }
    getDisplayName(entity = {}) {
        const lang = this.getCurrentLang();
        const nameEn = entity.name_en || entity.nameEn || entity.name;
        const nameZh = entity.name_zh || entity.nameZh;
        if (lang === 'zh') return nameZh || nameEn || entity.product_name || entity.name;
        return nameEn || nameZh || entity.product_name || entity.name;
    }

    bindLangListener() {
        const handler = (e) => this.onLangChange(e.detail?.lang || this.getCurrentLang());
        window.addEventListener('oss:lang-changed', handler);
        document.addEventListener('oss:lang-changed', handler);
    }

    onLangChange(lang) {
        this.updateProductImagesPickerTexts();
        
        switch (this.currentPage) {
            case 'home':
                this.loadProducts();
                break;
            case 'product':
                if (this.currentProductId) this.loadProductDetail();
                break;
            case 'cart':
                this.loadCart();
                break;
            case 'admin':
                this.loadAdminProducts();
                break;
            case 'orderDetail':
                if (this.currentOrderId) this.loadOrderDetail();
                break;
            default:
                break;
        }
    }

    ensureNameFields() {
        const nameInput = document.getElementById('productName');
        if (!nameInput) return;
        const grp = nameInput.closest('.form-group') || nameInput.parentElement;
        if (!grp) return;

        const label = grp.querySelector('label');
        if (label) label.textContent = 'Product Name (English)';
        nameInput.placeholder = 'Enter English product name';
        nameInput.id = 'productNameEn';

        if (document.getElementById('productNameZh')) return;

        const zhGroup = document.createElement('div');
        zhGroup.className = 'form-group';
        zhGroup.innerHTML = `
            <label>商品名稱 (中文)</label>
            <input type="text" id="productNameZh" placeholder="輸入中文商品名稱">
        `;
        grp.parentNode.insertBefore(zhGroup, grp.nextSibling);
    }

    bindReviewSortEvents() {
        console.log('bindReviewSortEvents called');
        const sortSelect = document.getElementById('reviewSortSelect');
        
        if (!sortSelect) {
            console.error('Review sort select not found');
            return;
        }
        
        console.log('Found sort select, current value:', sortSelect.value);
        
        const currentValue = sortSelect.value;
        console.log('Saving current value:', currentValue);
        
        const newSortSelect = sortSelect.cloneNode(true);
        sortSelect.parentNode.replaceChild(newSortSelect, sortSelect);
        
        newSortSelect.value = currentValue;
        console.log('Restored value to:', newSortSelect.value);
        
        newSortSelect.addEventListener('change', async (e) => {
            const sortBy = e.target.value;
            console.log('評論排序變更為:', sortBy);
            
            if (!this.currentProductId) {
                console.error('No current product ID');
                return;
            }
            
            await this.loadProductReviews(this.currentProductId, 1);
        });

        console.log('Sort select bound, final value:', newSortSelect.value);
    }

    speak(text) {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        window.speechSynthesis.speak(utter);
    }

    mapSortValue(raw) {
        const v = (raw || '').toLowerCase().trim();
        if (['price-low', 'price_low', 'priceasc', 'pricelow', 'lowtohigh', 'asc'].includes(v)) return 'price_asc';
        if (['price-high', 'price_high', 'pricedesc', 'pricehigh', 'hightolow', 'desc'].includes(v)) return 'price_desc';
        if (['rating-high', 'rating_high', 'ratingdesc', 'toprated'].includes(v)) return 'rating_desc';
        return 'newest';
    }

    hideImageUrlField() {
        const imgInput = document.getElementById('productImage');
        if (imgInput) {
            const grp = imgInput.closest('.form-group') || imgInput.parentElement;
            if (grp) grp.style.display = 'none';
        }
    }

    async makeRequest(endpoint, method = 'GET', data = null, requiresAuth = false) {
        const headers = {};

        if (requiresAuth) {
            if (!this.token) {
                this.showToast('Please login first', true);
                this.showPage('login');
                throw new Error('Please login first');
            }
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const isFormData = (data && typeof FormData !== 'undefined' && data instanceof FormData);
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            method,
            headers,
            credentials: 'same-origin'
        };

        if (data) {
            config.body = isFormData ? data : JSON.stringify(data);
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    showMessage(message, elementId, isError = false) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.color = isError ? 'var(--danger)' : 'var(--success)';
            element.style.display = 'block';

            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = isError ? 'toast error' : 'toast';
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    bindEvents() {
        document.getElementById('homeBtn').addEventListener('click', () => this.showPage('home'));
        document.getElementById('cartBtn').addEventListener('click', () => this.showPage('cart'));
        document.getElementById('ordersBtn').addEventListener('click', () => this.showPage('orders'));
        document.getElementById('adminBtn').addEventListener('click', () => this.showPage('admin'));
        document.getElementById('loginBtn').addEventListener('click', () => this.showPage('login'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        const backBtn = document.getElementById('backToHome');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = this.detailContext === 'cart' ? 'cart' : 'home';
                this.detailContext = null;
                this.showPage(target);
            });
        }
        document.getElementById('backToOrders').addEventListener('click', () => this.showPage('orders'));
        document.getElementById('continueShoppingBtn').addEventListener('click', () => this.showPage('home'));

        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('register');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('login');
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        document.getElementById('submitLogin').addEventListener('click', () => this.customerLogin());
        document.getElementById('submitAdminLogin').addEventListener('click', () => this.adminLogin());
        document.getElementById('submitRegister').addEventListener('click', () => this.register());

        document.getElementById('searchBtn').addEventListener('click', () => this.searchProducts());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchProducts();
        });

        const sortSelectEl = document.getElementById('sortSelect');
        if (sortSelectEl) {
            sortSelectEl.addEventListener('change', (e) => {
                this.sortValue = this.mapSortValue(e.target.value);
                this.currentPageNum = 1;
                this.loadProducts();
            });
        }

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.currentPageNum = 1;
            this.loadProducts();
        });

        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));

        document.getElementById('checkoutBtn').addEventListener('click', () => this.showCheckoutModal());
        document.getElementById('confirmOrderBtn').addEventListener('click', () => this.confirmOrder());
        document.getElementById('cancelCheckoutBtn').addEventListener('click', () => this.hideCheckoutModal());

        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAdminTab(tab);
            });
        });

        document.getElementById('addProductBtn').addEventListener('click', () => this.showProductForm());
        document.getElementById('saveProductBtn').addEventListener('click', () => this.saveProduct());
        document.getElementById('cancelProductBtn').addEventListener('click', () => this.hideProductForm());

        const adminSearchBtn = document.getElementById('adminSearchBtn');
        if (adminSearchBtn) {
            adminSearchBtn.addEventListener('click', () => {
                console.log('Admin search button clicked');
                this.loadAdminProducts();
            });
        }

        const adminSearch = document.getElementById('adminSearch');
        if (adminSearch) {
            adminSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Admin search enter pressed');
                    this.loadAdminProducts();
                }
            });
        }

        document.getElementById('orderStatusFilter').addEventListener('change', () => this.loadAdminOrders());

        document.getElementById('closeOrderDetailBtn').addEventListener('click', () => {
            document.getElementById('orderDetailModal').style.display = 'none';
        });

        document.getElementById('ordersStatusFilter')?.addEventListener('change', (e) => {
            this.ordersFilterStatus = e.target.value;
            this.loadOrders();
        });

        window.addEventListener('click', (e) => {
            const modals = ['checkoutModal', 'productFormModal', 'orderDetailModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    ensureImageManager() {
        const stockInput = document.getElementById('productStock');
        if (!stockInput) return;
        const stockGroup = stockInput.closest('.form-group') || stockInput.parentElement;
        if (!stockGroup) return;
        if (document.getElementById('productImagesSection')) return;

        const section = document.createElement('div');
        section.id = 'productImagesSection';
        section.innerHTML = `
            <div class="form-group">
                <label>Product Images</label>
                <div class="file-wrap" style="display:inline-flex;align-items:center;gap:12px;font-size:14px;">
                    <label class="file-btn btn btn-primary" for="productImagesInput" style="
                        padding:8px 14px;
                        border-radius:8px;
                        display:inline-flex;
                        align-items:center;
                        gap:8px;
                        cursor:pointer;
                        color:#fff;
                    ">Choose files</label>
                    <span id="productImagesFileName" class="file-name" style="color:#475569;min-width:160px;">No files chosen</span>
                    <input
                        type="file"
                        id="productImagesInput"
                        class="file-input"
                        multiple
                        accept="image/*"
                        style="
                            position:absolute;
                            width:1px;
                            height:1px;
                            padding:0;
                            margin:-1px;
                            overflow:hidden;
                            clip:rect(0,0,0,0);
                            white-space:nowrap;
                            border:0;
                        "
                    >
                </div>
            </div>
            <div class="form-group">
                <label>Existing Images</label>
                <div id="productImagesList" class="products-grid images-grid"></div>
            </div>
        `;
        stockGroup.parentNode.insertBefore(section, stockGroup.nextSibling);

        // 檔名顯示事件
        const input = section.querySelector('#productImagesInput');
        const fileNameEl = section.querySelector('#productImagesFileName');
        if (input && fileNameEl) {
            input.addEventListener('change', () => {
                if (input.files && input.files.length) {
                    const names = Array.from(input.files).map(f => f.name).join(', ');
                    fileNameEl.textContent = names;
                } else {
                    fileNameEl.textContent = 'No files chosen';
                }
            });
        }

        // 初始語系文字
        this.updateProductImagesPickerTexts();
    }

    // 依語系更新「選擇檔案」與「未選擇檔案」文字
    updateProductImagesPickerTexts() {
        const labelBtn = document.querySelector('#productImagesSection .file-btn');
        const fileNameEl = document.getElementById('productImagesFileName');
        const input = document.getElementById('productImagesInput');
        if (!labelBtn || !fileNameEl) return;
        const lang = this.getCurrentLang();
        const chooseText = lang === 'zh' ? '選擇檔案' : 'Choose files';
        const noneText = lang === 'zh' ? '未選擇檔案' : 'No files chosen';
        labelBtn.textContent = chooseText;
        if (!input || !input.files || input.files.length === 0) {
            fileNameEl.textContent = noneText;
        }
    }

    checkLoginStatus() {
        if (this.isLoggedIn) {
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    }

    updateUIForLoggedInUser() {
        document.getElementById('logoutBtn').style.display = 'inline-flex';
        document.getElementById('loginBtn').style.display = 'none';

        if (this.isAdmin) {
            document.getElementById('adminBtn').style.display = 'inline-flex';
            document.getElementById('cartBtn').style.display = 'none';
            document.getElementById('ordersBtn').style.display = 'none';
        } else {
            document.getElementById('cartBtn').style.display = 'inline-flex';
            document.getElementById('ordersBtn').style.display = 'inline-flex';
            document.getElementById('adminBtn').style.display = 'none';
            this.updateCartCount();
        }
    }

    updateUIForLoggedOutUser() {
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'inline-flex';
        document.getElementById('cartBtn').style.display = 'none';
        document.getElementById('ordersBtn').style.display = 'none';
        document.getElementById('adminBtn').style.display = 'none';
        document.getElementById('cartCount').textContent = '0';
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.token = null;
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.updateUIForLoggedOutUser();
        this.showPage('home');
        this.showToast('Logged out successfully');
    }

    async register() {
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const address = document.getElementById('regAddress').value;

        if (!name || !email || !password || !address) {
            this.showMessage('Please fill all fields', 'registerMessage', true);
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'registerMessage', true);
            return;
        }

        try {
            const data = await this.makeRequest('/auth/register', 'POST', {
                name, email, password, address
            });

            this.token = data.token;
            this.currentUser = data.user;
            this.isLoggedIn = true;
            this.isAdmin = data.user.type === 'admin';

            localStorage.setItem('token', this.token);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.showMessage('Registration successful!', 'registerMessage');
            this.updateUIForLoggedInUser();

            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regAddress').value = '';

            setTimeout(() => {
                this.showPage('home');
            }, 1500);

        } catch (error) {
            this.showMessage(error.message, 'registerMessage', true);
        }
    }

    async customerLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showMessage('Please fill all fields', 'loginMessage', true);
            return;
        }

        try {
            const data = await this.makeRequest('/auth/login', 'POST', {
                email, password, isAdmin: false
            });

            this.token = data.token;
            this.currentUser = data.user;
            this.isLoggedIn = true;
            this.isAdmin = data.user.type === 'admin';

            localStorage.setItem('token', this.token);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.updateUIForLoggedInUser();
            this.showMessage('Login successful!', 'loginMessage');

            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';

            setTimeout(() => {
                this.showPage('home');
            }, 1000);

        } catch (error) {
            this.showMessage(error.message, 'loginMessage', true);
        }
    }

    async adminLogin() {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        if (!username || !password) {
            this.showMessage('Please fill all fields', 'adminLoginMessage', true);
            return;
        }

        try {
            const data = await this.makeRequest('/auth/admin/login', 'POST', {
                email: username,
                password: password,
                isAdmin: true
            }, false);

            if (!data.success) {
                throw new Error(data.error || 'Login failed');
            }

            this.token = data.token;
            this.currentUser = data.user;
            this.isLoggedIn = true;
            this.isAdmin = true;

            localStorage.setItem('token', this.token);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.updateUIForLoggedInUser();
            this.showMessage('Admin login successful!', 'adminLoginMessage');

            document.getElementById('adminUsername').value = '';
            document.getElementById('adminPassword').value = '';

            setTimeout(() => {
                this.showPage('admin');
            }, 1000);

        } catch (error) {
            this.showMessage(error.message, 'adminLoginMessage', true);
        }
    }

    async loadProducts() {
        try {
            const sortSelectEl = document.getElementById('sortSelect');
            const categoryEl = document.getElementById('categoryFilter');
            const searchEl = document.getElementById('searchInput');

            let sortRaw = sortSelectEl?.value || this.sortValue || 'newest';
            const sort = this.mapSortValue(sortRaw);
            this.sortValue = sort;

            const category = categoryEl?.value || '';
            const search = (searchEl?.value || '').toLowerCase();

            const params = new URLSearchParams({
                page: this.currentPageNum,
                limit: this.productsPerPage,
                sort,
                category,
                search
            });

            const data = await this.makeRequest(`/products?${params}`);
            this.displayProducts(data.products);
            this.updatePagination(data.pagination);

        } catch (error) {
            const container = document.getElementById('productsContainer');
            container.innerHTML = '<div class="empty-state">Error loading products. Please try again.</div>';
            this.updatePagination(0);
        }
    }

    renderStars(score) {
        const avg = Number(score || 0);
        const filled = Math.round(avg);
        const max = 5;
        let stars = '';
        for (let i = 1; i <= max; i++) {
            stars += `<span style="color:${i <= filled ? '#f59e0b' : '#cbd5e1'};font-size:14px;">★</span>`;
        }
        return stars;
    }

    displayProducts(products) {
        const container = document.getElementById('productsContainer');

        if (!products || products.length === 0) {
            container.innerHTML = '<div class="empty-state">No products found</div>';
            return;
        }

        container.innerHTML = products.map(product => {
            const stockClass = product.stock > 10 ? 'stock-available' :
                product.stock > 0 ? 'stock-low' : 'stock-out';

            const stockLabel =
                product.stock > 10
                    ? `${product.stock} available`
                    : product.stock > 0
                        ? `${product.stock} Low of stock`
                        : 'Out of stock';

            const salesCount = product.sales_count || 0;
            const salesLabel = salesCount > 0 
                ? `${salesCount} sold` 
                : 'No sales yet';

            const cover = product.cover_url || product.image_url || 'https://via.placeholder.com/300x200?text=No+Image';
            const avg = Number(product.avg_rating || 0);
            const ratingCount = product.rating_count || 0;
            
            const displayName = this.getDisplayName(product);

            const ratingHtml = `
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                    <span>${this.renderStars(avg)}</span>
                    <span style="font-size:0.9rem;color:#475569;">${avg.toFixed(1)} (${ratingCount})</span>
                </div>
            `;

            return `
                <div class="product-card" data-name="${displayName}" data-rating="${avg.toFixed(1)}">
                    <img src="${cover}" alt="${displayName}" class="product-image" 
                        onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    <div class="product-info">
                        <div class="product-name">${displayName}</div>
                        <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                        ${ratingHtml}
                        <div class="product-category">${product.category}</div>
                        <p class="product-description">${product.description}</p>
                        
                        <div class="product-sales" style="color: #2563eb; font-size: 0.9rem; margin-bottom: 8px;">
                            <i class="fas fa-shopping-bag"></i> ${salesLabel}
                        </div>
                        
                        <div class="product-stock ${stockClass}">
                            Stock: ${stockLabel}
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-primary view-product" data-id="${product.id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-secondary add-to-cart" data-id="${product.id}" 
                                    ${!this.isLoggedIn || this.isAdmin || product.stock === 0 ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                        </div>
                        ${!this.isLoggedIn ?
                    '<div class="login-hint">Login to add to cart</div>' :
                    ''
                }
                        ${this.isAdmin ?
                    '<div class="login-hint">Admin cannot add to cart</div>' :
                    ''
                }
                        ${product.stock === 0 ?
                    '<div class="login-hint" style="color: var(--danger);">Out of stock</div>' :
                    ''
                }
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.view-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.view-product').dataset.id;
                this.viewProduct(productId);
            });
        });

        container.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.add-to-cart').dataset.id;
                this.addToCart(productId);
            });
        });

        container.querySelectorAll('.product-card').forEach(card => {
            const nameEl = card.querySelector('.product-name');
            const priceEl = card.querySelector('.product-price');
            const ratingEl = card.querySelector('.product-rating, .review-rating, .stars');
            const descEl = card.querySelector('.product-description');
            const stockEl = card.querySelector('.product-stock');
            
            if (nameEl) card.dataset.name = nameEl.textContent.trim();
            if (priceEl) card.dataset.price = priceEl.textContent.replace('$', '').trim();
            if (ratingEl) {
                const ratingText = ratingEl.textContent;
                const match = ratingText.match(/(\d+(\.\d+)?)/);
                if (match) card.dataset.rating = match[1];
            }
            if (descEl) card.dataset.description = descEl.textContent.trim();
            if (stockEl) {
                const stockText = stockEl.textContent;
                const match = stockText.match(/\d+/);
                if (match) card.dataset.stock = match[0];
            }

            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const name = card.dataset.name || 'Product';
                const rating = card.dataset.rating ? Number(card.dataset.rating).toFixed(1) : '0.0';
                const description = card.dataset.description || '';
                const stock = card.dataset.stock || '0';
                const price = card.dataset.price || '0';

                let text = `${name}. Price $${price}. ${rating}star. ${description}. `;

                if (parseInt(stock) === 0) {
                    text += 'Out of stock.';
                } else if (parseInt(stock) <= 10) {
                    text += `Only ${stock} left in stock.`;
                } else {
                    text += `${stock} in stock.`;
                }
                
                this.speak(text);
            });
        });
    }

    updatePagination(pagination) {
        if (!pagination) {
            document.getElementById('pageInfo').textContent = 'Page 1 of 1';
            document.getElementById('prevPage').disabled = true;
            document.getElementById('nextPage').disabled = true;
            return;
        }

        document.getElementById('pageInfo').textContent = `Page ${pagination.page} of ${pagination.pages}`;
        document.getElementById('prevPage').disabled = pagination.page <= 1;
        document.getElementById('nextPage').disabled = pagination.page >= pagination.pages;
    }

    changePage(delta) {
        this.currentPageNum += delta;
        this.loadProducts();
    }

    searchProducts() {
        this.currentPageNum = 1;
        this.loadProducts();
    }

    viewProduct(productId) {
        this.detailContext = null;
        this.currentProductId = productId;
        this.showPage('product');
        this.loadProductDetail();
    }

    viewProductFromCart(productId) {
        this.detailContext = 'cart';
        this.currentProductId = productId;
        this.showPage('product');
        this.loadProductDetail();
    }

    async loadProductDetail() {
        try {
            const data = await this.makeRequest(`/products/${this.currentProductId}`);
            const product = data.product;

            if (!product) {
                document.getElementById('productDetail').innerHTML = '<div class="error">Product not found</div>';
                return;
            }

            const images = product.images || [];
            const mainImage = (images.length ? images[0].url : null) || product.image_url;
            const stockClass = product.stock > 10 ? 'stock-available' :
                product.stock > 0 ? 'stock-low' : 'stock-out';

            const stockLabel =
                product.stock > 10
                    ? `${product.stock} available`
                    : product.stock > 0
                        ? `${product.stock} Low of stock`
                        : 'Out of stock';

            const thumbs = images.length
                ? images.map(img => `
                    <div class="thumb" data-src="${img.url}">
                        <img src="${img.url}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                    </div>
                `).join('')
                : '';

            const avg = Number(product.avg_rating || 0);
            const ratingCount = product.rating_count || 0;
            const ratingHtml = `
                <div style="display:flex;align-items:center;gap:8px;margin:8px 0 14px;">
                    <span>${this.renderStars(avg)}</span>
                    <span style="font-size:0.95rem;color:#475569;">${avg.toFixed(1)} (${ratingCount})</span>
                </div>
            `;

            const userRating = product.user_rating ? Number(product.user_rating) : 0;
            const displayName = this.getDisplayName(product);

            document.getElementById('productDetail').innerHTML = `
                <div class="product-detail-view">
                    <div class="product-detail-image">
                        <div class="gallery-main">
                            <img id="mainProductImage" src="${mainImage || 'https://via.placeholder.com/300x200?text=Product+Image'}" 
                                alt="${displayName}"
                                onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Product+Image'">
                        </div>
                        <div class="gallery-thumbs">
                            ${thumbs || '<div class="empty-state" style="padding:10px;">No extra images</div>'}
                        </div>
                    </div>
                    <div class="product-detail-info">
                        <h2>${displayName}</h2>
                        <div class="product-detail-price">$${parseFloat(product.price).toFixed(2)}</div>
                        ${ratingHtml}
                        <div class="product-detail-category">
                            <strong>Category:</strong> ${product.category}
                        </div>
                        <div class="product-detail-stock ${stockClass}">
                            <strong>Stock:</strong> ${stockLabel}
                        </div>

                        <div class="product-detail-description">
                            <h3>Description</h3>
                            <p>${product.description}</p>
                        </div>

                        <div class="detail-quantity-control">
                            <label for="detailQty">Quantity:</label>
                            <input type="number" id="detailQty" value="1" min="1" max="${product.stock}">
                        </div>

                        <button id="detailAddToCart" class="btn btn-primary btn-large" 
                                ${!this.isLoggedIn || this.isAdmin || product.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>

                        ${!this.isLoggedIn ?
                    '<div class="login-hint" style="margin-top: 15px;">Please login to add this item to your cart</div>' :
                    ''
                }

                        ${this.isLoggedIn && !this.isAdmin ? `
                        <div id="ratingBlock" style="margin-top:20px;">
                            <h3 style="margin-bottom:8px;">Rate this product</h3>
                            <div id="ratingStars" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                ${[1,2,3,4,5].map(v => `
                                    <button class="rate-btn" data-val="${v}" style="
                                        border:1px solid #e2e8f0;
                                        background:#fff;
                                        padding:6px 10px;
                                        border-radius:8px;
                                        cursor:pointer;
                                        display:flex;
                                        align-items:center;
                                        gap:6px;
                                        transition:all .2s;
                                    ">
                                        <span style="color:${v <= (userRating||0) ? '#f59e0b' : '#cbd5e1'};">★</span>
                                        <span>${v}</span>
                                    </button>
                                `).join('')}
                                <span id="userRatingLabel" style="color:#475569;font-size:0.95rem;">
                                    ${userRating ? `Your rating: ${userRating}` : 'Not rated yet'}
                                </span>
                            </div>
                        </div>
                        ` : ''}

                    </div>
                </div>
            `;
            
            const mainImgEl = document.getElementById('mainProductImage');
            document.querySelectorAll('.gallery-thumbs .thumb').forEach(t => {
                t.addEventListener('click', () => {
                    const src = t.dataset.src;
                    mainImgEl.src = src;
                });
            });

            document.getElementById('detailAddToCart').addEventListener('click', () => {
                const qty = parseInt(document.getElementById('detailQty').value);
                this.addToCart(this.currentProductId, qty);
            });

            this.updateDetailBackButton();

            if (this.isLoggedIn && !this.isAdmin && this.detailContext !== 'cart') {
                this.bindRatingEvents(userRating);
            }

            if (this.detailContext === 'cart') {
                this.applyDetailContextHiding();
            } else {
                const reviewsSection = document.getElementById('reviewsSection');
                if (reviewsSection) {
                    reviewsSection.style.display = 'block';
                }
                
                await this.loadProductReviews(this.currentProductId, 1);
                const sortSelect = document.getElementById('reviewSortSelect');
                if (sortSelect) {
                    sortSelect.value = 'newest';
                    console.log('Sort select initialized to:', sortSelect.value);
                }
                
                this.bindReviewSortEvents();
            }

        } catch (error) {
            document.getElementById('productDetail').innerHTML = '<div class="error">Error loading product details</div>';
        }
    }

    updateDetailBackButton() {
        const backBtn = document.getElementById('backToHome');
        if (!backBtn) return;
        const fromCart = this.detailContext === 'cart';
        backBtn.innerHTML = fromCart ? '<i class="fas fa-arrow-left"></i> Back to Cart' : '<i class="fas fa-arrow-left"></i> Back to Home';
    }

    applyDetailContextHiding() {
        const qtyCtrl = document.querySelector('.detail-quantity-control');
        if (qtyCtrl) qtyCtrl.style.display = 'none';
        const addBtn = document.getElementById('detailAddToCart');
        if (addBtn) addBtn.style.display = 'none';

        const ratingBlock = document.getElementById('ratingBlock');
        if (ratingBlock) ratingBlock.style.display = 'none';

        const reviewsSection = document.getElementById('reviewsSection');
        if (reviewsSection) reviewsSection.style.display = 'none';
    }

    async loadProductReviews(productId, page = 1) {
        try {
            const container = document.getElementById('reviewsContainer');
            if (!container) {
                console.error('Reviews container not found');
                return;
            }

            const sortSelect = document.getElementById('reviewSortSelect');
            const sortBy = sortSelect ? sortSelect.value : 'newest';
            
            console.log('Loading reviews with sort:', sortBy, 'page:', page);

            container.innerHTML = '<div class="empty-state">Loading reviews...</div>';

            const data = await this.makeRequest(
                `/products/${productId}/reviews?page=${page}&limit=10&sort=${sortBy}`, 
                'GET', 
                null, 
                false
            );
            
            console.log('Reviews loaded:', data);

            let canReviewData = { canReview: false, reason: '' };
            if (this.isLoggedIn && !this.isAdmin) {
                canReviewData = await this.checkCanReview(productId);
            }

            let reviewsHtml = '';

            if (this.isLoggedIn && !this.isAdmin) {
                if (canReviewData.canReview) {
                    reviewsHtml += this.renderReviewForm(productId, canReviewData.existingReview);
                } else {
                    const reason = canReviewData.reason || 'You cannot review this product at this time';
                    reviewsHtml += `
                        <div class="review-permission-message">
                            <i class="fas fa-info-circle"></i>
                            <span>${reason}</span>
                        </div>
                    `;
                }
            }

            if (data.reviews && data.reviews.length > 0) {
                reviewsHtml += '<div class="reviews-list">';
                data.reviews.forEach(review => {
                    reviewsHtml += this.renderReviewItem(review, productId);
                });
                reviewsHtml += '</div>';

                if (data.pages > 1) {
                    reviewsHtml += this.renderReviewsPagination(productId, data.page, data.pages);
                }
            } else {
                reviewsHtml += '<div class="empty-state">No reviews yet. Be the first to review!</div>';
            }

            container.innerHTML = reviewsHtml;
            
            container.dataset.eventsInitialized = 'false';
            
            this.bindReviewEvents(productId);
            
            this.bindReviewSortEvents();

        } catch (error) {
            console.error('Error loading reviews:', error);
            const container = document.getElementById('reviewsContainer');
            if (container) {
                container.innerHTML = '<div class="empty-state">Failed to load reviews</div>';
            }
        }
    }

    renderReviewForm(productId, existingReview = null) {
        const rating = existingReview ? existingReview.rating : 0;
        
        return `
            <div class="review-form" style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h4 style="margin-bottom: 15px;">${existingReview ? 'Edit Your Review' : 'Write a Review'}</h4>
                <div class="rating-input" id="reviewRating" style="display: flex; gap: 10px; margin-bottom: 15px;">
                    ${[1,2,3,4,5].map(v => `
                        <span class="rating-star" data-rating="${v}" style="font-size: 24px; cursor: pointer; color: ${v <= rating ? '#f59e0b' : '#cbd5e1'}">★</span>
                    `).join('')}
                </div>
                <input type="hidden" id="selectedRating" value="${rating}">
                <textarea id="reviewComment" placeholder="Share your thoughts about this product..." rows="4" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 6px;">${existingReview ? existingReview.comment : ''}</textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="submitReviewBtn" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> ${existingReview ? 'Update Review' : 'Submit Review'}
                    </button>
                </div>
            </div>
        `;
    }

    renderReviewItem(review, productId) {
        const canDelete = this.currentUser && this.currentUser.id === review.user_id;
        
        const userLikeType = review.user_like_type;
        const likeActive = userLikeType === 'like' ? 'active' : '';
        const dislikeActive = userLikeType === 'dislike' ? 'active' : '';
        
        return `
            <div class="review-item" data-review-id="${review.id}" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div class="review-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px; flex-wrap: wrap;">
                    <span class="review-user" style="font-weight: 600; color: #1e293b;">${review.user_name}</span>
                    <span class="review-rating" style="display: flex; gap: 2px;">${this.renderStars(review.rating)}</span>
                    <span class="review-date" style="color: #64748b; font-size: 0.9rem; margin-left: auto;">${new Date(review.created_at).toLocaleDateString()}</span>
                    ${canDelete ? `
                        <button class="btn btn-danger btn-small delete-review" data-review-id="${review.id}" style="padding: 5px 10px; font-size: 0.9rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="review-content" style="color: #4b5563; line-height: 1.6; margin-bottom: 10px;">
                    <p style="margin: 0;">${review.comment}</p>
                </div>
                <div class="review-actions" style="display: flex; gap: 15px; margin-top: 10px;">
                    <button class="btn-like ${likeActive}" data-review-id="${review.id}" data-type="like" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px; color: ${likeActive ? '#2563eb' : '#64748b'};">
                        <i class="fas fa-thumbs-up"></i> <span class="likes-count">${review.likes_count || 0}</span>
                    </button>
                    <button class="btn-dislike ${dislikeActive}" data-review-id="${review.id}" data-type="dislike" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px; color: ${dislikeActive ? '#ef4444' : '#64748b'};">
                        <i class="fas fa-thumbs-down"></i> <span class="dislikes-count">${review.dislikes_count || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderReviewsPagination(productId, currentPage, totalPages) {
        const sortSelect = document.getElementById('reviewSortSelect');
        const currentSort = sortSelect ? sortSelect.value : 'newest';

        return `
            <div class="reviews-pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                <button class="page-btn review-page-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
                    Previous
                </button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button class="page-btn review-page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
                    Next
                </button>
            </div>
        `;
    }

    bindReviewEvents(productId) {
        console.log('Binding review events for product:', productId);
        
        const reviewsContainer = document.getElementById('reviewsContainer');
        if (!reviewsContainer) {
            console.error('Reviews container not found');
            return;
        }
        
        if (reviewsContainer.dataset.eventsInitialized === 'true') {
            console.log('Events already initialized, skipping');
            return;
        }
        
        reviewsContainer.dataset.eventsInitialized = 'true';
        
        const ratingStars = document.querySelectorAll('#reviewRating .rating-star');
        ratingStars.forEach(star => {
            const newStar = star.cloneNode(true);
            star.parentNode.replaceChild(newStar, star);
            
            newStar.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                const hiddenInput = document.getElementById('selectedRating');
                if (hiddenInput) hiddenInput.value = rating;
                
                document.querySelectorAll('#reviewRating .rating-star').forEach(s => {
                    const r = parseInt(s.dataset.rating);
                    s.style.color = r <= rating ? '#f59e0b' : '#cbd5e1';
                });
            });
        });
        
        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            const newSubmitBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
            
            newSubmitBtn.addEventListener('click', async () => {
                const hiddenInput = document.getElementById('selectedRating');
                const rating = hiddenInput ? parseInt(hiddenInput.value) : 0;
                const comment = document.getElementById('reviewComment')?.value.trim();

                if (rating === 0) {
                    this.showToast('Please select a rating', true);
                    return;
                }

                if (!comment || comment.length < 5) {
                    this.showToast('Comment must be at least 5 characters', true);
                    return;
                }

                try {
                    await this.submitReview(productId, rating, comment);
                    await this.loadProductReviews(productId);
                } catch (error) {
                    console.error('Submit review error:', error);
                }
            });
        }
        
        if (this._reviewClickHandler) {
            reviewsContainer.removeEventListener('click', this._reviewClickHandler);
        }
        
        this._reviewClickHandler = async (e) => {
            const target = e.target;
            
            const likeBtn = target.closest('.btn-like');
            const dislikeBtn = target.closest('.btn-dislike');

            if (likeBtn || dislikeBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const btn = likeBtn || dislikeBtn;
                const reviewItem = btn.closest('.review-item');
                if (!reviewItem) return;
                
                const reviewId = btn.dataset.reviewId;
                const type = btn.dataset.type;
                
                console.log('Like/dislike clicked:', { reviewId, type, timestamp: Date.now() });
                
                if (!this.isLoggedIn) {
                    this.showToast('Please login first', true);
                    this.showPage('login');
                    return;
                }
                
                if (btn.classList.contains('processing')) {
                    console.log('Already processing');
                    return;
                }
                btn.classList.add('processing');
                
                try {
                    const response = await this.makeRequest(
                        `/products/${productId}/reviews/${reviewId}/like`,
                        'POST',
                        { type },
                        true
                    );
                    
                    if (response.success) {
                        requestAnimationFrame(() => {
                            const likesSpan = reviewItem.querySelector('.btn-like .likes-count');
                            const dislikesSpan = reviewItem.querySelector('.btn-dislike .dislikes-count');
                            
                            if (likesSpan) likesSpan.textContent = response.likes;
                            if (dislikesSpan) dislikesSpan.textContent = response.dislikes;
                            
                            const likeBtnEl = reviewItem.querySelector('.btn-like');
                            const dislikeBtnEl = reviewItem.querySelector('.btn-dislike');
                            
                            if (likeBtnEl) {
                                const userLiked = response.user_like_type === 'like';
                                likeBtnEl.classList.toggle('active', userLiked);
                                likeBtnEl.style.color = userLiked ? '#2563eb' : '#64748b';
                            }
                            
                            if (dislikeBtnEl) {
                                const userDisliked = response.user_like_type === 'dislike';
                                dislikeBtnEl.classList.toggle('active', userDisliked);
                                dislikeBtnEl.style.color = userDisliked ? '#ef4444' : '#64748b';
                            }
                        });
                    }
                } catch (error) {
                    this.showToast(error.message, true);
                } finally {
                    btn.classList.remove('processing');
                }
                return;
            }
            
            const deleteBtn = target.closest('.delete-review');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                if (this._deleteLock?.locked) {
                    console.log('Delete already in progress');
                    return;
                }
                
                const reviewId = deleteBtn.dataset.reviewId;
                
                await this.deleteReview(productId, reviewId);
                
                return;
            }
            
            const pageBtn = target.closest('.review-page-btn');
            if (pageBtn && !pageBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                const page = pageBtn.dataset.page;
                console.log('Review pagination click, page:', page);
                await this.loadProductReviews(productId, parseInt(page));
                return;
            }
            
            const reviewItem = target.closest('.review-item');
            if (reviewItem && !target.closest('button')) {
                const contentEl = reviewItem.querySelector('.review-content');
                if (!contentEl) return;
                
                const content = contentEl.textContent?.trim();
                if (!content) return;
                
                this.speak(content);
            }
        };
        
        reviewsContainer.addEventListener('click', this._reviewClickHandler);
        console.log('Review events bound successfully');
    }

    async checkCanReview(productId) {
        if (!this.isLoggedIn || this.isAdmin) return { canReview: false, reason: 'Only customers can review' };
        
        try {
            const data = await this.makeRequest(`/products/${productId}/reviews/can-review`, 'GET', null, true);
            return data;
        } catch (error) {
            console.error('Error checking review permission:', error);
            return { canReview: false, reason: 'Error checking permission' };
        }
    }

    async submitReview(productId, rating, comment) {
        try {
            const data = await this.makeRequest(`/products/${productId}/reviews`, 'POST', {
                rating,
                comment
            }, true);
            
            this.showToast('Review submitted successfully');
            return data;
        } catch (error) {
            this.showToast(error.message, true);
            throw error;
        }
    }

    async deleteReview(productId, reviewId) {
        if (this._deleteLock?.locked) {
            console.log('Delete already in progress');
            return false;
        }
        
        if (!this._deleteLock) {
            this._deleteLock = { locked: false };
        }
        
        this._deleteLock.locked = true;
        
        try {
            const userConfirmed = confirm('Are you sure you want to delete this review?');
            
            if (!userConfirmed) {
                console.log('User cancelled deletion');
                return false;
            }
            
            await this.makeRequest(`/products/${productId}/reviews/${reviewId}`, 'DELETE', null, true);
            
            this.showToast('Review deleted');
            
            await this.loadProductReviews(productId);
            
            return true;
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast(error.message, true);
            return false;
        } finally {
            setTimeout(() => {
                if (this._deleteLock) {
                    this._deleteLock.locked = false;
                }
                console.log('Delete lock released');
            }, 500);
        }
    }

    bindRatingEvents(currentUserRating = 0) {
        const buttons = document.querySelectorAll('#ratingStars .rate-btn');
        const label = document.getElementById('userRatingLabel');
        if (!buttons || !label) return;

        const highlight = (val) => {
            buttons.forEach(btn => {
                const v = parseInt(btn.dataset.val, 10);
                const star = btn.querySelector('span');
                star.style.color = v <= val ? '#f59e0b' : '#cbd5e1';
            });
            label.textContent = `Your rating: ${val}`;
        };

        highlight(currentUserRating || 0);

        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const val = parseInt(btn.dataset.val, 10);
                try {
                    const resp = await this.makeRequest(`/products/${this.currentProductId}/rating`, 'POST', { rating: val }, true);
                    const avg = Number(resp.avg_rating || 0);
                    const ratingCount = resp.rating_count || 0;
                    label.textContent = `Your rating: ${val}`;
                    highlight(val);

                    const ratingInfo = document.querySelector('.product-detail-info div:nth-of-type(3)');
                    if (ratingInfo) {
                        ratingInfo.innerHTML = `
                            <span>${this.renderStars(avg)}</span>
                            <span style="font-size:0.95rem;color:#475569;margin-left:8px;">${avg.toFixed(1)} (${ratingCount})</span>
                        `;
                    }
                    this.showToast('Rating submitted');
                } catch (err) {
                    this.showToast(err.message, true);
                }
            });
        });
    }

    async addToCart(productId, quantity = 1) {
        if (!this.isLoggedIn || this.isAdmin) {
            this.showToast('Please login as customer to add items to cart', true);
            this.showPage('login');
            return;
        }

        try {
            await this.makeRequest('/cart', 'POST', {
                productId, quantity
            }, true);

            this.showToast('Added to cart successfully');
            this.updateCartCount();

            if (this.currentPage === 'cart') {
                this.loadCart();
            }

        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    async updateCartCount() {
        if (!this.isLoggedIn || this.isAdmin) return;

        try {
            const data = await this.makeRequest('/cart/count', 'GET', null, true);
            document.getElementById('cartCount').textContent = data.count || 0;
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }

    async loadCart() {
        if (!this.isLoggedIn || this.isAdmin) {
            this.showPage('login');
            return;
        }

        try {
            const data = await this.makeRequest('/cart', 'GET', null, true);

            const container = document.getElementById('cartItems');

            if (!data.cart || data.cart.length === 0) {
                container.innerHTML = '<div class="empty-state">Your cart is empty</div>';
                document.getElementById('checkoutBtn').disabled = true;
                this.updateCartTotals(0);
                return;
            }

            document.getElementById('checkoutBtn').disabled = false;

            let subtotal = 0;
            container.innerHTML = data.cart.map(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const displayName = this.getDisplayName(item);

                return `
                    <div class="cart-item" data-id="${item.product_id}">
                        <img src="${item.image_url}" alt="${displayName}" class="cart-item-image"
                             onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'">
                        <div class="cart-item-details">
                            <div class="cart-item-name">${displayName}</div>
                            <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)} each</div>
                        </div>
                        <div class="cart-item-controls">
                            <div class="cart-quantity-control">
                                <button class="quantity-btn decrease" data-id="${item.product_id}">-</button>
                                <span>${item.quantity}</span>
                                <button class="quantity-btn increase" data-id="${item.product_id}">+</button>
                            </div>
                            <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
                            <button class="btn btn-danger remove-item" data-id="${item.product_id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            this.updateCartTotals(subtotal);

            container.querySelectorAll('.decrease').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const productId = e.target.closest('.decrease').dataset.id;
                    const item = data.cart.find(i => i.product_id == productId);
                    if (item && item.quantity > 1) {
                        await this.updateCartItem(productId, item.quantity - 1);
                    }
                });
            });

            container.querySelectorAll('.increase').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const productId = e.target.closest('.increase').dataset.id;
                    const item = data.cart.find(i => i.product_id == productId);
                    if (item) {
                        await this.updateCartItem(productId, item.quantity + 1);
                    }
                });
            });

            container.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const productId = e.target.closest('.remove-item').dataset.id;
                    if (confirm('Remove this item from cart?')) {
                        await this.removeCartItem(productId);
                    }
                });
            });

            container.querySelectorAll('.cart-item').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    const pid = card.dataset.id;
                    if (pid) this.viewProductFromCart(pid);
                });
            });

        } catch (error) {
            const container = document.getElementById('cartItems');
            container.innerHTML = '<div class="empty-state">Error loading cart. Please try again.</div>';
            document.getElementById('checkoutBtn').disabled = true;
            this.updateCartTotals(0);
        }
    }

    async updateCartItem(productId, quantity) {
        try {
            await this.makeRequest(`/cart/${productId}`, 'PUT', { quantity }, true);
            this.loadCart();
            this.updateCartCount();
        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    async removeCartItem(productId) {
        try {
            await this.makeRequest(`/cart/${productId}`, 'DELETE', null, true);
            this.showToast('Item removed from cart');
            this.loadCart();
            this.updateCartCount();
        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    updateCartTotals(subtotal) {
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('cartTotal').textContent = `$${subtotal.toFixed(2)}`;
    }

    showCheckoutModal() {
        if (!this.isLoggedIn || this.isAdmin) {
            this.showPage('login');
            return;
        }

        const container = document.getElementById('cartItems');
        const cartItems = Array.from(container.querySelectorAll('.cart-item'));

        if (cartItems.length === 0) {
            this.showToast('Cart is empty', true);
            return;
        }

        document.getElementById('checkoutAddress').textContent = this.currentUser.address;

        let total = 0;
        const itemsHTML = cartItems.map(cartItem => {
            const price = parseFloat(cartItem.querySelector('.cart-item-price').textContent.replace('$', '').replace(' each', ''));
            const quantity = parseInt(cartItem.querySelector('.cart-quantity-control span').textContent);
            const itemTotal = price * quantity;
            total += itemTotal;

            const name = cartItem.querySelector('.cart-item-name').textContent;
            return `<div class="checkout-item">${name} x ${quantity}: $${itemTotal.toFixed(2)}</div>`;
        }).join('');

        document.getElementById('checkoutItems').innerHTML = itemsHTML;
        document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;

        document.getElementById('checkoutModal').style.display = 'flex';
    }

    hideCheckoutModal() {
        document.getElementById('checkoutModal').style.display = 'none';
    }

    async confirmOrder() {
        try {
            await this.makeRequest('/orders', 'POST', {
                shippingAddress: this.currentUser.address
            }, true);

            this.hideCheckoutModal();
            this.showToast('Order placed successfully!');
            this.updateCartCount();
            this.showPage('orders');

        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    async loadOrders() {
        if (!this.isLoggedIn || this.isAdmin) {
            this.showPage('login');
            return;
        }

        try {
            const status = this.ordersFilterStatus;
            const params = status ? `?status=${encodeURIComponent(status)}` : '';
            const data = await this.makeRequest(`/orders${params}`, 'GET', null, true);

            if (!data.success) {
                throw new Error(data.error || 'Failed to load orders');
            }

            this.displayOrders(data.orders);

        } catch (error) {
            const container = document.getElementById('ordersList');
            container.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
            this.showToast('Failed to load orders: ' + error.message, true);
        }
    }

    canRequestCancel(order) {
        if (!order) return false;
        if (['shipped', 'delivered', 'cancelled'].includes(order.status)) return false;
        if (order.cancel_request_status === 'requested') return false;
        return true;
    }

    cancelBadge(order) {
        const s = order.cancel_request_status || 'none';
        if (s === 'requested') return '<span class="order-status status-processing" style="background:#fef08a;color:#854d0e;">Cancellation requested</span>';
        if (s === 'approved') return '<span class="order-status status-cancelled">Cancelled</span>';
        if (s === 'rejected') return '<span class="order-status" style="background:#fee2e2;color:#991b1b;">Cancellation rejected</span>';
        return '';
    }

    async requestOrderCancellation(orderId) {
        if (!confirm('Submit a cancellation request for this order?')) return;
        try {
            await this.makeRequest(`/orders/${orderId}/cancel-request`, 'PUT', {
                reason: 'Customer requested cancellation'
            }, true);
            this.showToast('Cancellation request submitted');
            if (this.currentPage === 'orders') {
                this.loadOrders();
            } else if (this.currentPage === 'orderDetail' && this.currentOrderId === orderId) {
                this.loadOrderDetail();
            }
        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    displayOrders(orders) {
        const container = document.getElementById('ordersList');

        if (!orders) {
            container.innerHTML = '<div class="empty-state">No order data</div>';
            return;
        }

        if (!Array.isArray(orders)) {
            container.innerHTML = '<div class="empty-state">Invalid order data format</div>';
            return;
        }

        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state">You have no orders yet</div>';
            return;
        }

        container.innerHTML = orders.map(order => {
            const totalAmount = parseFloat(order.total_amount) || 0;
            const purchaseDate = order.created_at ? new Date(order.created_at) : new Date();
            const formattedDate = purchaseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const cancelBtn = this.canRequestCancel(order)
                ? `<button class="btn btn-danger request-cancel" data-id="${order.id}">
                        <i class="fas fa-ban"></i> Request Cancellation
                   </button>`
                : '';

            return `
                <div class="order-card" data-id="${order.id}">
                    <div class="order-header">
                        <div class="order-number">Order #${order.order_number || 'Unknown'}</div>
                        <div class="order-date">${formattedDate}</div>
                    </div>
                    <div class="order-details-grid">
                        <div class="order-detail-item">
                            <span class="detail-label">Order Number:</span>
                            <span class="detail-value">${order.order_number || 'Unknown'}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="detail-label">Order Date:</span>
                            <span class="detail-value">${formattedDate}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="detail-label">Total Amount:</span>
                            <span class="detail-value total-amount">$${totalAmount.toFixed(2)}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="order-status status-${order.status || 'pending'}">${this.formatOrderStatus(order.status)}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="detail-label">Items Count:</span>
                            <span class="detail-value">${order.item_count || 0}</span>
                        </div>
                        <div class="order-detail-item">
                            ${this.cancelBadge(order)}
                        </div>
                    </div>
                    <div class="order-action" style="gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-primary view-order-detail" data-id="${order.id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${cancelBtn}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.view-order-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.target.closest('.view-order-detail').dataset.id;
                this.viewOrderDetail(orderId);
            });
        });

        container.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.view-order-detail') && !e.target.closest('.request-cancel')) {
                    const orderId = card.dataset.id;
                    this.viewOrderDetail(orderId);
                }
            });
        });

        container.querySelectorAll('.request-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = e.target.closest('.request-cancel').dataset.id;
                this.requestOrderCancellation(orderId);
            });
        });
    }

    viewOrderDetail(orderId) {
        this.currentOrderId = orderId;
        this.showPage('orderDetail');
        this.loadOrderDetail();
    }

    async loadOrderDetail() {
        try {
            const data = await this.makeRequest(`/orders/${this.currentOrderId}`, 'GET', null, true);

            if (!data.success) {
                throw new Error(data.error || 'Failed to load order details');
            }

            const order = data.order;

            if (!order) {
                document.getElementById('orderDetailContainer').innerHTML = '<div class="error">Order not found</div>';
                return;
            }

            this.displayOrderDetail(order);

        } catch (error) {
            document.getElementById('orderDetailContainer').innerHTML =
                `<div class="error">Error loading order details: ${error.message}</div>`;
            this.showToast('Failed to load order details: ' + error.message, true);
        }
    }

    formatDateTime(value) {
        if (!value) return '-';
        const d = new Date(value);
        return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderStatusTimeline(statusDates) {
        const steps = [
            { key: 'pending_at', label: 'Pending' },
            { key: 'processing_at', label: 'Processing' },
            { key: 'shipped_at', label: 'Shipped' },
            { key: 'delivered_at', label: 'Delivered' },
            { key: 'cancelled_at', label: 'Cancelled' }
        ];

        return `
            <div class="order-items-section">
                <h3><i class="fas a-clock"></i> Status Timeline</h3>
                <div class="order-items-list" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap:12px;">
                    ${steps.map(s => `
                        <div class="order-item-row" style="display:flex; flex-direction:column; gap:6px; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                            <div class="order-item-name">${s.label}</div>
                            <div class="order-item-price" style="color:#475569;">${this.formatDateTime(statusDates?.[s.key])}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderCancelSection(order) {
        const s = order.cancel_request_status || 'none';
        if (s === 'none') {
            if (this.canRequestCancel(order) && !this.isAdmin) {
                return `
                    <div class="order-items-section" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                        <h3><i class="fas fa-ban"></i> Cancellation</h3>
                        <p>You can request cancellation while the order is Pending or Processing.</p>
                        <button class="btn btn-danger" id="detailRequestCancelBtn">Request Cancellation</button>
                    </div>
                `;
            }
            return '';
        }

        const map = {
            requested: { text: 'Cancellation requested', color: '#fef08a', textColor: '#854d0e' },
            approved: { text: 'Cancelled', color: '#fee2e2', textColor: '#991b1b' },
            rejected: { text: 'Cancellation rejected', color: '#fee2e2', textColor: '#991b1b' }
        };
        const info = map[s] || map.requested;

        return `
            <div class="order-items-section" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <h3><i class="fas fa-ban"></i> Cancellation</h3>
                <div class="order-status" style="background:${info.color}; color:${info.textColor};">${info.text}</div>
                ${order.cancel_request_reason ? `<p style="margin-top:8px;"><strong>Reason:</strong> ${order.cancel_request_reason}</p>` : ''}
                ${order.cancel_request_at ? `<p><strong>Requested at:</strong> ${this.formatDateTime(order.cancel_request_at)}</p>` : ''}
                ${order.cancel_response_at ? `<p><strong>Responded at:</strong> ${this.formatDateTime(order.cancel_response_at)}</p>` : ''}
            </div>
        `;
    }

    displayOrderDetail(order) {
        const purchaseDate = new Date(order.created_at);
        const formattedDate = purchaseDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const itemsHTML = order.items && order.items.length > 0
            ? order.items.map(item => {
                const itemTotal = item.product_price * item.quantity;
                const displayName = this.getDisplayName(item);
                return `
                    <div class="order-item-row">
                        <div class="order-item-info">
                            <div class="order-item-name">${displayName}</div>
                            <div class="order-item-price">$${parseFloat(item.product_price).toFixed(2)} each</div>
                        </div>
                        <div class="order-item-quantity"> ${item.quantity}</div>
                        <div class="order-item-total">$${itemTotal.toFixed(2)}</div>
                    </div>
                `;
            }).join('')
            : '<div class="empty-state">No items in this order</div>';

        const statusTimeline = this.renderStatusTimeline(order.status_dates);
        const cancelSection = this.renderCancelSection(order);

        document.getElementById('orderDetailContainer').innerHTML = `
            <div class="order-detail-card">
                <div class="order-detail-header">
                    <h2>Order #${order.order_number}</h2>
                    <div class="order-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Placed on ${formattedDate}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-user"></i>
                            <span>Customer: ${order.customer_name}</span>
                        </div>
                        <div class="order-status-large status-${order.status}">
                            ${this.formatOrderStatus(order.status)}
                        </div>
                    </div>
                </div>

                ${cancelSection}

                ${statusTimeline}

                <div class="order-items-section">
                    <h3><i class="fas fa-box"></i> Order Items</h3>
                    <div class="order-items-header">
                        <div class="header-item">Product</div>
                        <div class="header-item">Quantity</div>
                        <div class="header-item">Total</div>
                    </div>
                    <div class="order-items-list">
                        ${itemsHTML}
                    </div>
                </div>

                <div class="order-summary">
                    <h3><i class="fas fa-receipt"></i> Order Summary</h3>
                    <div class="summary-row">
                        <span>Subtotal</span>
                        <span>$${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                    <div class="summary-row">

                    </div>
                    <div class="summary-row">

                    </div>
                    <div class="summary-row total-row">
                        <span><strong>Total Amount</strong></span>
                        <span><strong>$${parseFloat(order.total_amount).toFixed(2)}</strong></span>
                    </div>
                </div>

                <div class="shipping-info">
                    <h3><i class="fas fa-map-marker-alt"></i> Shipping Information</h3>
                    <div class="shipping-address">
                        <p><strong>Shipping Address:</strong></p>
                        <p>${order.shipping_address || 'No address provided'}</p>
                    </div>
                </div>
            </div>
        `;

        const btn = document.getElementById('detailRequestCancelBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.requestOrderCancellation(order.id);
            });
        }
    }

    formatOrderStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status || 'Unknown';
    }

    switchAdminTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(`${tab}Admin`).classList.add('active');
        document.querySelector(`.admin-tabs .tab-btn[data-tab="${tab}"]`).classList.add('active');

        if (tab === 'products') {
            if (this.token) {
                this.loadAdminProducts();
            } else {
                this.showPage('login');
            }
        } else if (tab === 'orders') {
            if (this.token) {
                this.loadAdminOrders();
            } else {
                this.showPage('login');
            }
        }
    }

    async loadAdminProducts() {
        if (!this.isAdmin) {
            this.showPage('login');
            return;
        }

        try {
            if (!this.token) {
                this.showPage('login');
                return;
            }

            const searchTerm = document.getElementById('adminSearch')?.value.trim() || '';
            console.log('Admin search term:', searchTerm);
            console.log('Admin page:', this.adminCurrentPage);

            let url = `/products?page=${this.adminCurrentPage}&limit=20`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            
            console.log('Admin request URL:', url);
            const data = await this.makeRequest(url, 'GET', null, true);

            if (!data || !data.success) {
                throw new Error(data?.error || 'Failed to load products');
            }

            if (!data.products) {
                const container = document.getElementById('adminProducts');
                container.innerHTML = '<div class="empty-state">No products found</div>';
                return;
            }

            console.log(`Loaded ${data.products.length} products`);
            
            this.adminTotalPages = data.pagination?.pages || 1;
            
            this.displayAdminProducts(data.products);
            this.updateAdminPagination();

        } catch (error) {
            console.error('Error loading admin products:', error);
            const container = document.getElementById('adminProducts');
            container.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
            this.showToast('Failed to load products: ' + error.message, true);
        }
    }

    updateAdminPagination() {
        let paginationContainer = document.getElementById('adminPagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'adminPagination';
            paginationContainer.className = 'pagination';
            paginationContainer.innerHTML = `
                <button id="adminPrevPage" class="page-btn">Previous</button>
                <span id="adminPageInfo">Page 1</span>
                <button id="adminNextPage" class="page-btn">Next</button>
            `;
            
            const adminProducts = document.getElementById('adminProducts');
            adminProducts.parentNode.insertBefore(paginationContainer, adminProducts.nextSibling);
        }

        const pageInfo = document.getElementById('adminPageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.adminCurrentPage} of ${this.adminTotalPages}`;
        }

        const prevBtn = document.getElementById('adminPrevPage');
        const nextBtn = document.getElementById('adminNextPage');
        
        if (prevBtn) {
            prevBtn.disabled = this.adminCurrentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.adminCurrentPage >= this.adminTotalPages;
        }

        this.bindAdminPaginationEvents();
    }

    bindAdminPaginationEvents() {
        const prevBtn = document.getElementById('adminPrevPage');
        const nextBtn = document.getElementById('adminNextPage');

        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
            
            newPrevBtn.addEventListener('click', () => {
                if (this.adminCurrentPage > 1) {
                    this.adminCurrentPage--;
                    this.loadAdminProducts();
                }
            });
        }

        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
            
            newNextBtn.addEventListener('click', () => {
                if (this.adminCurrentPage < this.adminTotalPages) {
                    this.adminCurrentPage++;
                    this.loadAdminProducts();
                }
            });
        }
    }

    displayAdminProducts(products) {
        const container = document.getElementById('adminProducts');

        if (!products || products.length === 0) {
            container.innerHTML = '<div class="empty-state">No products found</div>';
            return;
        }

        container.innerHTML = products.map(product => {
            const stockClass = product.stock > 10 ? 'stock-available' :
                product.stock > 0 ? 'stock-low' : 'stock-out';

            const cover = product.cover_url || product.image_url || 'https://via.placeholder.com/80x80?text=No+Image';
            const isEnabled = product.enabled === 1 || product.enabled === true;
            const enabledClass = isEnabled ? 'enabled-true' : 'enabled-false';
            const enabledText = isEnabled ? 'Enabled' : 'Disabled';
            const toggleButtonClass = isEnabled ? 'btn-warning' : 'btn-success';
            const toggleButtonIcon = isEnabled ? 'fa-eye-slash' : 'fa-eye';
            const toggleButtonText = isEnabled ? 'Disable' : 'Enable';

            const salesCount = product.sales_count || 0;

            const displayName = this.getDisplayName(product);
            const showNames = `
                <div class="admin-product-name">${displayName}</div>
                <div style="font-size:0.85rem;color:#64748b;">
                    EN: ${product.name_en || product.name || '-'}<br>
                    中文: ${product.name_zh || '-'}
                </div>
            `;

            const idBadge = `
                <div class="admin-product-id-badge" style="
                    position:absolute;
                    top:8px;
                    right:10px;
                    background:#e2e8f0;
                    color:#0f172a;
                    padding:4px 8px;
                    border-radius:999px;
                    font-size:12px;
                    font-weight:600;
                    letter-spacing:0.2px;
                ">ID: ${product.id}</div>
            `;

            return `
                <div class="admin-product-card" data-product-id="${product.id}" data-enabled="${isEnabled}" style="position: relative;">
                    ${idBadge}
                    <div class="admin-product-header">
                        <img src="${cover}" 
                            alt="${displayName}" 
                            class="admin-product-image"
                            onerror="this.onerror=null; this.src='https://via.placeholder.com/80x80?text=No+Image'">
                        <div class="admin-product-info">
                            ${showNames}
                            <div class="admin-product-price">$${parseFloat(product.price).toFixed(2)}</div>
                            <div class="admin-product-category">${product.category || 'Uncategorized'}</div>
                            
                            <div class="admin-product-sales">
                                <i class="fas fa-shopping-bag"></i> ${salesCount} sold
                            </div>
                            
                            <div class="admin-product-stock ${stockClass}">
                                Stock: ${product.stock}
                            </div>
                            <div class="product-enabled ${enabledClass}">
                                ${enabledText}
                            </div>
                        </div>
                    </div>
                    <div class="product-actions-admin">
                        <button class="btn btn-primary edit-product" data-id="${product.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn ${toggleButtonClass} toggle-product" data-id="${product.id}">
                            <i class="fas ${toggleButtonIcon}"></i> ${toggleButtonText}
                        </button>
                        <button class="btn btn-danger delete-product" data-id="${product.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.renderAdminPagination();
        this.bindAdminEvents();
    }

    renderAdminPagination() {
        const paginationContainer = document.getElementById('adminPagination');
        if (!paginationContainer) {
            const adminProductsContainer = document.getElementById('adminProducts');
            const paginationDiv = document.createElement('div');
            paginationDiv.id = 'adminPagination';
            paginationDiv.className = 'pagination';
            paginationDiv.innerHTML = `
                <button id="adminPrevPage" class="page-btn">Previous</button>
                <span id="adminPageInfo">Page 1</span>
                <button id="adminNextPage" class="page-btn">Next</button>
            `;
            adminProductsContainer.parentNode.insertBefore(paginationDiv, adminProductsContainer.nextSibling);
        }

        document.getElementById('adminPrevPage')?.addEventListener('click', () => {
            if (this.adminCurrentPage > 1) {
                this.adminCurrentPage--;
                this.loadAdminProducts();
            }
        });

        document.getElementById('adminNextPage')?.addEventListener('click', () => {
            this.adminCurrentPage++;
            this.loadAdminProducts();
        });
    }

    bindAdminEvents() {
        const container = document.getElementById('adminProducts');
        if (!container) return;

        container.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = e.target.closest('.edit-product').dataset.id;
                this.editProduct(productId);
            });
        });

        container.querySelectorAll('.toggle-product').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = e.target.closest('.toggle-product').dataset.id;
                const productCard = e.target.closest('.admin-product-card');
                const enabledBadge = productCard.querySelector('.product-enabled');
                const toggleBtn = productCard.querySelector('.toggle-product');

                const isCurrentlyEnabled = enabledBadge.classList.contains('enabled-true');
                const newEnabledState = !isCurrentlyEnabled;

                enabledBadge.className = `product-enabled ${newEnabledState ? 'enabled-true' : 'enabled-false'}`;
                enabledBadge.textContent = newEnabledState ? 'Enabled' : 'Disabled';
                toggleBtn.className = `btn ${newEnabledState ? 'btn-warning' : 'btn-success'} toggle-product`;
                toggleBtn.innerHTML = `<i class="fas ${newEnabledState ? 'fa-eye-slash' : 'fa-eye'}"></i> ${newEnabledState ? 'Disable' : 'Enable'}`;

                try {
                    const response = await this.makeRequest(`/products/${productId}/toggle`, 'PUT', null, true);

                    if (response.success) {
                        this.showToast(`Product ${newEnabledState ? 'disabled' : 'enabled'} successfully`);
                    } else {
                        throw new Error(response.error || 'Failed to toggle product');
                    }

                } catch (error) {
                    enabledBadge.className = `product-enabled ${isCurrentlyEnabled ? 'enabled-true' : 'enabled-false'}`;
                    enabledBadge.textContent = isCurrentlyEnabled ? 'Enabled' : 'Disabled';
                    toggleBtn.className = `btn ${isCurrentlyEnabled ? 'btn-warning' : 'btn-success'} toggle-product`;
                    toggleBtn.innerHTML = `<i class="fas ${isCurrentlyEnabled ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isCurrentlyEnabled ? 'Disable' : 'Enable'}`;

                    this.showToast(error.message, true);
                }
            });
        });

        container.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = e.target.closest('.delete-product').dataset.id;
                const lang = this.getCurrentLang();
                const msg = lang === 'zh'
                    ? '您确定要删除此产品吗？'
                    : 'Are you sure you want to delete this product?';
                if (confirm(msg)) {
                    try {
                        await this.makeRequest(`/products/${productId}`, 'DELETE', null, true);
                        await this.loadAdminProducts();
                        this.showToast('Product deleted');
                    } catch (error) {
                        this.showToast(error.message, true);
                    }
                }
            });
        });
    }

    searchAdminProducts() {
        console.log('Searching admin products...');
        this.loadAdminProducts();
    }

    showProductForm(productId = null) {
        this.currentProductId = productId;
        const formTitle = productId ? 'Edit Product' : 'Add New Product';
        document.getElementById('formTitle').textContent = formTitle;

        const nameEnInput = document.getElementById('productNameEn');
        const nameZhInput = document.getElementById('productNameZh');

        if (productId) {
            const container = document.getElementById('adminProducts');
            const productCard = container.querySelector(`[data-id="${productId}"],[data-product-id="${productId}"]`);
            if (productCard) {
                const price = productCard.querySelector('.admin-product-price')?.textContent || '$0';
                const category = productCard.querySelector('.admin-product-category')?.textContent || '';
                const stock = productCard.querySelector('.admin-product-stock')?.textContent.replace('Stock: ', '') || '';

                if (nameEnInput) nameEnInput.value = productCard.querySelector('.admin-product-info')?.textContent || '';
                if (nameZhInput) nameZhInput.value = '';

                document.getElementById('productPrice').value = price.replace('$', '');
                document.getElementById('productCategory').value = category;
                document.getElementById('productStock').value = stock;
                document.getElementById('productDescription').value = '';
            }
            this.renderProductImagesList([], productId);
        } else {
            if (nameEnInput) nameEnInput.value = '';
            if (nameZhInput) nameZhInput.value = '';
            ['productPrice', 'productDescription', 'productStock'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('productCategory').value = 'Doraemon';
            this.renderProductImagesList([], null);
        }

        document.getElementById('productFormModal').style.display = 'flex';
    }

    hideProductForm() {
        document.getElementById('productFormModal').style.display = 'none';
    }

    async saveProduct() {
        if (!this.isAdmin) {
            this.showToast('Admin access required', true);
            return;
        }

        const nameEn = document.getElementById('productNameEn').value.trim();
        const nameZh = document.getElementById('productNameZh').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const description = document.getElementById('productDescription').value;
        const category = document.getElementById('productCategory').value;
        const stock = parseInt(document.getElementById('productStock').value);

        if ((!nameEn && !nameZh) || !price || !description || !category || stock < 0) {
            this.showToast('Please fill all fields correctly', true);
            return;
        }

        try {
            const productData = {
                name: nameEn || nameZh,
                name_en: nameEn || null,
                name_zh: nameZh || null,
                price,
                description,
                category,
                stock
            };

            let productId = this.currentProductId;
            if (this.currentProductId) {
                await this.makeRequest(`/products/${this.currentProductId}`, 'PUT', productData, true);
                this.showToast('Product updated successfully');
                productId = this.currentProductId;
            } else {
                const res = await this.makeRequest('/products', 'POST', productData, true);
                this.showToast('Product created successfully');
                productId = res?.product?.id;
                this.currentProductId = productId;
            }

            await this.uploadProductImages(productId);

            this.hideProductForm();
            this.loadAdminProducts();

        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    async uploadProductImages(productId) {
        const input = document.getElementById('productImagesInput');
        if (!input || !input.files || input.files.length === 0) return;
        if (!productId) return;

        const formData = new FormData();
        Array.from(input.files).forEach(file => formData.append('images', file));

        const resp = await fetch(`${this.baseURL}/products/${productId}/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Upload failed');
        }
        const data = await resp.json();
        this.renderProductImagesList(data.images || [], productId);
        this.showToast('Images uploaded');
        input.value = '';
    }

    async deleteProductImage(productId, imageId) {
        try {
            await this.makeRequest(`/products/${productId}/images/${imageId}`, 'DELETE', null, true);
            const refreshed = await this.makeRequest(`/products/${productId}`, 'GET', null, true);
            this.renderProductImagesList(refreshed.product?.images || [], productId);
            this.showToast('Image deleted');
        } catch (e) {
            this.showToast(e.message, true);
        }
    }

    renderProductImagesList(images = [], productId = null) {
        const list = document.getElementById('productImagesList');
        if (!list) return;

        if (!productId) {
            list.innerHTML = '<div class="empty-state" style="padding:12px;">Save the product first, then upload images.</div>';
            return;
        }

        if (!images || images.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:12px;">No images yet</div>';
            return;
        }

        list.innerHTML = images.map(img => `
            <div class="image-tile">
                <img src="${img.url}" alt="img" onerror="this.src='https://via.placeholder.com/150x120?text=No+Image'">
                <button class="btn btn-danger btn-small delete-image" data-img-id="${img.id}" data-pid="${productId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        list.querySelectorAll('.delete-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pid = btn.dataset.pid;
                const iid = btn.dataset.imgId;
                this.deleteProductImage(pid, iid);
            });
        });
    }

    async editProduct(productId) {
        try {
            const data = await this.makeRequest(`/products/${productId}`, 'GET', null, true);
            const product = data.product;

            if (product) {
                document.getElementById('productNameEn').value = product.name_en || product.name || '';
                document.getElementById('productNameZh').value = product.name_zh || '';
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productDescription').value = product.description;
                document.getElementById('productCategory').value = product.category;
                document.getElementById('productStock').value = product.stock;

                this.currentProductId = productId;
                document.getElementById('formTitle').textContent = 'Edit Product';
                this.renderProductImagesList(product.images || [], productId);
                document.getElementById('productFormModal').style.display = 'flex';
            }
        } catch (error) {
            this.showToast('Error loading product details', true);
        }
    }

    getNextStatus(current) {
        const map = {
            pending: 'processing',
            processing: 'shipped',
            shipped: 'delivered',
            delivered: null,
            cancelled: null
        };
        return map[current] || null;
    }

    async loadAdminOrders() {
        if (!this.isAdmin) {
            this.showPage('login');
            return;
        }

        try {
            const statusFilter = document.getElementById('orderStatusFilter').value;
            const params = new URLSearchParams();
            if (statusFilter) {
                params.append('status', statusFilter);
            }

            const data = await this.makeRequest(`/orders?${params}`, 'GET', null, true);
            this.displayAdminOrders(data.orders);

        } catch (error) {
            const container = document.getElementById('adminOrders');
            container.innerHTML = '<div class="empty-state">Error loading orders. Please try again.</div>';
        }
    }

    displayAdminOrders(orders) {
        const container = document.getElementById('adminOrders');

        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders found</div>';
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <div>Order #</div>
                <div>Customer</div>
                <div>Date</div>
                <div>Total</div>
                <div>Status</div>
                <div>Actions</div>
            </div>
        ` + orders.map(order => {
            const purchaseDate = new Date(order.created_at);
            const formattedDate = purchaseDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const nextStatus = this.getNextStatus(order.status);
            const hasCancelReq = order.cancel_request_status === 'requested';

            const statusBadge = `<span class="order-status status-${order.status}">${this.formatOrderStatus(order.status)}</span>`;
            const cancelInfo = hasCancelReq
                ? `<div style="margin-top:4px;"><span class="order-status" style="background:#fef08a;color:#854d0e;">Cancellation requested</span></div>`
                : '';

            const actionButtons = hasCancelReq
                ? `
                    <button class="btn btn-danger approve-cancel" data-id="${order.id}">
                        <i class="fas fa-check"></i> Approve Cancel
                    </button>
                    <button class="btn btn-secondary reject-cancel" data-id="${order.id}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                  `
                : (nextStatus
                    ? `<button class="btn btn-primary advance-status" data-id="${order.id}" data-next="${nextStatus}">
                            Advance to ${this.formatOrderStatus(nextStatus)}
                       </button>`
                    : `<span style="color:var(--secondary);">No further action</span>`);

            return `
                <div class="table-row" data-id="${order.id}">
                    <div>${order.order_number}</div>
                    <div>${order.customer_name}</div>
                    <div>${formattedDate}</div>
                    <div>$${parseFloat(order.total_amount).toFixed(2)}</div>
                    <div>
                        ${statusBadge}
                        ${cancelInfo}
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-primary view-admin-order" data-id="${order.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.advance-status').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.target.closest('.advance-status').dataset.id;
                const next = e.target.closest('.advance-status').dataset.next;
                await this.updateOrderStatus(orderId, next);
            });
        });

        container.querySelectorAll('.approve-cancel').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.target.closest('.approve-cancel').dataset.id;
                await this.handleCancelDecision(orderId, true);
            });
        });

        container.querySelectorAll('.reject-cancel').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.target.closest('.reject-cancel').dataset.id;
                await this.handleCancelDecision(orderId, false);
            });
        });

        container.querySelectorAll('.view-admin-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.closest('.view-admin-order').dataset.id;
                this.showAdminOrderDetail(orderId);
            });
        });

        container.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.advance-status') &&
                    !e.target.closest('.approve-cancel') &&
                    !e.target.closest('.reject-cancel') &&
                    !e.target.closest('.view-admin-order')) {
                    const orderId = e.currentTarget.dataset.id;
                    this.showAdminOrderDetail(orderId);
                }
            });
        });
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            await this.makeRequest(`/orders/${orderId}/status`, 'PUT', { status: newStatus }, true);
            this.showToast('Status updated');
            this.loadAdminOrders();
        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    async handleCancelDecision(orderId, approve) {
        try {
            await this.makeRequest(`/orders/${orderId}/status`, 'PUT', {
                action: approve ? 'approve_cancel' : 'reject_cancel'
            }, true);
            this.showToast(approve ? 'Cancellation approved' : 'Cancellation rejected');
            this.loadAdminOrders();
        } catch (error) {
            this.showToast(error.message, true);
        }
    }

    async showAdminOrderDetail(orderId) {
        try {
            const data = await this.makeRequest(`/orders/${orderId}`, 'GET', null, true);
            const order = data.order;

            if (!order) {
                this.showToast('Order not found', true);
                return;
            }

            const purchaseDate = new Date(order.created_at);
            const formattedDate = purchaseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const itemsHTML = order.items.map(item => {
                const itemTotal = item.product_price * item.quantity;
                const displayName = this.getDisplayName(item);
                return `
                    <div class="checkout-item">
                        ${displayName} x ${item.quantity}: $${itemTotal.toFixed(2)}
                    </div>
                `;
            }).join('');

            const statusTimeline = this.renderStatusTimeline(order.status_dates);

            const cancelAction = order.cancel_request_status === 'requested'
                ? `
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                        <button class="btn btn-danger" id="adminApproveCancel"><i class="fas fa-check"></i> Approve Cancel</button>
                        <button class="btn btn-secondary" id="adminRejectCancel"><i class="fas fa-times"></i> Reject</button>
                    </div>
                  `
                : '';

            document.getElementById('adminOrderDetail').innerHTML = `
                <h2>Order #${order.order_number}</h2>
                <div class="order-info">
                    <p><strong>Customer:</strong> ${order.customer_name}</p>
                    <p><strong>Order Date:</strong> ${formattedDate}</p>
                    <p><strong>Shipping Address:</strong> ${order.shipping_address}</p>
                    <p><strong>Status:</strong> <span class="order-status status-${order.status}">${this.formatOrderStatus(order.status)}</span></p>
                    ${order.cancel_request_status === 'requested' ? `<p><strong>Cancel Request:</strong> ${order.cancel_request_reason || ''}</p>` : ''}
                </div>
                ${statusTimeline}
                <div class="order-items" style="margin: 15px 0;">
                    <h3>Order Items</h3>
                    ${itemsHTML}
                </div>
                <div class="total-row">
                    <strong>Total Amount:</strong>
                    <strong>$${parseFloat(order.total_amount).toFixed(2)}</strong>
                </div>
                ${cancelAction}
            `;

            const modal = document.getElementById('orderDetailModal');
            modal.style.display = 'flex';

            if (order.cancel_request_status === 'requested') {
                document.getElementById('adminApproveCancel').addEventListener('click', async () => {
                    await this.handleCancelDecision(order.id, true);
                    modal.style.display = 'none';
                });
                document.getElementById('adminRejectCancel').addEventListener('click', async () => {
                    await this.handleCancelDecision(order.id, false);
                    modal.style.display = 'none';
                });
            }

        } catch (error) {
            this.showToast('Error loading order details', true);
        }
    }

    switchTab(tab) {
        if (this.currentPage === 'login') {
            document.querySelectorAll('#loginPage .auth-form').forEach(form => form.classList.remove('active'));
            document.querySelectorAll('#loginPage .tab-btn').forEach(btn => btn.classList.remove('active'));

            document.getElementById(`${tab}LoginForm`).classList.add('active');
            document.querySelector(`#loginPage .tab-btn[data-tab="${tab}"]`).classList.add('active');
        }
    }

    showPage(page) {
        if ((page === 'cart' || page === 'orders' || page === 'orderDetail') && (!this.isLoggedIn || this.isAdmin)) {
            this.showToast('Please login as customer', true);
            page = 'login';
        }

        if (page === 'admin' && (!this.isLoggedIn || !this.isAdmin)) {
            this.showToast('Admin access required', true);
            page = 'login';
        }

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        document.getElementById(`${page}Page`).classList.add('active');
        this.currentPage = page;

        switch (page) {
            case 'home':
                this.currentPageNum = 1;
                this.loadProducts();
                break;
            case 'cart':
                this.loadCart();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'orderDetail':
                if (this.currentOrderId) {
                    this.loadOrderDetail();
                }
                break;
            case 'admin':
                if (this.token) {
                    this.loadAdminProducts();
                } else {
                    this.showPage('login');
                }
                break;
            case 'product':
                if (this.currentProductId) {
                    this.loadProductDetail();
                }
                break;
            case 'login':
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
                document.getElementById('adminUsername').value = '';
                document.getElementById('adminPassword').value = '';
                break;
            case 'register':
                document.getElementById('regName').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regAddress').value = '';
                break;
        }
    }
}

function selectRating(rating) {
    const stars = document.querySelectorAll('#reviewRating .rating-star');
    const hiddenInput = document.getElementById('selectedRating');
    if (hiddenInput) hiddenInput.value = rating;
    
    stars.forEach(star => {
        const r = parseInt(star.dataset.rating);
        if (r <= rating) {
            star.style.color = '#f59e0b';
        } else {
            star.style.color = '#cbd5e1';
        }
    });
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new OnlineShoppingSystem();
    window.app = app;
    console.log('Shopping system initialized and attached to window.app');
});